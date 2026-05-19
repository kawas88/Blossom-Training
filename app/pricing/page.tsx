import Link from 'next/link'
import { Decoration } from '@/components/ui/Decoration'
import { Logo } from '@/components/Logo'
import { BrandSquiggle } from '@/components/BrandSquiggle'
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
    <main className="relative min-h-screen flex flex-col bg-blush text-deep overflow-hidden">
      <Decoration />

      <header className="px-6 md:px-10 pt-8 relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/">
            <Logo height={32} />
          </Link>
          <nav className="flex items-center gap-5">
            <Link href="/pricing" className="text-sm font-semibold text-deep">
              Pricing
            </Link>
            {session ? (
              <Link
                href="/admin"
                className="inline-flex items-center rounded-full bg-wisteria text-white px-5 py-2 text-sm font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98]"
              >
                Open Trainzy →
              </Link>
            ) : (
              <>
                <Link
                  href="/admin/login"
                  className="text-sm font-semibold text-deep/70 hover:text-deep transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-full bg-wisteria text-white px-5 py-2 text-sm font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98]"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="flex-1 px-6 md:px-10 py-16 md:py-20 relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-wisteria/15 text-wisteria px-4 py-1.5 text-xs font-semibold tracking-eyebrow uppercase">
              Pricing
            </span>
            <h1 className="mt-5 font-serif text-5xl md:text-6xl font-extrabold tracking-tightish text-deep text-balance leading-[1.05]">
              Pick a{' '}
              <span className="relative inline-block">
                <span className="italic-wisteria">plan</span>
                <BrandSquiggle
                  variant="curl"
                  color="sunglow"
                  className="absolute -bottom-3 left-0 w-full h-3"
                />
              </span>{' '}
              that fits.
            </h1>
            <p className="mt-6 mx-auto max-w-xl text-deep/70 text-balance">
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
            <h2 className="font-serif text-3xl md:text-4xl font-extrabold tracking-tightish text-deep text-center text-balance">
              Common <span className="italic-wisteria">questions.</span>
            </h2>
            <div className="mt-8 max-w-2xl mx-auto">
              <PricingFAQ />
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA on deep purple — anchors the page in brand */}
      <section className="relative z-10 px-6 md:px-10 py-16 bg-deep text-white">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="font-serif text-2xl font-extrabold tracking-tightish text-white text-balance">
            Not sure which plan? Start with the{' '}
            <span className="italic-wisteria">free trial</span> and switch later.
          </p>
          <Link
            href={session ? '/admin' : '/signup'}
            className="inline-flex items-center gap-2 rounded-full bg-wisteria text-white px-6 py-3 text-sm font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98] shrink-0"
          >
            Get started →
          </Link>
        </div>
      </section>

      <footer className="relative z-10 px-6 md:px-10 py-8 bg-deep text-white/55">
        <div className="mx-auto max-w-6xl text-center text-xs">
          Trainzy · trainzy.io
        </div>
      </footer>
    </main>
  )
}
