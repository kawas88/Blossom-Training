'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import type {
  BillingCurrency,
  BillingInterval,
  WorkspacePlan,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type Plan = 'personal' | 'organization'

type Props = {
  defaultCurrency: BillingCurrency
  loggedIn: boolean
  activeWorkspaceId: string | null
  activeWorkspacePlan: WorkspacePlan | null
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

const FEATURES: Record<Plan, { highlight?: string; items: string[] }> = {
  personal: {
    items: [
      '1 trainer seat',
      'Unlimited training sessions',
      'Unlimited participants per session',
      'All exercise types (matching, survey, future additions)',
      'AI sentiment analysis',
      'PDF + CSV exports',
      'Real-time dashboard',
    ],
  },
  organization: {
    highlight: 'Everything in Personal, plus:',
    items: [
      'Up to 10 trainer seats',
      'Workspace member invitations',
      'Role-based permissions',
      'Priority support',
    ],
  },
}

const PLAN_LABELS: Record<Plan, { eyebrow: string; title: string }> = {
  personal: { eyebrow: 'For individual trainers', title: 'Personal' },
  organization: { eyebrow: 'For teams up to 10', title: 'Organization' },
}

export function PricingCards({
  defaultCurrency,
  loggedIn,
  activeWorkspaceId,
  activeWorkspacePlan,
}: Props) {
  const [currency, setCurrency] = useState<BillingCurrency>(defaultCurrency)
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        {/* Interval toggle */}
        <div className="inline-flex rounded-full bg-white border border-ink/15 p-1">
          {(['monthly', 'annual'] as BillingInterval[]).map((v) => (
            <button
              key={v}
              onClick={() => setInterval(v)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                interval === v
                  ? 'bg-ink text-cream'
                  : 'text-ink/70 hover:text-ink',
              )}
            >
              {v === 'monthly' ? 'Monthly' : 'Annual'}
              {v === 'annual' && (
                <span
                  className={cn(
                    'ml-2 text-[10px] font-mono uppercase tracking-wider',
                    interval === v ? 'text-cream/70' : 'text-sage',
                  )}
                >
                  save 17%
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Currency toggle */}
        <div className="inline-flex rounded-full bg-white border border-ink/15 p-1 text-xs font-mono">
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

      <div className="grid md:grid-cols-2 gap-4">
        {(['personal', 'organization'] as Plan[]).map((plan, idx) => (
          <PlanCard
            key={plan}
            plan={plan}
            interval={interval}
            currency={currency}
            loggedIn={loggedIn}
            activeWorkspaceId={activeWorkspaceId}
            activeWorkspacePlan={activeWorkspacePlan}
            accent={idx === 1}
          />
        ))}
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  interval,
  currency,
  loggedIn,
  activeWorkspaceId,
  activeWorkspacePlan,
  accent,
}: {
  plan: Plan
  interval: BillingInterval
  currency: BillingCurrency
  loggedIn: boolean
  activeWorkspaceId: string | null
  activeWorkspacePlan: WorkspacePlan | null
  accent: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const labels = PLAN_LABELS[plan]
  const features = FEATURES[plan]
  const amount = PRICING[plan][currency][interval]
  const formattedAmount = useMemo(
    () => new Intl.NumberFormat('en-US').format(amount),
    [amount],
  )

  const ctaState = useMemo(() => {
    if (!loggedIn) return { label: 'Start free 14-day trial →', kind: 'signup' as const }
    if (activeWorkspacePlan === plan)
      return { label: 'Current plan', kind: 'current' as const }
    if (activeWorkspacePlan === 'trial')
      return { label: `Upgrade to ${labels.title} →`, kind: 'checkout' as const }
    // On a different paid plan, or canceled, or no-billing — send to billing settings.
    return { label: 'Manage in billing →', kind: 'manage' as const }
  }, [activeWorkspacePlan, loggedIn, labels.title, plan])

  async function startCheckout() {
    if (busy || !activeWorkspaceId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          plan,
          interval,
          currency,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusy(false)
    }
  }

  function handleClick() {
    if (ctaState.kind === 'signup') {
      router.push('/signup')
    } else if (ctaState.kind === 'manage') {
      router.push('/admin/settings/billing')
    } else if (ctaState.kind === 'checkout') {
      startCheckout()
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl p-7 md:p-8 flex flex-col',
        accent
          ? 'bg-ink text-cream border border-ink'
          : 'bg-white border border-ink/10',
      )}
    >
      <p
        className={cn(
          'font-mono text-[10px] tracking-[0.2em] uppercase',
          accent ? 'text-cream/70' : 'text-ink/60',
        )}
      >
        {labels.eyebrow}
      </p>
      <h3
        className={cn(
          'mt-2 font-serif text-3xl md:text-4xl tracking-tightish',
          accent ? 'text-cream' : 'text-ink',
        )}
      >
        {labels.title}
      </h3>

      <div className="mt-4 flex items-baseline gap-2">
        <span
          className={cn(
            'font-mono text-[10px] uppercase tracking-wider',
            accent ? 'text-cream/60' : 'text-ink/50',
          )}
        >
          {currency}
        </span>
        <span
          className={cn(
            'font-serif text-5xl tracking-tightish',
            accent ? 'text-cream' : 'text-ink',
          )}
        >
          {formattedAmount}
        </span>
        <span
          className={cn(
            'text-sm',
            accent ? 'text-cream/70' : 'text-ink/60',
          )}
        >
          / {interval === 'monthly' ? 'month' : 'year'}
        </span>
      </div>
      {interval === 'annual' && (
        <p
          className={cn(
            'mt-1 text-xs font-mono uppercase tracking-wider',
            accent ? 'text-cream/80' : 'text-sage',
          )}
        >
          ✦ Save 17% vs monthly
        </p>
      )}

      <ul className="mt-6 space-y-2.5 flex-1">
        {features.highlight && (
          <li
            className={cn(
              'text-sm font-medium',
              accent ? 'text-cream' : 'text-ink',
            )}
          >
            {features.highlight}
          </li>
        )}
        {features.items.map((f) => (
          <li
            key={f}
            className={cn(
              'flex items-start gap-2 text-sm',
              accent ? 'text-cream/90' : 'text-ink/80',
            )}
          >
            <Check
              className={cn(
                'h-4 w-4 shrink-0 mt-0.5',
                accent ? 'text-sage' : 'text-sage',
              )}
              strokeWidth={2.5}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {error && (
        <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="mt-7">
        <button
          onClick={handleClick}
          disabled={busy || ctaState.kind === 'current'}
          className={cn(
            'inline-flex items-center justify-center gap-2 w-full rounded-full px-6 py-3 text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed',
            accent
              ? 'bg-cream text-ink hover:bg-sand disabled:opacity-60'
              : 'bg-ink text-cream hover:bg-sage disabled:opacity-60',
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening checkout…
            </>
          ) : (
            ctaState.label
          )}
        </button>
        <p
          className={cn(
            'mt-3 text-center text-xs',
            accent ? 'text-cream/70' : 'text-ink/55',
          )}
        >
          No credit card required to start.
        </p>
      </div>
    </div>
  )
}
