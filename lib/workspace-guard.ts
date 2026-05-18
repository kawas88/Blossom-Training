import { NextResponse } from 'next/server'
import { getAdminSession, requireRole } from './auth'
import { createAdminClient } from './supabase/admin'
import type { AdminSession, Workspace, WorkspaceRole } from './types'

export type WorkspaceAccess =
  | {
      ok: true
      session: AdminSession
      workspace: Workspace
      role: WorkspaceRole
    }
  | { ok: false; status: 401 | 403 | 404; error: string }

// ---------------------------------------------------------------------
// Verifies the current session is a member of the given workspace at
// (or above) the required role. Use at the top of every workspace-scoped
// admin API route handler.
//
// Returns 404 (not 403) when the user is not a member — this avoids
// leaking which workspace IDs exist.
// ---------------------------------------------------------------------
export async function requireWorkspaceAccess(
  resourceWorkspaceId: string,
  minRole: WorkspaceRole = 'viewer',
): Promise<WorkspaceAccess> {
  const session = await getAdminSession()
  if (!session) return { ok: false, status: 401, error: 'Unauthorized' }
  if (!resourceWorkspaceId)
    return { ok: false, status: 404, error: 'Not found' }

  const supabase = createAdminClient()
  const { data: ws } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', resourceWorkspaceId)
    .maybeSingle()
  if (!ws) return { ok: false, status: 404, error: 'Not found' }

  const role = await requireRole(resourceWorkspaceId, session.user_id, minRole)
  if (!role) {
    // Could be "not a member" (404) or "member but role too low" (403).
    // Re-fetch to distinguish.
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', resourceWorkspaceId)
      .eq('user_id', session.user_id)
      .maybeSingle()
    if (!member) return { ok: false, status: 404, error: 'Not found' }
    return { ok: false, status: 403, error: 'Forbidden' }
  }
  return { ok: true, session, workspace: ws as Workspace, role }
}

// ---------------------------------------------------------------------
// Convenience wrapper for API routes — returns a NextResponse on
// failure, or null on success (caller continues).
// ---------------------------------------------------------------------
export function workspaceErrorResponse(
  result: Extract<WorkspaceAccess, { ok: false }>,
): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}
