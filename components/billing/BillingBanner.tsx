'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import type { BillingState } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  state: BillingState
  workspaceId: string
}

// Cross-page banner — rendered in the admin layout. Shows when the workspace
// is past-due, trial-expired, or canceled. Hidden for normal/active states.
export function BillingBanner({ state, workspaceId }: Props) {
  const [busy, setBusy] = useState(false)

  async function openPortal() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
    } catch {
      // Fall through to redirect.
    }
    window.location.href = '/admin/settings/billing'
  }

  if (state.kind === 'past-due') {
    return (
      <Wrapper tone="warn">
        <AlertCircle className="h-4 w-4 shrink-0 text-warn" />
        <span className="flex-1 text-sm">
          We couldn&rsquo;t process your latest payment. Update your card to keep things running.
        </span>
        <button
          onClick={openPortal}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-cream px-4 py-1.5 text-xs font-medium hover:bg-sage transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Update payment method
        </button>
      </Wrapper>
    )
  }

  if (state.kind === 'trial-expired') {
    return (
      <Wrapper tone="warn">
        <AlertCircle className="h-4 w-4 shrink-0 text-warn" />
        <span className="flex-1 text-sm">
          Your trial ended. Upgrade to keep creating new sessions — your data is safe and waiting.
        </span>
        <Link
          href="/admin/settings/billing"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-cream px-4 py-1.5 text-xs font-medium hover:bg-sage transition-colors"
        >
          View plans <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Wrapper>
    )
  }

  if (state.kind === 'canceled') {
    return (
      <Wrapper tone="error">
        <AlertCircle className="h-4 w-4 shrink-0 text-error" />
        <span className="flex-1 text-sm">
          Your subscription has ended. Resubscribe to keep going — everything is on hold, not deleted.
        </span>
        <Link
          href="/admin/settings/billing"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-cream px-4 py-1.5 text-xs font-medium hover:bg-sage transition-colors"
        >
          Resubscribe <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Wrapper>
    )
  }

  if (state.kind === 'paid-canceling') {
    return (
      <Wrapper tone="info">
        <span className="flex-1 text-sm">
          Your plan is set to cancel at the end of the current billing period. You can resume anytime in billing settings.
        </span>
        <Link
          href="/admin/settings/billing"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-cream px-4 py-1.5 text-xs font-medium hover:bg-sage transition-colors"
        >
          Manage <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Wrapper>
    )
  }

  return null
}

function Wrapper({
  tone,
  children,
}: {
  tone: 'warn' | 'error' | 'info'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl px-4 py-3 border mb-6',
        tone === 'warn' && 'bg-warn/10 border-warn/30 text-ink',
        tone === 'error' && 'bg-error/10 border-error/30 text-ink',
        tone === 'info' && 'bg-sand/40 border-ink/15 text-ink',
      )}
    >
      {children}
    </div>
  )
}
