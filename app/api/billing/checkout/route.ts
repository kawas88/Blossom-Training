import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import {
  stripe,
  lookupPriceId,
  getOrCreateStripeCustomer,
} from '@/lib/stripe'
import type {
  BillingCurrency,
  BillingInterval,
  Workspace,
} from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Plan = 'personal' | 'organization'

function isPlan(v: unknown): v is Plan {
  return v === 'personal' || v === 'organization'
}
function isInterval(v: unknown): v is BillingInterval {
  return v === 'monthly' || v === 'annual'
}
function isCurrency(v: unknown): v is BillingCurrency {
  return v === 'AED' || v === 'USD'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const plan = body.plan
    const interval = body.interval
    const currency = body.currency
    const workspaceId = String(body.workspace_id || '').trim()

    if (!isPlan(plan) || !isInterval(interval) || !isCurrency(currency)) {
      return NextResponse.json({ error: 'Invalid plan, interval or currency' }, { status: 400 })
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    const access = await requireWorkspaceAccess(workspaceId, 'admin')
    if (!access.ok) return workspaceErrorResponse(access)
    const workspace = access.workspace

    // Block double-subscription. 'canceled' lets them resubscribe; everything
    // else means there's an active subscription Stripe is managing.
    if (
      workspace.stripe_subscription_id &&
      workspace.stripe_subscription_status &&
      workspace.stripe_subscription_status !== 'canceled' &&
      workspace.stripe_subscription_status !== 'incomplete_expired'
    ) {
      return NextResponse.json(
        {
          error:
            'You already have an active subscription. Manage it from your billing settings.',
        },
        { status: 400 },
      )
    }

    const priceId = lookupPriceId(plan, interval, currency)
    if (!priceId) {
      return NextResponse.json(
        { error: 'That price is not configured on the server.' },
        { status: 500 },
      )
    }

    // We need the owner's email to seed the Stripe customer.
    const supabase = createAdminClient()
    const { data: ownerRow } = await supabase
      .from('admin_users')
      .select('email, name')
      .eq('id', access.session.user_id)
      .maybeSingle()
    const ownerEmail = ownerRow?.email || access.session.email
    const ownerName = ownerRow?.name || access.session.name

    const customerId = await getOrCreateStripeCustomer(
      workspace as Workspace,
      ownerEmail,
      ownerName,
    )

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      `http://localhost:3000`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/admin/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/admin/settings/billing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false },
      subscription_data: {
        metadata: {
          workspace_id: workspace.id,
          workspace_name: workspace.name,
        },
      },
      metadata: {
        workspace_id: workspace.id,
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e: unknown) {
    console.error('billing/checkout error', e)
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
