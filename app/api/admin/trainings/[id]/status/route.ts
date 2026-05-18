import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { data: training } = await supabase
      .from('trainings')
      .select('workspace_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
    if (!access.ok) return workspaceErrorResponse(access)

    const body = await req.json()
    const status = String(body.status || '')
    if (!['draft', 'live', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
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
