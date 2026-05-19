import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'
import { BrandShape } from '@/components/BrandShape'
import { BrandSquiggle } from '@/components/BrandSquiggle'

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col bg-blush text-deep overflow-hidden">
      {/* Floating decorative shapes — playful, off-axis, never crowding the
          composition. Hidden on small screens to keep the hero focused. */}
      <BrandShape
        kind="flower"
        color="sunglow"
        size="lg"
        rotate={-12}
        className="hidden md:block absolute top-32 left-10 animate-float"
      />
      <BrandShape
        kind="star"
        color="pink"
        size="md"
        rotate={20}
        className="hidden md:block absolute top-48 right-16 animate-wiggle"
      />
      <BrandShape
        kind="blob"
        color="mint"
        size="md"
        rotate={-8}
        className="hidden lg:block absolute bottom-40 left-24 animate-float"
      />
      <BrandShape
        kind="cross"
        color="wisteria"
        size="sm"
        rotate={15}
        className="hidden lg:block absolute bottom-32 right-20 animate-wiggle"
      />

      <header className="relative z-10 px-6 md:px-10 pt-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo height={32} />
          <nav className="flex items-center gap-5">
            <Link
              href="/pricing"
              className="text-sm font-semibold text-deep/70 hover:text-deep transition-colors"
            >
              Pricing
            </Link>
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
          </nav>
        </div>
      </header>

      <section className="relative z-10 flex-1 px-6 md:px-10 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-wisteria/15 text-wisteria px-4 py-1.5 text-xs font-semibold tracking-eyebrow uppercase">
            For trainers who care
          </span>

          <h1 className="mt-6 font-serif text-5xl md:text-7xl tracking-tightish text-deep text-balance leading-[1.05]">
            Sessions that{' '}
            <span className="relative inline-block">
              <span className="italic-wisteria">stay</span>
              <BrandSquiggle
                variant="wave"
                color="sunglow"
                className="absolute -bottom-3 left-0 w-full h-3"
              />
            </span>{' '}
            with people.
          </h1>

          <p className="mt-8 mx-auto max-w-xl text-base md:text-lg text-deep/70 text-balance">
            Got a join code from your trainer? Pop it in below — a quick warm-up,
            a few honest questions, and you&rsquo;re done.
          </p>

          <form
            action="/join"
            method="GET"
            className="mt-12 mx-auto max-w-md rounded-3xl bg-white border-[1.5px] border-line shadow-card p-6 md:p-8"
          >
            <label
              htmlFor="code"
              className="block text-left font-mono text-xs tracking-eyebrow uppercase text-deep/70 mb-3"
            >
              Join code
            </label>
            <input
              type="text"
              name="code"
              id="code"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              placeholder="ASQ-DEMO"
              className="w-full rounded-2xl border-[1.5px] border-line bg-blush px-4 py-3 text-center text-2xl font-extrabold tracking-[0.25em] uppercase text-deep placeholder:text-deep/30 focus:outline-none focus:border-wisteria focus:border-2 transition-all"
            />
            <Button type="submit" size="lg" className="mt-4 w-full">
              Continue
            </Button>
          </form>

          <p className="mt-8 text-sm text-deep/60">
            Running trainings of your own?{' '}
            <Link
              href="/signup"
              className="text-deep font-semibold underline underline-offset-2 decoration-wisteria decoration-2 hover:text-wisteria transition-colors"
            >
              Start a free 14-day trial
            </Link>
            .
          </p>
        </div>
      </section>

      <footer className="relative z-10 px-6 md:px-10 pb-8">
        <div className="mx-auto max-w-6xl text-center text-xs text-deep/50">
          Trainzy · trainzy.io
        </div>
      </footer>
    </main>
  )
}
