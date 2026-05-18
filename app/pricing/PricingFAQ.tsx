'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQ = [
  {
    q: 'What happens after my 14-day trial?',
    a: "Your workspace stays exactly where you left it — your data is safe. You won't be able to create new trainings or launch new sessions until you pick a plan, but existing trainings and exports stay accessible. No automatic charges, ever — we only charge if you actively pick a plan.",
  },
  {
    q: 'Can I cancel anytime?',
    a: "Yes. From your billing settings, click Manage subscription and cancel. You'll keep access through the end of your billing period, and we'll never charge you again. No phone calls, no retention pop-ups.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards, plus most local payment methods that Stripe supports in your country. Checkout is hosted by Stripe — we never see your card details.',
  },
  {
    q: 'Do you offer team or annual discounts?',
    a: 'Annual billing saves 17% on both tiers. For larger teams (more than 10 seats) or annual contracts, drop us a line — we can usually help.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Workspaces are isolated end-to-end. Authentication is bcrypt + signed JWTs. All data is stored in Supabase (Postgres) with row-level security. Stripe handles all payment data — we never touch a card number.',
  },
  {
    q: 'What if I need more than 10 seats?',
    a: "Get in touch. We don't list it publicly yet, but we can spin up custom plans for larger teams.",
  },
]

export function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <ul className="divide-y divide-ink/10 border-y border-ink/10">
      {FAQ.map((item, i) => {
        const isOpen = open === i
        return (
          <li key={item.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              aria-expanded={isOpen}
            >
              <span className="font-serif text-lg tracking-tightish text-ink">
                {item.q}
              </span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-ink/50 shrink-0 transition-transform',
                  isOpen && 'rotate-180 text-ink',
                )}
              />
            </button>
            <div
              className={cn(
                'overflow-hidden transition-all',
                isOpen ? 'max-h-96 pb-5' : 'max-h-0',
              )}
            >
              <p className="text-sm text-ink/70 leading-relaxed">{item.a}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
