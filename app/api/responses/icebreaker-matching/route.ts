import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMatchingExerciseForTraining } from '@/lib/exercises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Legacy endpoint — kept for backwards compatibility. Internally writes to
// the new exercise_responses table by looking up the matching exercise
// attached to the training. Frontend players should use
// POST /api/exercises/respond going forward.

type RespIn = {
  item_id: string
  first_attempt_category_id: string | null
  was_correct: boolean
  attempts: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const trainingId = String(body.training_id || '').trim()
    const participantId = String(body.participant_id || '').trim()
    const responses = Array.isArray(body.responses) ? (body.responses as RespIn[]) : []

    if (!trainingId || !participantId) {
      return NextResponse.json({ error: 'Missing training_id or participant_id' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: part } = await supabase
      .from('participants')
      .select('id, training_id')
      .eq('id', participantId)
      .maybeSingle()
    if (!part || part.training_id !== trainingId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const matchingExercise = await getMatchingExerciseForTraining(trainingId)
    if (!matchingExercise) {
      return NextResponse.json(
        { error: 'No matching exercise on this training' },
        { status: 404 },
      )
    }

    // Build the new exercise_responses payload from the legacy per-item shape.
    const placements: Record<string, string | null> = {}
    const firstAttempts: Record<string, string> = {}
    const attemptCounts: Record<string, number> = {}

    // The legacy player only submits when all items are correctly placed,
    // so the "placement" for each item is its correct_category_id. We pull
    // that from the new exercise's correctPlacements map.
    const correctMap =
      'correctPlacements' in matchingExercise.config
        ? (matchingExercise.config.correctPlacements as Record<string, string>)
        : {}

    for (const r of responses) {
      placements[r.item_id] = r.was_correct ? correctMap[r.item_id] ?? null : null
      firstAttempts[r.item_id] = r.first_attempt_category_id ?? ''
      attemptCounts[r.item_id] = Math.max(1, Math.min(50, Number(r.attempts) || 1))
    }

    const { data: existing } = await supabase
      .from('exercise_responses')
      .select('id')
      .eq('exercise_id', matchingExercise.id)
      .eq('participant_id', participantId)
      .maybeSingle()
    if (existing) {
      // Idempotent — they've already completed this. Treat as success so the
      // participant flow doesn't get stuck.
      await supabase
        .from('participants')
        .update({ icebreaker_completed_at: new Date().toISOString() })
        .eq('id', participantId)
      return NextResponse.json({ ok: true, alreadyCompleted: true })
    }

    const { error: insErr } = await supabase.from('exercise_responses').insert({
      training_id: trainingId,
      exercise_id: matchingExercise.id,
      participant_id: participantId,
      response: { placements, firstAttempts, attempts: attemptCounts },
      score: responses.length,
    })
    if (insErr) {
      console.error('legacy matching write to exercise_responses', insErr)
      return NextResponse.json({ error: 'Could not save responses' }, { status: 500 })
    }

    await supabase
      .from('participants')
      .update({ icebreaker_completed_at: new Date().toISOString() })
      .eq('id', participantId)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('icebreaker-matching error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
