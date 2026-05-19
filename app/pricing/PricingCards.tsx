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
      'All seven exercise types: Quiz, Reflection, Word Cloud, Matching, Ranking, Image Annotation, Branching Scenarios',
      'Trainer-paced live sessions',
      'AI sentiment analysis',
      'PDF + CSV exports',
    ],
  },
  organization: {
    highlight: 'Everything in Personal, plus:',
    items: [
      'Up to 10 trainer seats',
      'Workspace member invitations',
      'Role-based permissions',
      'Dedicated onboarding call',
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
        <div className="inline-flex rounded-full bg-white border-[1.5px] border-line p-1">
          {(['monthly', 'annual'] as BillingInterval[]).map((v) => (
            <button
              key={v}
              onClick={() => setInterval(v)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                interval === v
                  ? 'bg-wisteria text-white'
                  : 'text-deep/70 hover:text-deep',
              )}
            >
              {v === 'monthly' ? 'Monthly' : 'Annual'}
              {v === 'annual' && (
                <span
                  className={cn(
                    'ml-2 text-[10px] font-mono uppercase tracking-eyebrow',
                    interval === v ? 'text-white/80' : 'text-wisteria',
                  )}
                >
                  save 17%
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Currency toggle */}
        <div className="inline-flex rounded-full bg-white border-[1.5px] border-line p-1 text-xs font-mono">
          {(['AED', 'USD'] as BillingCurrency[]).map((v) => (
            <button
              key={v}
              onClick={() => setCurrency(v)}
              className={cn(
                'rounded-full px-3 py-1 font-semibold transition-all',
                currency === v ? 'bg-wisteria text-white' : 'text-deep/60 hover:text-deep',
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
  const [duplicate, setDuplicate] = useState(false)

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
    setDuplicate(false)
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        url?: string
      }
      if (res.status === 409 && data.error === 'subscription_exists') {
        setDuplicate(true)
        setBusy(false)
        return
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error || data.message || 'Could not start checkout')
      }
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
        'relative rounded-3xl p-7 md:p-8 flex flex-col',
        accent
          ? 'bg-white border-2 border-wisteria shadow-glow'
          : 'bg-white border-[1.5px] border-line',
      )}
    >
      {accent && (
        <span className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-wisteria text-white px-3 py-1 text-[10px] font-semibold tracking-eyebrow uppercase">
          Most popular
        </span>
      )}
      <p
        className={cn(
          'font-mono text-[10px] tracking-eyebrow uppercase',
          'text-deep/60',
        )}
      >
        {labels.eyebrow}
      </p>
      <h3 className="mt-2 font-serif text-3xl md:text-4xl font-extrabold tracking-tightish text-deep">
        {labels.title}
      </h3>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-deep/50">
          {currency}
        </span>
        <span className="font-serif text-5xl font-extrabold tracking-tightish text-deep">
          {formattedAmount}
        </span>
        <span className="text-sm text-deep/60">
          / {interval === 'monthly' ? 'month' : 'year'}
        </span>
      </div>
      {interval === 'annual' && (
        <p className="mt-1 text-xs font-mono uppercase tracking-eyebrow text-wisteria">
          ✦ Save 17% vs monthly
        </p>
      )}

      <ul className="mt-6 space-y-2.5 flex-1">
        {features.highlight && (
          <li className="text-sm font-semibold text-deep">
            {features.highlight}
          </li>
        )}
        {features.items.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-sm text-deep/80"
          >
            <Check
              className="h-4 w-4 shrink-0 mt-0.5 text-wisteria"
              strokeWidth={2.5}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {duplicate && (
        <div className="mt-4 rounded-2xl px-3 py-2.5 text-xs flex items-start gap-2 bg-sunglow/20 border border-sunglow/50 text-deep">
          <div className="flex-1 min-w-0">
            <p>
              You already have an active subscription. Refresh to see your current plan.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-deep text-white hover:bg-deep/90"
          >
            Refresh
          </button>
        </div>
      )}
      {error && !duplicate && (
        <div className="mt-4 rounded-2xl bg-pink/10 border border-pink/25 px-3 py-2 text-xs text-pink">
          {error}
        </div>
      )}

      <div className="mt-7">
        <button
          onClick={handleClick}
          disabled={busy || ctaState.kind === 'current'}
          className={cn(
            'inline-flex items-center justify-center gap-2 w-full rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
            accent
              ? 'bg-wisteria text-white hover:bg-wisteria/90'
              : 'bg-deep text-white hover:bg-deep/90',
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
        <p className="mt-3 text-center text-xs text-deep/55">
          No credit card required to start.
        </p>
      </div>
    </div>
  )
}
