import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { setActiveWorkspaceOnSession } from '@/lib/auth'
import { getUserWorkspaces } from '@/lib/workspace'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const access = await requireWorkspaceAccess(params.id, 'owner')
  if (!access.ok) return workspaceErrorResponse(access)
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('workspaces').delete().eq('id', params.id)
    if (error) throw error

    // Move the user to another workspace if available.
    const remaining = await getUserWorkspaces(access.session.user_id)
    await setActiveWorkspaceOnSession(remaining[0]?.workspace.id ?? null)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('workspace delete', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
