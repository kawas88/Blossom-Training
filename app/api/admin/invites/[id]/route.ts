import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: invite } = await supabase
    .from('workspace_invites')
    .select('workspace_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(invite.workspace_id, 'admin')
  if (!access.ok) return workspaceErrorResponse(access)
  const { error } = await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
