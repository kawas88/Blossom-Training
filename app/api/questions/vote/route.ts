import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/questions/vote — toggle an upvote on a Q&A question.
// Body: { question_id, participant_id, action: 'add' | 'remove' }
// The unique (question_id, participant_id) constraint enforces one vote
// per participant per question; the recalc trigger keeps upvotes synced.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const questionId = String(body.question_id || '').trim()
    const participantId = String(body.participant_id || '').trim()
    const action = body.action === 'remove' ? 'remove' : 'add'

    if (!questionId || !participantId) {
      return NextResponse.json(
        { error: 'Missing question_id or participant_id' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Verify the participant + question belong to the same live training.
    const { data: question } = await supabase
      .from('training_questions')
      .select('id, training_id, status')
      .eq('id', questionId)
      .maybeSingle()
    if (!question || question.status === 'hidden') {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('id, training_id')
      .eq('id', participantId)
      .maybeSingle()
    if (!participant || participant.training_id !== question.training_id) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    if (action === 'add') {
      const { error } = await supabase
        .from('training_question_votes')
        .insert({ question_id: questionId, participant_id: participantId })
      // 23505 = unique violation = already voted; treat as idempotent success.
      if (error && (error as { code?: string }).code !== '23505') {
        console.error('vote add', error)
        return NextResponse.json({ error: 'Could not upvote' }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('training_question_votes')
        .delete()
        .eq('question_id', questionId)
        .eq('participant_id', participantId)
      if (error) {
        console.error('vote remove', error)
        return NextResponse.json({ error: 'Could not remove upvote' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('vote POST error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
