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
    const status = String(body.status || '')
    if (!['draft', 'live', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const supabase = createAdminClient()
    const patch: Record<string, unknown> = { status }
    if (status === 'closed') patch.closed_at = new Date().toISOString()
    if (status === 'live') patch.closed_at = null
    const { data, error } = await supabase
      .from('trainings')
      .update(patch)
      .eq('id', params.id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ training: data })
  } catch (e: unknown) {
    console.error('PATCH status error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
