// =====================================================================
// Trainzy — Stripe products + prices setup
// =====================================================================
// Creates the 2 products (Personal, Organization) and 8 prices in
// Stripe via the API, then prints a table of Price IDs to paste into
// .env.local.
//
// Run: npm run setup:stripe
// =====================================================================

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Stripe from 'stripe'

// Load .env.local manually so the script works without dotenv as a dep.
loadEnv()

const secret = process.env.STRIPE_SECRET_KEY
if (!secret) {
  console.error('Missing STRIPE_SECRET_KEY in .env.local')
  process.exit(1)
}

const stripe = new Stripe(secret, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

type PriceSpec = {
  envKey: string
  plan: 'personal' | 'organization'
  interval: 'monthly' | 'annual'
  currency: 'aed' | 'usd'
  amount: number // in smallest currency unit
}

const PRICES: PriceSpec[] = [
  { envKey: 'STRIPE_PRICE_PERSONAL_MONTHLY_AED', plan: 'personal',     interval: 'monthly', currency: 'aed', amount: 19_900 },
  { envKey: 'STRIPE_PRICE_PERSONAL_ANNUAL_AED',  plan: 'personal',     interval: 'annual',  currency: 'aed', amount: 199_000 },
  { envKey: 'STRIPE_PRICE_PERSONAL_MONTHLY_USD', plan: 'personal',     interval: 'monthly', currency: 'usd', amount: 5_400 },
  { envKey: 'STRIPE_PRICE_PERSONAL_ANNUAL_USD',  plan: 'personal',     interval: 'annual',  currency: 'usd', amount: 54_000 },
  { envKey: 'STRIPE_PRICE_ORG_MONTHLY_AED',      plan: 'organization', interval: 'monthly', currency: 'aed', amount: 89_900 },
  { envKey: 'STRIPE_PRICE_ORG_ANNUAL_AED',       plan: 'organization', interval: 'annual',  currency: 'aed', amount: 899_000 },
  { envKey: 'STRIPE_PRICE_ORG_MONTHLY_USD',      plan: 'organization', interval: 'monthly', currency: 'usd', amount: 24_500 },
  { envKey: 'STRIPE_PRICE_ORG_ANNUAL_USD',       plan: 'organization', interval: 'annual',  currency: 'usd', amount: 245_000 },
]

const PRODUCTS: Record<'personal' | 'organization', { name: string; description: string }> = {
  personal: {
    name: 'Trainzy Personal',
    description: 'For solo trainers. Unlimited sessions, single seat.',
  },
  organization: {
    name: 'Trainzy Organization',
    description: 'For training teams. Up to 10 seats, shared workspace.',
  },
}

async function findOrCreateProduct(
  key: 'personal' | 'organization',
): Promise<Stripe.Product> {
  const list = await stripe.products.search({
    query: `metadata['trainzy_plan']:'${key}'`,
    limit: 1,
  })
  if (list.data.length > 0) {
    console.log(`✓ Found existing product for "${key}": ${list.data[0].id}`)
    return list.data[0]
  }
  const meta = PRODUCTS[key]
  const product = await stripe.products.create({
    name: meta.name,
    description: meta.description,
    metadata: { trainzy_plan: key },
  })
  console.log(`+ Created product "${meta.name}": ${product.id}`)
  return product
}

async function findOrCreatePrice(
  product: Stripe.Product,
  spec: PriceSpec,
): Promise<Stripe.Price> {
  // Look up by metadata signature; reuse if found.
  const list = await stripe.prices.search({
    query: `product:'${product.id}' AND metadata['trainzy_key']:'${spec.envKey}'`,
    limit: 1,
  })
  if (list.data.length > 0) {
    console.log(`✓ Found existing price for ${spec.envKey}: ${list.data[0].id}`)
    return list.data[0]
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: spec.currency,
    unit_amount: spec.amount,
    recurring: { interval: spec.interval === 'monthly' ? 'month' : 'year' },
    metadata: {
      trainzy_plan: spec.plan,
      trainzy_interval: spec.interval,
      trainzy_currency: spec.currency.toUpperCase(),
      trainzy_key: spec.envKey,
    },
    nickname: `${spec.plan} ${spec.interval} ${spec.currency.toUpperCase()}`,
  })
  console.log(`+ Created price ${spec.envKey}: ${price.id}`)
  return price
}

async function main() {
  console.log('\n--- Trainzy Stripe setup ---\n')
  const products = {
    personal: await findOrCreateProduct('personal'),
    organization: await findOrCreateProduct('organization'),
  }

  const results: { envKey: string; priceId: string }[] = []
  for (const spec of PRICES) {
    const product = products[spec.plan]
    const price = await findOrCreatePrice(product, spec)
    results.push({ envKey: spec.envKey, priceId: price.id })
  }

  console.log('\n--- Done. Paste these into .env.local ---\n')
  for (const { envKey, priceId } of results) {
    console.log(`${envKey}=${priceId}`)
  }
  console.log('\nNext: run `npm run setup:stripe-portal` to configure the customer portal.\n')
}

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const key = line.slice(0, eq).trim()
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local missing — that's fine if env is set via shell.
  }
}

main().catch((err) => {
  console.error('Setup failed:', err)
  process.exit(1)
})
