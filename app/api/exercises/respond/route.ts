import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getExercise,
  isAnnotationExercise,
  isMatchingExercise,
  isQuizExercise,
  isRankingExercise,
  isReflectionExercise,
  isScenarioExercise,
  isWordCloudExercise,
  type AnnotationConfig,
  type AnnotationRegion,
  type AnnotationResponseShape,
  type MatchingResponseShape,
  type QuizResponseShape,
  type RankingResponseShape,
  type ReflectionResponseShape,
  type ScenarioResponseShape,
  type WordCloudConfig,
  type WordCloudResponseShape,
} from '@/lib/exercises'
import { analyzeSentiment } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const trainingId = String(body.trainingId || body.training_id || '').trim()
    const exerciseId = String(body.exerciseId || body.exercise_id || '').trim()
    const participantId = String(body.participantId || body.participant_id || '').trim()
    const rawResponse = body.response

    if (!trainingId || !exerciseId || !participantId) {
      return NextResponse.json(
        { error: 'Missing trainingId, exerciseId or participantId' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const [{ data: training }, { data: participant }, { data: linkRow }] = await Promise.all([
      supabase
        .from('trainings')
        .select('id, status, workspace_id')
        .eq('id', trainingId)
        .maybeSingle(),
      supabase
        .from('participants')
        .select('id, training_id')
        .eq('id', participantId)
        .maybeSingle(),
      supabase
        .from('training_exercises')
        .select('id')
        .eq('training_id', trainingId)
        .eq('exercise_id', exerciseId)
        .maybeSingle(),
    ])

    if (!training || training.status !== 'live') {
      return NextResponse.json({ error: 'Training is not accepting responses' }, { status: 400 })
    }
    if (!participant || participant.training_id !== trainingId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }
    if (!linkRow) {
      return NextResponse.json({ error: 'Exercise is not part of this training' }, { status: 404 })
    }

    const exercise = await getExercise(exerciseId)
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }
    // Defence-in-depth: even with the training_exercises link verified above,
    // confirm the exercise belongs to the same workspace as the training. A
    // mis-linked admin row could otherwise let a participant submit against
    // an exercise definition from a different workspace.
    if (exercise.workspace_id !== training.workspace_id) {
      return NextResponse.json({ error: 'Exercise not in this workspace' }, { status: 403 })
    }

    // Type-specific processing
    let responsePayload: Record<string, unknown> = {}
    let score: number | null = null

    if (isMatchingExercise(exercise)) {
      const cast = rawResponse as MatchingResponseShape
      if (!cast || typeof cast !== 'object' || !cast.placements) {
        return NextResponse.json({ error: 'Invalid matching response' }, { status: 400 })
      }
      responsePayload = {
        placements: cast.placements,
        firstAttempts: cast.firstAttempts ?? {},
        attempts: cast.attempts ?? {},
      }
      // Correctness for matching is enforced by the player (it only lets the
      // user submit when every milestone is correctly placed).
      const total = exercise.config.milestones.length
      score = total > 0 ? total : null
    } else if (isQuizExercise(exercise)) {
      const cast = rawResponse as QuizResponseShape
      if (!cast || typeof cast !== 'object' || !cast.answers) {
        return NextResponse.json({ error: 'Invalid quiz response' }, { status: 400 })
      }
      let correct = 0
      for (const q of exercise.config.questions) {
        if (cast.answers[q.id] === q.correctIndex) correct++
      }
      responsePayload = { answers: cast.answers }
      score = correct
    } else if (isReflectionExercise(exercise)) {
      const cast = rawResponse as ReflectionResponseShape
      const text = String(cast?.text || '').trim()
      if (text.length < (exercise.config.minLength ?? 0)) {
        return NextResponse.json({ error: 'Reflection is too short' }, { status: 400 })
      }
      let aiAnalysis: ReflectionResponseShape['aiAnalysis'] = null
      if (exercise.config.aiAnalysis) {
        try {
          const result = await analyzeSentiment(exercise.config.prompt, [text])
          aiAnalysis = {
            sentiment: result.sentiment,
            summary: result.summary,
            themes: result.themes,
          }
        } catch (e) {
          console.warn('reflection AI analysis failed; storing response without it', e)
        }
      }
      responsePayload = { text, aiAnalysis }
    } else if (isWordCloudExercise(exercise)) {
      // Word Cloud has its own existing-row policy: when allowMultiple is
      // on, additional submissions append to the participant's words array
      // up to maxWordsPerParticipant. Return early so we don't hit the
      // generic 409-on-duplicate path below.
      return await handleWordCloudSubmission(
        supabase,
        exercise.config,
        trainingId,
        exerciseId,
        participantId,
        rawResponse as WordCloudResponseShape,
      )
    } else if (isRankingExercise(exercise)) {
      const cast = rawResponse as RankingResponseShape
      const ranked = Array.isArray(cast?.rankedOrder) ? cast.rankedOrder : []
      const itemIds = new Set(exercise.config.items.map((i) => i.id))
      const cleanRanked = ranked.filter(
        (id): id is string => typeof id === 'string' && itemIds.has(id),
      )
      if (cleanRanked.length === 0) {
        return NextResponse.json({ error: 'Invalid ranking response' }, { status: 400 })
      }
      responsePayload = { rankedOrder: cleanRanked }
      if (exercise.config.correctOrder && exercise.config.correctOrder.length > 0) {
        // Exact-position match count — simple, easy to explain to trainers.
        let correct = 0
        for (let i = 0; i < exercise.config.correctOrder.length; i++) {
          if (cleanRanked[i] === exercise.config.correctOrder[i]) correct++
        }
        score = correct
      }
    } else if (isAnnotationExercise(exercise)) {
      const cast = rawResponse as AnnotationResponseShape
      const taps = Array.isArray(cast?.taps) ? cast.taps : []
      // Recompute hit detection server-side — never trust the client's claim
      // about which region was hit.
      const sanitized: AnnotationResponseShape['taps'] = []
      for (const t of taps) {
        const x = clampUnit(t?.x)
        const y = clampUnit(t?.y)
        if (x === null || y === null) continue
        const hitRegionId = detectHit(exercise.config.regions, x, y)
        sanitized.push({ x, y, hitRegionId })
      }
      if (sanitized.length === 0) {
        return NextResponse.json({ error: 'No taps recorded' }, { status: 400 })
      }
      responsePayload = { taps: sanitized }
      score = scoreAnnotation(exercise.config, sanitized)
    } else if (isScenarioExercise(exercise)) {
      const cast = rawResponse as ScenarioResponseShape
      const path = Array.isArray(cast?.path)
        ? cast.path.filter((v): v is string => typeof v === 'string')
        : []
      const choices = Array.isArray(cast?.choices)
        ? cast.choices.filter(
            (c): c is ScenarioResponseShape['choices'][number] =>
              !!c &&
              typeof c.nodeId === 'string' &&
              typeof c.choiceIndex === 'number' &&
              typeof c.choiceLabel === 'string',
          )
        : []
      const finalOutcome =
        cast?.finalOutcome === 'positive' ||
        cast?.finalOutcome === 'neutral' ||
        cast?.finalOutcome === 'negative'
          ? cast.finalOutcome
          : null
      if (path.length === 0) {
        return NextResponse.json({ error: 'Empty scenario path' }, { status: 400 })
      }
      responsePayload = { path, choices, finalOutcome }
      // Score: positive=1, neutral=0.5, negative=0. Useful for filtering.
      score =
        finalOutcome === 'positive'
          ? 1
          : finalOutcome === 'neutral'
          ? 0.5
          : finalOutcome === 'negative'
          ? 0
          : null
    } else {
      return NextResponse.json(
        { error: `Exercise type "${exercise.type}" is not playable yet` },
        { status: 400 },
      )
    }

    // Upsert (default policy: block duplicates with 409). To allow retries
    // later, switch to .upsert(...) — keeping the block for now matches spec.
    const { data: existing } = await supabase
      .from('exercise_responses')
      .select('id')
      .eq('exercise_id', exerciseId)
      .eq('participant_id', participantId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: 'already_responded', message: 'You have already completed this exercise.' },
        { status: 409 },
      )
    }

    const { error: insertErr } = await supabase.from('exercise_responses').insert({
      training_id: trainingId,
      exercise_id: exerciseId,
      participant_id: participantId,
      response: responsePayload,
      score,
    })
    if (insertErr) {
      // Unique violation on (exercise_id, participant_id) means a concurrent
      // submission landed between our select-check above and this insert.
      // Surface as 409 so the player UI can show "already submitted" rather
      // than a generic 500.
      const code = (insertErr as { code?: string }).code
      if (code === '23505') {
        return NextResponse.json(
          { error: 'already_responded', message: 'You have already completed this exercise.' },
          { status: 409 },
        )
      }
      console.error('exercise_responses insert', insertErr)
      return NextResponse.json({ error: 'Could not save response' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, score })
  } catch (e: unknown) {
    console.error('exercises/respond error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------
// Word Cloud submission — special-cases the unique-per-participant rule
// so multi-word participants can submit incrementally up to the
// per-participant cap.
// ---------------------------------------------------------------------
async function handleWordCloudSubmission(
  supabase: ReturnType<typeof createAdminClient>,
  config: WordCloudConfig,
  trainingId: string,
  exerciseId: string,
  participantId: string,
  body: WordCloudResponseShape,
): Promise<NextResponse> {
  const rawWords = Array.isArray(body?.words) ? body.words : []
  const cleaned = normalizeWords(rawWords, config)
  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid words to record.' }, { status: 400 })
  }

  const allowMultiple = !!config.allowMultiple
  const max = allowMultiple
    ? Math.max(1, Math.min(10, Number(config.maxWordsPerParticipant) || 3))
    : 1

  const { data: existing } = await supabase
    .from('exercise_responses')
    .select('id, response')
    .eq('exercise_id', exerciseId)
    .eq('participant_id', participantId)
    .maybeSingle()

  if (existing) {
    if (!allowMultiple) {
      return NextResponse.json(
        {
          error: 'already_responded',
          message: 'You have already submitted a word.',
        },
        { status: 409 },
      )
    }
    const prior =
      ((existing.response as WordCloudResponseShape | null)?.words ?? []).filter(
        (w) => typeof w === 'string',
      )
    if (prior.length >= max) {
      return NextResponse.json(
        {
          error: 'max_words',
          message: `You've already submitted ${max} word${max === 1 ? '' : 's'} — that's the limit.`,
          words: prior,
          maxWords: max,
        },
        { status: 409 },
      )
    }
    // Append, dedupe, respect cap
    const merged: string[] = [...prior]
    for (const w of cleaned) {
      if (merged.length >= max) break
      if (!merged.includes(w)) merged.push(w)
    }
    const { error } = await supabase
      .from('exercise_responses')
      .update({
        response: { words: merged },
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) {
      console.error('word_cloud append', error)
      return NextResponse.json({ error: 'Could not save response' }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      words: merged,
      maxWords: max,
      atLimit: merged.length >= max,
    })
  }

  // First submission for this participant
  const initial = cleaned.slice(0, max)
  const { error } = await supabase.from('exercise_responses').insert({
    training_id: trainingId,
    exercise_id: exerciseId,
    participant_id: participantId,
    response: { words: initial },
    score: null,
  })
  if (error) {
    console.error('word_cloud insert', error)
    return NextResponse.json({ error: 'Could not save response' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    words: initial,
    maxWords: max,
    atLimit: initial.length >= max,
  })
}

// ---------------------------------------------------------------------
// Word Cloud — trim + length-cap + (optional) lowercase + stop-word filter.
// Dedupes within a single submission so "joy joy joy" doesn't game the cloud.
// ---------------------------------------------------------------------
function normalizeWords(input: string[], config: WordCloudConfig): string[] {
  const maxLength = Math.max(1, Math.min(200, Number(config.maxLength) || 30))
  const stopSet = new Set(
    (config.stopWords ?? [])
      .map((w) => (w || '').toString().trim())
      .filter(Boolean)
      .map((w) => (config.caseSensitive ? w : w.toLowerCase())),
  )
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    const trimmed = (raw ?? '').toString().trim().slice(0, maxLength)
    if (!trimmed) continue
    const cased = config.caseSensitive ? trimmed : trimmed.toLowerCase()
    if (stopSet.has(cased)) continue
    if (seen.has(cased)) continue
    seen.add(cased)
    out.push(cased)
    if (!config.allowMultiple) break
  }
  return out
}

// ---------------------------------------------------------------------
// Annotation — server-side hit detection. Coords are all normalized [0, 1]
// relative to the image's natural dimensions.
// ---------------------------------------------------------------------
function clampUnit(v: unknown): number | null {
  if (typeof v !== 'number' || Number.isNaN(v)) return null
  if (v < 0 || v > 1) return null
  return v
}

function detectHit(
  regions: AnnotationRegion[],
  x: number,
  y: number,
): string | null {
  for (const r of regions) {
    if (hitTest(r, x, y)) return r.id
  }
  return null
}

function hitTest(region: AnnotationRegion, x: number, y: number): boolean {
  const c = region.coords
  if (region.shape === 'circle') {
    if (c.length < 3) return false
    const [cx, cy, rad] = c
    return Math.hypot(x - cx, y - cy) <= rad
  }
  if (region.shape === 'rectangle') {
    if (c.length < 4) return false
    const [rx, ry, rw, rh] = c
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
  }
  if (region.shape === 'polygon') {
    if (c.length < 6) return false
    return pointInPolygon(x, y, c)
  }
  return false
}

function pointInPolygon(x: number, y: number, coords: number[]): boolean {
  let inside = false
  const n = Math.floor(coords.length / 2)
  let j = n - 1
  for (let i = 0; i < n; i++) {
    const xi = coords[i * 2]
    const yi = coords[i * 2 + 1]
    const xj = coords[j * 2]
    const yj = coords[j * 2 + 1]
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
    j = i
  }
  return inside
}

function scoreAnnotation(
  config: AnnotationConfig,
  taps: AnnotationResponseShape['taps'],
): number {
  const hitRegions = new Set<string>()
  for (const t of taps) {
    if (t.hitRegionId) hitRegions.add(t.hitRegionId)
  }
  if (config.mode === 'find_one') {
    return hitRegions.size > 0 ? 1 : 0
  }
  if (config.regions.length === 0) return 0
  return hitRegions.size / config.regions.length
}
