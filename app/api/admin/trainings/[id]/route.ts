import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const allowed = [
      'title',
      'nursery_name',
      'trainer_name',
      'description',
      'icebreaker_id',
      'survey_id',
      'scheduled_at',
    ] as const
    const patch: Record<string, unknown> = {}
    for (const k of allowed) {
      if (k in body) patch[k] = body[k]
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('trainings')
      .update(patch)
      .eq('id', params.id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ training: data })
  } catch (e: unknown) {
    console.error('PATCH training error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
