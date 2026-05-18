import Link from 'next/link'
import { Decoration } from '@/components/ui/Decoration'
import { detectDefaultCurrency } from '@/lib/locale'
import { getAdminSession } from '@/lib/auth'
import { getActiveWorkspace } from '@/lib/workspace'
import { PricingCards } from './PricingCards'
import { PricingFAQ } from './PricingFAQ'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Pricing · Trainzy',
  description:
    'Free 14-day trial. Personal AED 199/mo, Organization AED 899/mo. Annual billing saves 17%.',
}

export default async function PricingPage() {
  const defaultCurrency = detectDefaultCurrency()
  const session = await getAdminSession()
  const active = session ? await getActiveWorkspace() : null

  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />

      <header className="px-6 md:px-10 pt-8 relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xs tracking-wider text-ink/70 uppercase"
          >
            Trainzy
          </Link>
          <nav className="flex items-center gap-5">
            <Link href="/pricing" className="text-sm text-ink font-medium">
              Pricing
            </Link>
            {session ? (
              <Link
                href="/admin"
                className="inline-flex items-center rounded-full bg-ink text-cream px-4 py-1.5 text-sm font-medium hover:bg-sage transition-colors"
              >
                Open Trainzy →
              </Link>
            ) : (
              <>
                <Link
                  href="/admin/login"
                  className="text-sm text-ink/70 hover:text-ink transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-full bg-ink text-cream px-4 py-1.5 text-sm font-medium hover:bg-sage transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="flex-1 px-6 md:px-10 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60">
              Pricing
            </p>
            <h1 className="mt-4 font-serif text-5xl md:text-6xl tracking-tightish text-ink text-balance leading-[1.05]">
              Pick a <span className="italic-sage">plan</span> that fits.
            </h1>
            <p className="mt-5 mx-auto max-w-xl text-ink/70 text-balance">
              Free for 14 days. No card needed to start. Switch or cancel anytime.
            </p>
          </div>

          <PricingCards
            defaultCurrency={defaultCurrency}
            loggedIn={!!session}
            activeWorkspaceId={active?.workspace.id ?? null}
            activeWorkspacePlan={active?.workspace.plan ?? null}
          />

          <div className="mt-20">
            <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink text-center text-balance">
              Common <span className="italic-sage">questions.</span>
            </h2>
            <div className="mt-8 max-w-2xl mx-auto">
              <PricingFAQ />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 py-12 border-t border-ink/10 bg-white/40 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="font-serif text-xl tracking-tightish text-ink text-balance">
            Not sure which plan? Start with the free trial and switch later.
          </p>
          <Link
            href={session ? '/admin' : '/signup'}
            className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors shrink-0"
          >
            Get started →
          </Link>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-8">
        <div className="mx-auto max-w-6xl text-center text-xs text-ink/50">
          Trainzy · trainzy.io
        </div>
      </footer>
    </main>
  )
}
