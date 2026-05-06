import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RespIn = {
  prompt_id: string
  answer: string
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

    const rows = responses
      .filter((r) => (r.answer ?? '').toString().trim().length > 0)
      .map((r) => ({
        participant_id: participantId,
        training_id: trainingId,
        prompt_id: r.prompt_id,
        answer: r.answer,
      }))

    if (rows.length > 0) {
      const { error } = await supabase.from('icebreaker_prompt_responses').insert(rows)
      if (error) throw error
    }

    await supabase
      .from('participants')
      .update({ icebreaker_completed_at: new Date().toISOString() })
      .eq('id', participantId)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('icebreaker-prompts error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
