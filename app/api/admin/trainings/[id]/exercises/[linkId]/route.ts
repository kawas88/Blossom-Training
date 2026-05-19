import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadAccess(trainingId: string, linkId: string) {
  const supabase = createAdminClient()
  const [{ data: training }, { data: link }] = await Promise.all([
    supabase
      .from('trainings')
      .select('workspace_id')
      .eq('id', trainingId)
      .maybeSingle(),
    supabase
      .from('training_exercises')
      .select('id, training_id, position, required')
      .eq('id', linkId)
      .maybeSingle(),
  ])
  return { supabase, training, link }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; linkId: string } },
) {
  const { supabase, training, link } = await loadAccess(params.id, params.linkId)
  if (!training || !link || link.training_id !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (typeof body.required === 'boolean') patch.required = body.required
  if (body.pacing === 'self' || body.pacing === 'trainer') {
    patch.pacing = body.pacing
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })

  const { data, error } = await supabase
    .from('training_exercises')
    .update(patch)
    .eq('id', params.linkId)
    .select('*')
    .single()
  if (error) {
    console.error('training_exercises PATCH', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  return NextResponse.json({ link: data })
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; linkId: string } },
) {
  const { supabase, training, link } = await loadAccess(params.id, params.linkId)
  if (!training || !link || link.training_id !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const access = await requireWorkspaceAccess(training.workspace_id, 'trainer')
  if (!access.ok) return workspaceErrorResponse(access)

  const { error } = await supabase
    .from('training_exercises')
    .delete()
    .eq('id', params.linkId)
  if (error) {
    console.error('training_exercises DELETE', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
