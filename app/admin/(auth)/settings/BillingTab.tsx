'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ExternalLink, AlertCircle, Sparkles } from 'lucide-react'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { getBillingState } from '@/lib/billing-state'
import {
  type BillingCurrency,
  type BillingInterval,
  type Workspace,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type Plan = 'personal' | 'organization'

export type CheckoutOutcome =
  | { kind: 'redirect'; url: string }
  | { kind: 'duplicate'; message: string }
  | { kind: 'error'; message: string }

// Shared client-side helper. Centralises the 409 (duplicate-subscription)
// handling so every "Upgrade" / "Resubscribe" button reacts the same way.
export async function requestCheckout(input: {
  workspaceId: string
  plan: Plan
  interval: BillingInterval
  currency: BillingCurrency
}): Promise<CheckoutOutcome> {
  try {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: input.workspaceId,
        plan: input.plan,
        interval: input.interval,
        currency: input.currency,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      message?: string
      url?: string
    }
    if (res.status === 409 && data.error === 'subscription_exists') {
      return {
        kind: 'duplicate',
        message:
          data.message ||
          'You already have an active subscription. Refresh the page to see your current plan.',
      }
    }
    if (!res.ok || !data.url) {
      return {
        kind: 'error',
        message: data.error || data.message || 'Could not start checkout.',
      }
    }
    return { kind: 'redirect', url: data.url }
  } catch (e: unknown) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Something went wrong',
    }
  }
}

const PRICING: Record<Plan, Record<BillingCurrency, Record<BillingInterval, number>>> = {
  personal: {
    AED: { monthly: 199, annual: 1990 },
    USD: { monthly: 54, annual: 540 },
  },
  organization: {
    AED: { monthly: 899, annual: 8990 },
    USD: { monthly: 245, annual: 2450 },
  },
}

type Props = {
  workspace: Workspace
  defaultCurrency: BillingCurrency
  memberCount: number
}

export function BillingTab({ workspace, defaultCurrency, memberCount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const state = useMemo(() => getBillingState(workspace), [workspace])

  // After a successful Stripe Checkout redirect, poll until the webhook updates
  // the workspace plan from 'trial' to something paid.
  const [polling, setPolling] = useState(false)
  useEffect(() => {
    if (!sessionId) return
    if (workspace.plan !== 'trial') {
      // Webhook already arrived — clean URL.
      router.replace('/admin/settings?tab=billing')
      return
    }
    setPolling(true)
    const interval = window.setInterval(() => {
      router.refresh()
    }, 2500)
    return () => window.clearInterval(interval)
  }, [sessionId, workspace.plan, router])

  return (
    <div className="space-y-6">
      {sessionId && polling && (
        <div className="rounded-2xl bg-sage/10 border border-sage/30 p-5 flex items-center gap-4">
          <Loader2 className="h-5 w-5 text-sage animate-spin shrink-0" />
          <div>
            <p className="font-serif text-lg tracking-tightish text-ink">
              Welcome to Trainzy — setting things up.
            </p>
            <p className="mt-1 text-sm text-ink/60">
              This usually takes a few seconds. Hang tight.
            </p>
          </div>
        </div>
      )}

      {state.kind === 'past-due' && (
        <div className="rounded-2xl bg-warn/10 border border-warn/30 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
            <div>
              <p className="font-serif text-lg tracking-tightish text-ink">
                Payment problem.
              </p>
              <p className="mt-1 text-sm text-ink/70">
                We couldn&rsquo;t process your latest payment. Update your card to keep things running.
              </p>
              <ManageInPortal workspaceId={workspace.id} className="mt-4" />
            </div>
          </div>
        </div>
      )}

      {state.kind === 'trial-active' && (
        <TrialUpgradeCard
          workspace={workspace}
          defaultCurrency={defaultCurrency}
          daysLeft={state.daysLeft}
        />
      )}

      {state.kind === 'trial-expired' && (
        <TrialUpgradeCard
          workspace={workspace}
          defaultCurrency={defaultCurrency}
          daysLeft={0}
        />
      )}

      {(state.kind === 'paid-active' ||
        state.kind === 'paid-canceling' ||
        state.kind === 'no-billing') && (
        <PaidPlanCard
          workspace={workspace}
          memberCount={memberCount}
          state={state.kind}
          endsAt={state.kind === 'paid-canceling' ? state.endsAt : null}
        />
      )}

      {state.kind === 'canceled' && (
        <CanceledCard workspace={workspace} defaultCurrency={defaultCurrency} />
      )}

      <details className="rounded-2xl bg-white border border-ink/10 p-5">
        <summary className="font-serif text-lg tracking-tightish text-ink cursor-pointer">
          Plans &amp; pricing
        </summary>
        <ul className="mt-4 text-sm text-ink/70 space-y-2">
          <li>
            <span className="font-medium text-ink">Personal</span> · AED 199 / month · 1 seat, unlimited trainings
          </li>
          <li>
            <span className="font-medium text-ink">Organization</span> · AED 899 / month · up to 10 seats, shared workspace, dedicated onboarding call
          </li>
          <li className="pt-1 text-xs text-ink/50">
            Annual billing saves 17%. Equivalent USD pricing available at checkout.{' '}
            <Link href="/pricing" className="underline">
              View pricing →
            </Link>
          </li>
        </ul>
      </details>

      <div className="rounded-2xl bg-white border border-ink/10 p-5">
        <h3 className="font-serif text-lg tracking-tightish text-ink mb-3">
          Workspace details
        </h3>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink/50">Workspace created</dt>
            <dd className="text-ink">{formatDate(workspace.created_at)}</dd>
          </div>
          {workspace.plan === 'trial' && workspace.trial_ends_at && (
            <div>
              <dt className="text-ink/50">Trial ends</dt>
              <dd className="text-ink">{formatDate(workspace.trial_ends_at)}</dd>
            </div>
          )}
          {workspace.current_period_end && (
            <div>
              <dt className="text-ink/50">Next billing date</dt>
              <dd className="text-ink">
                {formatDate(workspace.current_period_end)}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-ink/50">Seat usage</dt>
            <dd className="text-ink">
              {memberCount} of {workspace.seat_limit}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// =====================================================================
// Trial / upsell card with currency + interval toggles
// =====================================================================
function TrialUpgradeCard({
  workspace,
  defaultCurrency,
  daysLeft,
}: {
  workspace: Workspace
  defaultCurrency: BillingCurrency
  daysLeft: number
}) {
  const router = useRouter()
  const [currency, setCurrency] = useState<BillingCurrency>(defaultCurrency)
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [busy, setBusy] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<string | null>(null)

  const expired = daysLeft === 0 && workspace.plan === 'trial'

  async function startCheckout(plan: Plan) {
    if (busy) return
    setBusy(plan)
    setError(null)
    setDuplicate(null)
    const result = await requestCheckout({
      workspaceId: workspace.id,
      plan,
      interval,
      currency,
    })
    if (result.kind === 'redirect') {
      window.location.href = result.url
      return
    }
    if (result.kind === 'duplicate') {
      setDuplicate(result.message)
    } else {
      setError(result.message)
    }
    setBusy(null)
  }

  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-6 md:p-7">
      <Pill variant={expired ? 'error' : 'default'}>
        {expired ? 'Trial ended' : 'Free trial'}
      </Pill>
      <h2 className="mt-3 font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
        {expired ? (
          <>Your trial has <span className="italic-sage">ended.</span></>
        ) : (
          <>
            You&rsquo;re on the <span className="italic-sage">free trial.</span>
          </>
        )}
      </h2>
      <p className="mt-2 text-ink/70">
        {expired
          ? 'Pick a plan to start creating new sessions again.'
          : workspace.trial_ends_at
          ? `Your trial ends on ${formatDate(workspace.trial_ends_at)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left). Pick a plan to keep going.`
          : 'Pick a plan to keep going.'}
      </p>

      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1">
          {(['monthly', 'annual'] as BillingInterval[]).map((v) => (
            <button
              key={v}
              onClick={() => setInterval(v)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                interval === v ? 'bg-ink text-cream' : 'text-ink/70 hover:text-ink',
              )}
            >
              {v === 'monthly' ? 'Monthly' : 'Annual · save 17%'}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1 font-mono text-xs">
          {(['AED', 'USD'] as BillingCurrency[]).map((v) => (
            <button
              key={v}
              onClick={() => setCurrency(v)}
              className={cn(
                'rounded-full px-3 py-1 transition-all',
                currency === v ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <PlanButton
          plan="personal"
          accent={false}
          currency={currency}
          interval={interval}
          onClick={() => startCheckout('personal')}
          busy={busy === 'personal'}
        />
        <PlanButton
          plan="organization"
          accent
          currency={currency}
          interval={interval}
          onClick={() => startCheckout('organization')}
          busy={busy === 'organization'}
        />
      </div>

      {duplicate && (
        <DuplicateSubscriptionNotice
          message={duplicate}
          onRefresh={() => router.refresh()}
        />
      )}
      {error && !duplicate && (
        <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <p className="mt-5 text-xs text-ink/55">
        You&rsquo;ll be redirected to Stripe to complete checkout. Your data stays here — only billing happens on Stripe.
      </p>
    </div>
  )
}

function DuplicateSubscriptionNotice({
  message,
  onRefresh,
}: {
  message: string
  onRefresh: () => void
}) {
  return (
    <div className="mt-4 rounded-xl bg-warn/10 border border-warn/30 px-4 py-3 flex items-start gap-3">
      <AlertCircle className="h-4 w-4 text-warn shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-sm text-ink">
        <p>{message}</p>
        <p className="mt-1 text-ink/70 text-xs">
          Refresh the page to see your current plan.
        </p>
      </div>
      <button
        onClick={onRefresh}
        className="shrink-0 inline-flex items-center rounded-full bg-ink text-cream px-3 py-1.5 text-xs font-medium hover:bg-sage transition-colors"
      >
        Refresh
      </button>
    </div>
  )
}

function PlanButton({
  plan,
  accent,
  currency,
  interval,
  onClick,
  busy,
}: {
  plan: Plan
  accent: boolean
  currency: BillingCurrency
  interval: BillingInterval
  onClick: () => void
  busy: boolean
}) {
  const amount = PRICING[plan][currency][interval]
  const label = plan === 'personal' ? 'Personal' : 'Organization'
  const formattedAmount = new Intl.NumberFormat('en-US').format(amount)
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        'rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.99] disabled:cursor-not-allowed',
        accent
          ? 'bg-ink text-cream hover:bg-sage disabled:opacity-70'
          : 'bg-cream text-ink border border-ink/15 hover:bg-sand/40 disabled:opacity-70',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-serif text-xl tracking-tightish">
          Upgrade to {label}
        </span>
        {busy && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
      </div>
      <p className={cn('mt-1 text-sm', accent ? 'text-cream/80' : 'text-ink/60')}>
        {currency} {formattedAmount} / {interval === 'monthly' ? 'month' : 'year'}
      </p>
    </button>
  )
}

// =====================================================================
// Paid plan card (active / canceling / no-billing)
// =====================================================================
function PaidPlanCard({
  workspace,
  memberCount,
  state,
  endsAt,
}: {
  workspace: Workspace
  memberCount: number
  state: 'paid-active' | 'paid-canceling' | 'no-billing'
  endsAt: string | null
}) {
  const planLabel = workspace.plan === 'personal' ? 'Personal' : 'Organization'
  const overLimitForPersonal = workspace.plan === 'organization' && memberCount > 1

  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-6 md:p-7">
      <div className="flex items-center gap-2 flex-wrap">
        <Pill variant="sage">{planLabel}</Pill>
        {state === 'paid-canceling' && (
          <Pill variant="default">
            Canceling on {endsAt ? formatDate(endsAt) : 'period end'}
          </Pill>
        )}
        {state === 'paid-active' && <Pill variant="live">Active</Pill>}
        {state === 'no-billing' && <Pill variant="default">Comp</Pill>}
      </div>

      <h2 className="mt-3 font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
        You&rsquo;re on the <span className="italic-sage">{planLabel}</span> plan.
      </h2>

      <p className="mt-2 text-ink/70">
        {state === 'paid-canceling' && endsAt
          ? `Your plan will end on ${formatDate(endsAt)}. You'll keep access until then.`
          : state === 'no-billing'
          ? 'Internal account — billed externally. Contact support to change plans.'
          : workspace.current_period_end
          ? `Next billing date: ${formatDate(workspace.current_period_end)}.${
              workspace.billing_currency && workspace.billing_interval
                ? ` ${workspace.billing_currency} ${PRICING[workspace.plan === 'personal' ? 'personal' : 'organization'][workspace.billing_currency][workspace.billing_interval]} / ${workspace.billing_interval === 'monthly' ? 'month' : 'year'}.`
                : ''
            }`
          : 'Subscription active.'}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {state !== 'no-billing' && <ManageInPortal workspaceId={workspace.id} />}
        {workspace.plan === 'personal' && (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full bg-cream border border-ink/15 px-5 py-2.5 text-sm text-ink hover:bg-sand/40 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Switch to Organization
          </Link>
        )}
      </div>

      {overLimitForPersonal && (
        <div className="mt-5 rounded-xl bg-warn/10 border border-warn/20 px-4 py-3 text-sm text-ink/80">
          You currently have <span className="font-medium">{memberCount} members</span>. Personal only allows 1 seat — you&rsquo;ll need to remove members before downgrading.
        </div>
      )}
    </div>
  )
}

// =====================================================================
// Canceled card
// =====================================================================
function CanceledCard({
  workspace,
  defaultCurrency,
}: {
  workspace: Workspace
  defaultCurrency: BillingCurrency
}) {
  const router = useRouter()
  const [currency, setCurrency] = useState<BillingCurrency>(defaultCurrency)
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [busy, setBusy] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<string | null>(null)

  async function startCheckout(plan: Plan) {
    if (busy) return
    setBusy(plan)
    setError(null)
    setDuplicate(null)
    const result = await requestCheckout({
      workspaceId: workspace.id,
      plan,
      interval,
      currency,
    })
    if (result.kind === 'redirect') {
      window.location.href = result.url
      return
    }
    if (result.kind === 'duplicate') {
      setDuplicate(result.message)
    } else {
      setError(result.message)
    }
    setBusy(null)
  }

  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-6 md:p-7">
      <Pill variant="closed">Inactive</Pill>
      <h2 className="mt-3 font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
        Your subscription has <span className="italic-sage">ended.</span>
      </h2>
      <p className="mt-2 text-ink/70">
        Your workspace is in read-only mode. Resubscribe anytime to keep going. Your data is safe.
      </p>

      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1">
          {(['monthly', 'annual'] as BillingInterval[]).map((v) => (
            <button
              key={v}
              onClick={() => setInterval(v)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                interval === v ? 'bg-ink text-cream' : 'text-ink/70 hover:text-ink',
              )}
            >
              {v === 'monthly' ? 'Monthly' : 'Annual · save 17%'}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-full bg-cream border border-ink/15 p-1 font-mono text-xs">
          {(['AED', 'USD'] as BillingCurrency[]).map((v) => (
            <button
              key={v}
              onClick={() => setCurrency(v)}
              className={cn(
                'rounded-full px-3 py-1 transition-all',
                currency === v ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <PlanButton
          plan="personal"
          accent={false}
          currency={currency}
          interval={interval}
          onClick={() => startCheckout('personal')}
          busy={busy === 'personal'}
        />
        <PlanButton
          plan="organization"
          accent
          currency={currency}
          interval={interval}
          onClick={() => startCheckout('organization')}
          busy={busy === 'organization'}
        />
      </div>
      {duplicate && (
        <DuplicateSubscriptionNotice
          message={duplicate}
          onRefresh={() => router.refresh()}
        />
      )}
      {error && !duplicate && (
        <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// Manage subscription button — opens Stripe Customer Portal
// =====================================================================
function ManageInPortal({
  workspaceId,
  className,
}: {
  workspaceId: string
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open portal')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <Button onClick={open} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        {busy ? 'Opening…' : 'Manage subscription'}
      </Button>
      {error && (
        <p className="mt-2 text-xs text-error">{error}</p>
      )}
    </div>
  )
}
