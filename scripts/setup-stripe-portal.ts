// =====================================================================
// Trainzy — Stripe Customer Portal configuration
// =====================================================================
// Configures the Customer Portal to let users manage payment methods,
// view invoices, switch plans (between Personal and Organization,
// monthly and annual), and cancel at period end.
//
// Run: npm run setup:stripe-portal
// =====================================================================

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Stripe from 'stripe'

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

const REQUIRED_PRICE_KEYS = [
  'STRIPE_PRICE_PERSONAL_MONTHLY_AED',
  'STRIPE_PRICE_PERSONAL_ANNUAL_AED',
  'STRIPE_PRICE_PERSONAL_MONTHLY_USD',
  'STRIPE_PRICE_PERSONAL_ANNUAL_USD',
  'STRIPE_PRICE_ORG_MONTHLY_AED',
  'STRIPE_PRICE_ORG_ANNUAL_AED',
  'STRIPE_PRICE_ORG_MONTHLY_USD',
  'STRIPE_PRICE_ORG_ANNUAL_USD',
] as const

async function main() {
  console.log('\n--- Trainzy Stripe Customer Portal setup ---\n')

  const personalPriceIds: string[] = []
  const orgPriceIds: string[] = []
  for (const key of REQUIRED_PRICE_KEYS) {
    const id = process.env[key]
    if (!id) {
      console.error(`Missing ${key}. Run \`npm run setup:stripe\` first.`)
      process.exit(1)
    }
    if (key.includes('PERSONAL')) personalPriceIds.push(id)
    else orgPriceIds.push(id)
  }

  // Look up product IDs from one of the prices in each tier.
  const personalPrice = await stripe.prices.retrieve(personalPriceIds[0])
  const orgPrice = await stripe.prices.retrieve(orgPriceIds[0])
  const personalProductId =
    typeof personalPrice.product === 'string'
      ? personalPrice.product
      : personalPrice.product.id
  const orgProductId =
    typeof orgPrice.product === 'string' ? orgPrice.product : orgPrice.product.id

  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Trainzy — manage your subscription',
    },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'name', 'address', 'tax_id'],
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products: [
          { product: personalProductId, prices: personalPriceIds },
          { product: orgProductId, prices: orgPriceIds },
        ],
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: [
            'too_expensive',
            'missing_features',
            'switched_service',
            'unused',
            'customer_service',
            'too_complex',
            'low_quality',
            'other',
          ],
        },
      },
    },
  })

  console.log('+ Portal configuration created:', config.id)
  console.log('\nThis configuration is now the default for your account.')
  console.log('No env var needed — Stripe uses the most recent default.\n')
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
    // .env.local missing — fine if env is set via shell.
  }
}

main().catch((err) => {
  console.error('Setup failed:', err)
  process.exit(1)
})
