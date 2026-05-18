import { redirect } from 'next/navigation'
import { createAdminClient } from './supabase/admin'
import { getAdminSession, setActiveWorkspaceOnSession } from './auth'
import type { Workspace, WorkspaceRole } from './types'

// ---------------------------------------------------------------------
// Returns the active workspace from the session + verifies the user is
// still a member of it. Returns null if no session, no active workspace,
// or membership was revoked.
// ---------------------------------------------------------------------
export async function getActiveWorkspace(): Promise<{
  workspace: Workspace
  role: WorkspaceRole
} | null> {
  const session = await getAdminSession()
  if (!session || !session.active_workspace_id) return null
  const supabase = createAdminClient()
  const [{ data: ws }, { data: member }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('*')
      .eq('id', session.active_workspace_id)
      .maybeSingle(),
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', session.active_workspace_id)
      .eq('user_id', session.user_id)
      .maybeSingle(),
  ])
  if (!ws || !member) return null
  return { workspace: ws as Workspace, role: member.role as WorkspaceRole }
}

// ---------------------------------------------------------------------
// All workspaces a user is a member of, with their role in each.
// ---------------------------------------------------------------------
export async function getUserWorkspaces(
  userId: string,
): Promise<{ workspace: Workspace; role: WorkspaceRole }[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
  if (!data) return []
  return data
    .filter((row: { workspace: unknown }) => !!row.workspace)
    .map(
      (row: { role: string; workspace: Workspace | Workspace[] | null }) => {
        const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace
        return { workspace: ws as Workspace, role: row.role as WorkspaceRole }
      },
    )
}

// ---------------------------------------------------------------------
// Switch the active workspace on the current session. Verifies membership.
// Returns the workspace if successful, null otherwise.
// ---------------------------------------------------------------------
export async function switchWorkspace(
  workspaceId: string,
): Promise<Workspace | null> {
  const session = await getAdminSession()
  if (!session) return null
  const supabase = createAdminClient()
  const [{ data: ws }, { data: member }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .maybeSingle(),
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', session.user_id)
      .maybeSingle(),
  ])
  if (!ws || !member) return null
  await setActiveWorkspaceOnSession(workspaceId)
  return ws as Workspace
}

// ---------------------------------------------------------------------
// Server-component helper: load the active workspace, redirect to a
// sensible fallback if missing.
// ---------------------------------------------------------------------
export async function requireActiveWorkspaceForPage(): Promise<{
  workspace: Workspace
  role: WorkspaceRole
}> {
  const result = await getActiveWorkspace()
  if (!result) {
    const session = await getAdminSession()
    if (!session) redirect('/admin/login')
    // User has a session but no/invalid active workspace — figure out where to send them.
    const workspaces = await getUserWorkspaces(session.user_id)
    if (workspaces.length === 0) {
      redirect('/admin/no-workspace')
    }
    // Auto-pick the first available workspace.
    await setActiveWorkspaceOnSession(workspaces[0].workspace.id)
    redirect('/admin')
  }
  return result
}
