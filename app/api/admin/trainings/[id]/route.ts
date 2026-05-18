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
