import { headers } from 'next/headers'
import type { BillingCurrency } from './types'

// ---------------------------------------------------------------------
// Pick a default billing currency for the current request.
// 1. Vercel sets x-vercel-ip-country with the visitor's ISO-2 country.
// 2. Fall back to Accept-Language locale region (e.g. en-AE → AE).
// 3. Default to USD.
// AE → AED, everything else → USD.
// ---------------------------------------------------------------------

export function detectDefaultCurrency(): BillingCurrency {
  const h = headers()
  const country = h.get('x-vercel-ip-country')?.toUpperCase() || ''
  if (country === 'AE') return 'AED'

  if (!country) {
    const accept = h.get('accept-language') || ''
    const region = accept.split(/[,;]/)[0]?.split('-')[1]?.toUpperCase()
    if (region === 'AE') return 'AED'
  }
  return 'USD'
}
