import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const text = String(body.body || '').trim()
    if (!text) return NextResponse.json({ error: 'Note body required' }, { status: 400 })
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('trainer_notes')
      .insert({
        training_id: params.id,
        body: text,
        participant_id: body.participant_id || null,
        item_id: body.item_id || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ note: data })
  } catch (e: unknown) {
    console.error('notes POST error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
