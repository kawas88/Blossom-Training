// Pure billing-state derivations — safe to import from client components.
// (Anything that needs the service-role client lives in billing-guard.ts.)

import type { BillingState, Workspace } from './types'

export function getBillingState(workspace: Workspace): BillingState {
  const status = workspace.stripe_subscription_status

  if (workspace.plan === 'canceled' || status === 'canceled') {
    return { kind: 'canceled' }
  }

  if (status === 'past_due' || status === 'unpaid') {
    return { kind: 'past-due' }
  }

  if (workspace.plan === 'personal' || workspace.plan === 'organization') {
    if (workspace.cancel_at_period_end && workspace.current_period_end) {
      return { kind: 'paid-canceling', endsAt: workspace.current_period_end }
    }
    if (!workspace.stripe_subscription_id && !workspace.stripe_customer_id) {
      return { kind: 'no-billing' }
    }
    return { kind: 'paid-active' }
  }

  // plan === 'trial'
  if (!workspace.trial_ends_at) {
    return { kind: 'trial-active', daysLeft: 14 }
  }
  const msLeft = new Date(workspace.trial_ends_at).getTime() - Date.now()
  if (msLeft <= 0) {
    return { kind: 'trial-expired', expiredAt: workspace.trial_ends_at }
  }
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000))
  return { kind: 'trial-active', daysLeft }
}

export function canCreateContent(workspace: Workspace): boolean {
  const state = getBillingState(workspace)
  return (
    state.kind === 'trial-active' ||
    state.kind === 'paid-active' ||
    state.kind === 'paid-canceling' ||
    state.kind === 'no-billing'
  )
}
