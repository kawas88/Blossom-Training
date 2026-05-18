'use client'

import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import type { Workspace } from '@/lib/types'

export function BillingTab({ workspace }: { workspace: Workspace }) {
  const isTrial = workspace.plan === 'trial'
  const daysLeft = workspace.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(workspace.trial_ends_at).getTime() - Date.now()) / 86400000,
        ),
      )
    : null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              Current plan
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Pill variant={isTrial ? 'default' : 'sage'}>
                {planLabel(workspace.plan)}
              </Pill>
              {isTrial && daysLeft !== null && (
                <span className="text-sm text-ink/60">
                  {daysLeft === 0
                    ? 'Trial expires today'
                    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial`}
                </span>
              )}
            </div>
          </div>
          <Button onClick={() => alert('Pricing coming soon — Phase 2.')}>
            {isTrial ? 'Upgrade now' : 'Manage subscription'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-3">
        <h3 className="font-serif text-lg tracking-tightish text-ink">
          What you get
        </h3>
        <ul className="text-sm text-ink/70 space-y-2">
          <li>
            <span className="font-medium text-ink">Personal</span> · AED 199/mo · 1 seat, unlimited trainings
          </li>
          <li>
            <span className="font-medium text-ink">Organization</span> · AED 899/mo · up to 10 seats, shared workspace, priority support
          </li>
        </ul>
        <p className="text-xs text-ink/50 pt-2">
          Trial includes everything. No card required. Cancel anytime.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 p-6">
        <h3 className="font-serif text-lg tracking-tightish text-ink mb-3">
          Billing details
        </h3>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink/50">Workspace created</dt>
            <dd className="text-ink">{formatDate(workspace.created_at)}</dd>
          </div>
          {workspace.trial_ends_at && (
            <div>
              <dt className="text-ink/50">Trial ends</dt>
              <dd className="text-ink">{formatDate(workspace.trial_ends_at)}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink/50">Seat limit</dt>
            <dd className="text-ink">{workspace.seat_limit}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function planLabel(plan: Workspace['plan']): string {
  if (plan === 'trial') return 'Trial'
  if (plan === 'personal') return 'Personal'
  return 'Organization'
}
