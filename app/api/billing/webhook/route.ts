import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe, getPlanFromPriceId, SEAT_LIMITS } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  BillingCurrency,
  BillingInterval,
  StripeSubscriptionStatus,
  WorkspacePlan,
} from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook signature or secret missing' },
      { status: 400 },
    )
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch (e) {
    console.error('webhook: could not read body', e)
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid signature'
    console.error('webhook: signature verification failed', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // From here on we always return 200 — Stripe should not retry on app errors.
  const supabase = createAdminClient()

  // Idempotency check
  const { data: alreadyProcessed } = await supabase
    .from('billing_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  let workspaceId: string | null = null
  try {
    workspaceId = await handleEvent(event)
  } catch (e: unknown) {
    console.error(`webhook: handler error for ${event.type} (${event.id})`, e)
  }

  // Audit log — best effort; if this fails, swallow and still return 200.
  try {
    await supabase.from('billing_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      workspace_id: workspaceId,
      payload: event as unknown as Record<string, unknown>,
    })
  } catch (e) {
    console.error('webhook: could not record billing_event', e)
  }

  return NextResponse.json({ ok: true })
}

// ---------------------------------------------------------------------
// Handler — dispatch on event type. Returns the workspace_id if known.
// ---------------------------------------------------------------------
async function handleEvent(event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      return (session.metadata?.workspace_id as string | undefined) ?? null
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      return upsertWorkspaceFromSubscription(sub)
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      return cancelWorkspaceFromSubscription(sub)
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      return refreshPeriodFromInvoice(invoice)
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      return markPastDueFromInvoice(invoice)
    }
    case 'customer.deleted': {
      const customer = event.data.object as Stripe.Customer
      return clearCustomerFromWorkspace(customer.id)
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------
// Subscription -> workspace update
// ---------------------------------------------------------------------
async function upsertWorkspaceFromSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const supabase = createAdminClient()

  const workspaceId = await resolveWorkspaceIdFromSubscription(sub)
  if (!workspaceId) {
    console.warn(
      `webhook: subscription ${sub.id} has no workspace_id — ignoring`,
    )
    return null
  }

  const item = sub.items.data[0]
  const priceId = item?.price?.id ?? null
  const planMeta = priceId ? getPlanFromPriceId(priceId) : null

  const plan: WorkspacePlan = planMeta ? planMeta.plan : 'personal'
  const seatLimit = planMeta?.seatLimit ?? SEAT_LIMITS[plan]
  const interval: BillingInterval | null = planMeta?.interval ?? null
  const currency: BillingCurrency | null = planMeta?.currency ?? null

  const status = sub.status as StripeSubscriptionStatus
  const periodEnd = subscriptionPeriodEnd(sub)

  const update = {
    plan,
    seat_limit: seatLimit,
    stripe_subscription_id: sub.id,
    stripe_subscription_status: status,
    stripe_price_id: priceId,
    current_period_end: periodEnd,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    billing_interval: interval,
    billing_currency: currency,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
  }

  const { error } = await supabase
    .from('workspaces')
    .update(update)
    .eq('id', workspaceId)
  if (error) {
    console.error(`webhook: failed to update workspace ${workspaceId}`, error)
  }
  return workspaceId
}

async function cancelWorkspaceFromSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const supabase = createAdminClient()
  const workspaceId = await resolveWorkspaceIdFromSubscription(sub)
  if (!workspaceId) return null
  const { error } = await supabase
    .from('workspaces')
    .update({
      plan: 'canceled',
      stripe_subscription_status: 'canceled',
      cancel_at_period_end: false,
    })
    .eq('id', workspaceId)
  if (error) {
    console.error(`webhook: failed to cancel workspace ${workspaceId}`, error)
  }
  return workspaceId
}

async function refreshPeriodFromInvoice(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const supabase = createAdminClient()
  const subId = invoiceSubscriptionId(invoice)
  if (!subId) return null
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('stripe_subscription_id', subId)
    .maybeSingle()
  if (!ws) return null

  const periodEnd = invoicePeriodEnd(invoice)
  if (!periodEnd) return ws.id

  await supabase
    .from('workspaces')
    .update({
      current_period_end: periodEnd,
      stripe_subscription_status: 'active',
    })
    .eq('id', ws.id)
  return ws.id
}

async function markPastDueFromInvoice(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const supabase = createAdminClient()
  const subId = invoiceSubscriptionId(invoice)
  if (!subId) return null
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('stripe_subscription_id', subId)
    .maybeSingle()
  if (!ws) return null
  await supabase
    .from('workspaces')
    .update({ stripe_subscription_status: 'past_due' })
    .eq('id', ws.id)
  return ws.id
}

async function clearCustomerFromWorkspace(
  customerId: string,
): Promise<string | null> {
  const supabase = createAdminClient()
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!ws) return null
  await supabase
    .from('workspaces')
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_subscription_status: 'canceled',
      plan: 'canceled',
    })
    .eq('id', ws.id)
  return ws.id
}

// ---------------------------------------------------------------------
// ID resolution helpers
// ---------------------------------------------------------------------
async function resolveWorkspaceIdFromSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  // 1. Subscription metadata (set when we created the checkout session)
  const fromSubMeta = sub.metadata?.workspace_id
  if (typeof fromSubMeta === 'string' && fromSubMeta.length > 0) {
    return fromSubMeta
  }

  // 2. Look up by stripe_customer_id
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

// Stripe.Subscription.current_period_end moved in late 2025 versions —
// access it via items[0] when present, otherwise fall back to the legacy field.
function subscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items.data[0] as unknown as {
    current_period_end?: number | null
  } | undefined
  const fromItem = item?.current_period_end
  const fromSub = (sub as unknown as { current_period_end?: number | null })
    .current_period_end
  const ts = fromItem ?? fromSub ?? null
  return ts ? new Date(ts * 1000).toISOString() : null
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Stripe API has had a few shapes here over the years. Check several places.
  const fromTop = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription
  if (typeof fromTop === 'string') return fromTop
  if (fromTop && typeof fromTop === 'object' && 'id' in fromTop) return fromTop.id

  const parent = (invoice as unknown as {
    parent?: { subscription_details?: { subscription?: string | null } | null } | null
  }).parent
  const fromParent = parent?.subscription_details?.subscription
  if (typeof fromParent === 'string') return fromParent

  const line = invoice.lines?.data?.[0] as unknown as {
    subscription?: string | null
  } | undefined
  if (typeof line?.subscription === 'string') return line.subscription

  return null
}

function invoicePeriodEnd(invoice: Stripe.Invoice): string | null {
  const line = invoice.lines?.data?.[0]
  const periodEnd = line?.period?.end ?? null
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null
}
