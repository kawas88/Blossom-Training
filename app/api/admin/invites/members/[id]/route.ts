import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, user_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const access = await requireWorkspaceAccess(member.workspace_id, 'admin')
  if (!access.ok) return workspaceErrorResponse(access)
  if (member.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot remove the workspace owner.' },
      { status: 400 },
    )
  }
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
