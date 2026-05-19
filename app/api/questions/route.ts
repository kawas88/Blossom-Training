import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/questions — participant submits a new Q&A question.
// Auth via verified participant_id + training_id pairing.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const trainingId = String(body.training_id || '').trim()
    const participantId = String(body.participant_id || '').trim()
    const question = String(body.question || '').trim()
    const anonymous = !!body.anonymous

    if (!trainingId || !participantId) {
      return NextResponse.json(
        { error: 'Missing training_id or participant_id' },
        { status: 400 },
      )
    }
    if (question.length < 3) {
      return NextResponse.json(
        { error: 'Question is too short — write at least 3 characters.' },
        { status: 400 },
      )
    }
    if (question.length > 500) {
      return NextResponse.json(
        { error: 'Question is too long — please keep it under 500 characters.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const [{ data: training }, { data: participant }] = await Promise.all([
      supabase.from('trainings').select('id, status').eq('id', trainingId).maybeSingle(),
      supabase
        .from('participants')
        .select('id, training_id, display_name')
        .eq('id', participantId)
        .maybeSingle(),
    ])
    if (!training || training.status !== 'live') {
      return NextResponse.json({ error: 'Training is not accepting questions' }, { status: 400 })
    }
    if (!participant || participant.training_id !== trainingId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const display = anonymous
      ? null
      : (participant as { display_name?: string | null }).display_name ?? null

    const { data: row, error } = await supabase
      .from('training_questions')
      .insert({
        training_id: trainingId,
        participant_id: participantId,
        display_name: display,
        question,
      })
      .select('*')
      .single()
    if (error) {
      console.error('questions insert', error)
      return NextResponse.json({ error: 'Could not post your question — try again.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, question: row })
  } catch (e: unknown) {
    console.error('questions POST error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
