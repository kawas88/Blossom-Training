import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase/admin'
import { canCreateContent, getBillingState } from './billing-state'
import type { Workspace } from './types'

// Re-export the pure helpers so existing server-side imports keep working.
export { getBillingState, canCreateContent }

export type BillingGuardResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; response: NextResponse }

// ---------------------------------------------------------------------
// Route-handler guard. Loads the workspace by ID and returns a
// NextResponse if the workspace can't currently create new content.
// Caller should already have done a workspace-membership check.
// ---------------------------------------------------------------------
export async function requirePaidOrActiveTrial(
  workspaceId: string,
): Promise<BillingGuardResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle()
  if (error || !data) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Workspace not found' }, { status: 404 }),
    }
  }
  const ws = data as Workspace
  if (!canCreateContent(ws)) {
    const state = getBillingState(ws)
    let message: string
    switch (state.kind) {
      case 'trial-expired':
        message = 'Your trial has ended. Upgrade to keep creating new sessions.'
        break
      case 'past-due':
        message = "We couldn't process your latest payment. Update your card to keep things running."
        break
      case 'canceled':
        message = 'Your subscription has ended. Resubscribe to continue.'
        break
      default:
        message = 'This workspace is read-only right now.'
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: message, billing_state: state.kind },
        { status: 402 },
      ),
    }
  }
  return { ok: true, workspace: ws }
}
