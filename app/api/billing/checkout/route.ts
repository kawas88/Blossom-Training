import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import {
  stripe,
  lookupPriceId,
  getOrCreateStripeCustomer,
  findStripeCustomerByWorkspaceId,
  listLiveSubscriptionsForCustomer,
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

const DUPLICATE_MESSAGE =
  'You already have an active subscription. Manage it from Settings → Billing.'

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
    let workspace = access.workspace as Workspace

    // -----------------------------------------------------------------
    // Authoritative duplicate-subscription check.
    //
    // The local workspace row's stripe_subscription_status can be stale
    // (e.g. checkout completed but webhook hasn't synced yet). To stop
    // the user double-paying, ask Stripe directly.
    //
    // Steps:
    //   1. If the workspace already has a customer ID, use it.
    //   2. Otherwise, search Stripe for a customer with this
    //      workspace_id in metadata (an orphan from a previous flow).
    //      If found, link it to the workspace row before checking.
    //   3. List subscriptions for that customer. If any are in a "live"
    //      status (trialing/active/past_due/unpaid/incomplete), return
    //      409 Conflict.
    // -----------------------------------------------------------------
    let customerId = workspace.stripe_customer_id ?? null
    if (!customerId) {
      const orphan = await findStripeCustomerByWorkspaceId(workspace.id)
      if (orphan) {
        customerId = orphan.id
        const supabase = createAdminClient()
        await supabase
          .from('workspaces')
          .update({ stripe_customer_id: orphan.id })
          .eq('id', workspace.id)
        workspace = { ...workspace, stripe_customer_id: orphan.id }
      }
    }

    if (customerId) {
      const liveSubs = await listLiveSubscriptionsForCustomer(customerId)
      if (liveSubs.length > 0) {
        return NextResponse.json(
          {
            error: 'subscription_exists',
            message: DUPLICATE_MESSAGE,
          },
          { status: 409 },
        )
      }
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

    const finalCustomerId = await getOrCreateStripeCustomer(
      workspace,
      ownerEmail,
      ownerName,
    )

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      `http://localhost:3000`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: finalCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/admin/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/admin/settings?tab=billing`,
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
