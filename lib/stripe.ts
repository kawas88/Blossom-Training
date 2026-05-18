import Stripe from 'stripe'
import { createAdminClient } from './supabase/admin'
import type {
  BillingCurrency,
  BillingInterval,
  Workspace,
  WorkspacePlan,
} from './types'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  _stripe = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
    appInfo: {
      name: 'Trainzy',
      version: '1.0.0',
      url: 'https://trainzy.io',
    },
  })
  return _stripe
}

// Proxy so call sites can keep writing `stripe.foo(...)` without paying
// the instantiation cost or hitting env-missing errors at module load.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe() as unknown as Record<string | symbol, unknown>
    return client[prop as string]
  },
})

// ---------------------------------------------------------------------
// Price catalog — env-driven map from a Stripe Price ID to its metadata.
// We rebuild this on each lookup so test/live env switches are picked up
// without restart in dev.
// ---------------------------------------------------------------------

type PriceMeta = {
  plan: 'personal' | 'organization'
  interval: BillingInterval
  currency: BillingCurrency
}

const ENV_PRICE_MAP: Record<string, PriceMeta> = {
  STRIPE_PRICE_PERSONAL_MONTHLY_AED: { plan: 'personal', interval: 'monthly', currency: 'AED' },
  STRIPE_PRICE_PERSONAL_ANNUAL_AED:  { plan: 'personal', interval: 'annual',  currency: 'AED' },
  STRIPE_PRICE_PERSONAL_MONTHLY_USD: { plan: 'personal', interval: 'monthly', currency: 'USD' },
  STRIPE_PRICE_PERSONAL_ANNUAL_USD:  { plan: 'personal', interval: 'annual',  currency: 'USD' },
  STRIPE_PRICE_ORG_MONTHLY_AED:      { plan: 'organization', interval: 'monthly', currency: 'AED' },
  STRIPE_PRICE_ORG_ANNUAL_AED:       { plan: 'organization', interval: 'annual',  currency: 'AED' },
  STRIPE_PRICE_ORG_MONTHLY_USD:      { plan: 'organization', interval: 'monthly', currency: 'USD' },
  STRIPE_PRICE_ORG_ANNUAL_USD:       { plan: 'organization', interval: 'annual',  currency: 'USD' },
}

export function getPriceCatalog(): Record<string, PriceMeta> {
  const out: Record<string, PriceMeta> = {}
  for (const [envKey, meta] of Object.entries(ENV_PRICE_MAP)) {
    const priceId = process.env[envKey]
    if (priceId) out[priceId] = meta
  }
  return out
}

export function lookupPriceId(
  plan: 'personal' | 'organization',
  interval: BillingInterval,
  currency: BillingCurrency,
): string | null {
  for (const [envKey, meta] of Object.entries(ENV_PRICE_MAP)) {
    if (meta.plan === plan && meta.interval === interval && meta.currency === currency) {
      return process.env[envKey] ?? null
    }
  }
  return null
}

export function getPlanFromPriceId(priceId: string): {
  plan: 'personal' | 'organization'
  interval: BillingInterval
  currency: BillingCurrency
  seatLimit: number
} | null {
  const catalog = getPriceCatalog()
  const meta = catalog[priceId]
  if (!meta) return null
  return {
    ...meta,
    seatLimit: SEAT_LIMITS[meta.plan],
  }
}

export const SEAT_LIMITS: Record<WorkspacePlan, number> = {
  trial: 1,
  personal: 1,
  organization: 10,
  canceled: 1,
}

// ---------------------------------------------------------------------
// Customer management — ensure a workspace has a Stripe customer.
// Stores the resulting customer ID back on the workspace.
// ---------------------------------------------------------------------

export async function getOrCreateStripeCustomer(
  workspace: Workspace,
  ownerEmail: string,
  ownerName: string,
): Promise<string> {
  if (workspace.stripe_customer_id) return workspace.stripe_customer_id

  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: ownerName,
    metadata: {
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      workspace_slug: workspace.slug,
    },
  })

  const supabase = createAdminClient()
  await supabase
    .from('workspaces')
    .update({ stripe_customer_id: customer.id })
    .eq('id', workspace.id)

  return customer.id
}

// ---------------------------------------------------------------------
// Find a Stripe customer that was previously created for this workspace
// but whose ID never made it back into our DB (e.g. checkout flow
// crashed before the workspace row update, or webhook delivery was
// delayed). Customers carry `workspace_id` in their metadata.
//
// Returns null if no such customer exists.
// ---------------------------------------------------------------------
export async function findStripeCustomerByWorkspaceId(
  workspaceId: string,
): Promise<Stripe.Customer | null> {
  const client = getStripe()
  const list = await client.customers.search({
    query: `metadata['workspace_id']:'${workspaceId}'`,
    limit: 1,
  })
  const first = list.data[0]
  // customers.search never returns deleted records, so a plain presence
  // check is all we need.
  return first ?? null
}

// ---------------------------------------------------------------------
// Returns a non-empty list of subscriptions in any status that
// represents a live billing relationship: trialing, active, past_due,
// unpaid, incomplete. (`canceled` and `incomplete_expired` mean the
// customer is free to resubscribe.)
// ---------------------------------------------------------------------
const LIVE_SUBSCRIPTION_STATUSES: Stripe.Subscription.Status[] = [
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'incomplete',
]

export async function listLiveSubscriptionsForCustomer(
  customerId: string,
): Promise<Stripe.Subscription[]> {
  const client = getStripe()
  const list = await client.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  })
  return list.data.filter((s) =>
    LIVE_SUBSCRIPTION_STATUSES.includes(s.status),
  )
}
