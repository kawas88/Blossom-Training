import Link from 'next/link'
import { Decoration } from '@/components/ui/Decoration'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />

      <header className="px-6 md:px-10 pt-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="font-mono text-xs tracking-wider text-ink/70 uppercase">
            Trainzy
          </div>
          <nav className="flex items-center gap-5">
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
          </nav>
        </div>
      </header>

      <section className="flex-1 px-6 md:px-10 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60">
            For trainers who care
          </p>
          <h1 className="mt-6 font-serif text-5xl md:text-7xl tracking-tightish text-ink text-balance leading-[1.05]">
            Sessions that <span className="italic-sage">stay with people.</span>
          </h1>
          <p className="mt-6 mx-auto max-w-xl text-base md:text-lg text-ink/70 text-balance">
            Got a join code from your trainer? Pop it in below — a quick warm-up, a few honest questions, and you&rsquo;re done.
          </p>

          <form
            action="/join"
            method="GET"
            className="mt-12 mx-auto max-w-md rounded-2xl bg-white border border-ink/10 shadow-card p-6 md:p-8"
          >
            <label
              htmlFor="code"
              className="block text-left font-mono text-xs tracking-wider uppercase text-ink/70 mb-3"
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
              className="w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-center font-mono text-2xl tracking-[0.25em] uppercase text-ink placeholder:text-ink/30 focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20 transition-all"
            />
            <Button type="submit" size="lg" className="mt-4 w-full">
              Continue
            </Button>
          </form>

          <p className="mt-8 text-sm text-ink/60">
            Running trainings of your own?{' '}
            <Link href="/signup" className="text-ink underline underline-offset-2 hover:text-sage">
              Start a free 14-day trial
            </Link>
            .
          </p>
        </div>
      </section>

      <footer className="px-6 md:px-10 pb-8">
        <div className="mx-auto max-w-6xl text-center text-xs text-ink/50">
          Trainzy · trainzy.io
        </div>
      </footer>
    </main>
  )
}
