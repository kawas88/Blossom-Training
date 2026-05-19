import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getExercise,
  isMatchingExercise,
  isQuizExercise,
  isReflectionExercise,
  isWordCloudExercise,
  type MatchingResponseShape,
  type QuizResponseShape,
  type ReflectionResponseShape,
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
      supabase.from('trainings').select('id, status').eq('id', trainingId).maybeSingle(),
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
