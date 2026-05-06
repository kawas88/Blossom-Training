import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const rows = responses.map((r) => ({
      participant_id: participantId,
      training_id: trainingId,
      item_id: r.item_id,
      first_attempt_category_id: r.first_attempt_category_id ?? null,
      was_correct: !!r.was_correct,
      attempts: Math.max(1, Math.min(50, Number(r.attempts) || 1)),
    }))

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('icebreaker_matching_responses').insert(rows)
      if (insErr) throw insErr
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
