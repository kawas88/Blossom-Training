import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { BrandShape, type BrandShapeColor, type BrandShapeKind } from '@/components/BrandShape'
import { BrandSquiggle } from '@/components/BrandSquiggle'

// ---------------------------------------------------------------------
// Trainzy marketing homepage.
//
// Composition philosophy: premium B2B SaaS (Notion/Linear posture), the
// personality comes from the vibrant palette and *sparing* brand-shape
// placement (max 3 per section, one statement shape at most). Each
// section gets one dominant accent so the scroll has visual rhythm.
//
// Audience is twofold:
//   1. Buyers — training managers in education. Long scroll, proof and
//      pricing have to be visible without leaving the page.
//   2. Participants with a join code — should be able to paste their
//      code and leave in <10s. The hero keeps the form below the
//      buyer-facing CTAs, demoted but reachable.
// ---------------------------------------------------------------------
export default function HomePage() {
  return (
    <main className="bg-blush text-deep">
      <TopNav />
      <Hero />
      <HowItWorks />
      <ExerciseShowcase />
      <PricingTeaser />
      <TrustStrip />
      <FinalCta />
      <SiteFooter />
    </main>
  )
}

// ---------------------------------------------------------------------
// Top nav — sits across all marketing sections on the page.
// ---------------------------------------------------------------------
function TopNav() {
  return (
    <header className="relative z-20 px-6 md:px-10 pt-7">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" aria-label="Trainzy home">
          <Logo height={32} />
        </Link>
        <nav className="flex items-center gap-3 md:gap-5">
          <Link
            href="#how-it-works"
            className="hidden sm:inline text-sm font-semibold text-deep/70 hover:text-deep transition-colors"
          >
            How it works
          </Link>
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
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------
// Section 1 — Hero
//
// Deliberate shape placement (NOT scatter). Three shapes:
//   • pink cross, top-right
//   • sunglow flower, bottom-left
//   • wisteria sparkle, bottom-right edge
// Shapes hide on small screens so they don't crowd the form.
// ---------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative min-h-[80vh] flex flex-col justify-center px-6 md:px-10 py-16 md:py-24 overflow-hidden">
      {/* Deliberate shape placement (3 shapes max per section) */}
      <BrandShape
        kind="cross"
        color="pink"
        size="xl"
        rotate={8}
        className="hidden md:block absolute top-24 right-12 opacity-90"
      />
      <BrandShape
        kind="flower"
        color="sunglow"
        size="lg"
        rotate={-12}
        className="hidden md:block absolute bottom-20 left-12"
      />
      <BrandShape
        kind="sparkle"
        color="wisteria"
        size="md"
        rotate={20}
        className="hidden lg:block absolute bottom-32 right-24"
      />

      <div className="relative z-10 mx-auto max-w-4xl w-full text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-wisteria/15 text-wisteria px-4 py-1.5 text-[11px] font-semibold tracking-eyebrow uppercase">
          For trainers who care
        </span>

        <h1
          className="mt-7 mx-auto text-deep text-balance"
          style={{
            fontSize: 'clamp(56px, 8vw, 112px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          Run training your team will{' '}
          <span className="text-wisteria" style={{ fontWeight: 900 }}>
            remember.
          </span>
        </h1>

        <p
          className="mt-6 mx-auto text-deep/70"
          style={{
            maxWidth: 600,
            fontSize: 20,
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          Live, interactive sessions for the moments that count — quizzes,
          reflections, word clouds, branching scenarios. All in one place.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-wisteria text-white px-8 py-4 text-base font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98] shadow-glow"
          >
            Start free 14-day trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="text-base font-semibold text-deep hover:underline underline-offset-4 decoration-wisteria decoration-2"
          >
            See how it works
          </Link>
        </div>

        {/* Demoted join code form — buyers shouldn't read this as the
            primary CTA, but it's reachable for participants. */}
        <div className="mt-16 mx-auto max-w-md">
          <p className="text-sm text-deep/55 mb-3">
            Got a join code from your trainer?
          </p>
          <form
            action="/join"
            method="GET"
            className="flex items-center gap-2 rounded-full bg-white border-[1.5px] border-line p-1.5 shadow-card"
          >
            <input
              type="text"
              name="code"
              id="code"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              placeholder="Enter code"
              aria-label="Join code"
              className="flex-1 min-w-0 bg-transparent px-4 py-2 text-base font-semibold tracking-[0.18em] uppercase text-deep placeholder:text-deep/40 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-deep text-white hover:bg-deep/90 transition-colors"
              aria-label="Continue"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 2 — How it works (3 steps)
//
// Blush background continues from hero. Three cards, each with a brand
// shape icon, a step number, headline, description. No background
// shapes — the icons inside the cards are the only shapes in this
// section (3 shapes total, one per card, on-axis inside the layout).
// ---------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      number: '01',
      shape: 'hexagon' as BrandShapeKind,
      color: 'mint' as BrandShapeColor,
      title: 'Build a session in minutes.',
      body:
        'Pick from seven exercise types — quizzes, reflections, word clouds, ranking activities, image annotations, branching scenarios, and matching games. Mix and match. We&rsquo;ve already filled in the boring bits.',
    },
    {
      number: '02',
      shape: 'stack' as BrandShapeKind,
      color: 'blue' as BrandShapeColor,
      title: 'Share a code or QR.',
      body:
        'Each session gets a short join code. Show it on screen, share the QR, or send the link. Participants join in one tap — no accounts, no downloads, no app stores.',
    },
    {
      number: '03',
      shape: 'star5' as BrandShapeKind,
      color: 'pink' as BrandShapeColor,
      title: 'Run it live or self-paced.',
      body:
        'Trainers can drive the room from a live cockpit, or let participants work through exercises at their own pace. Either way, you see responses, themes, and reactions in real time.',
    },
  ]

  return (
    <section id="how-it-works" className="relative px-6 md:px-10 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-sunglow/25 text-deep px-4 py-1.5 text-[11px] font-semibold tracking-eyebrow uppercase">
            How it works
          </span>
          <h2
            className="mt-6 text-deep text-balance"
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Three minutes to set up. Forever to make better.
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-3xl bg-blush-deep p-7 md:p-8 shadow-soft hover:shadow-card transition-shadow"
            >
              <BrandShape kind={step.shape} color={step.color} px={80} />
              <p className="mt-6 font-mono text-xs tracking-eyebrow uppercase text-deep/55">
                {step.number}
              </p>
              <h3
                className="mt-2 text-deep"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                {step.title}
              </h3>
              <p
                className="mt-3 text-deep/75"
                style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.5 }}
                dangerouslySetInnerHTML={{ __html: step.body }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 3 — Exercise types showcase
//
// White background for visual rhythm. Seven cards, each shape lives
// inside the card as the icon (not as background decoration), so the
// total "loose" shape count for this section is zero — the cards earn
// the shape budget through content.
// ---------------------------------------------------------------------
function ExerciseShowcase() {
  const types: Array<{
    name: string
    shape: BrandShapeKind
    color: BrandShapeColor
    body: string
  }> = [
    {
      name: 'Matching',
      shape: 'hexagon',
      color: 'mint',
      body:
        'Drag concepts to where they belong. Great for facts that need to stick.',
    },
    {
      name: 'Quiz',
      shape: 'star',
      color: 'sunglow',
      body:
        'Multiple choice with instant feedback. Two questions or twenty.',
    },
    {
      name: 'Reflection',
      shape: 'cloud',
      color: 'mauve',
      body:
        'Open-ended writing prompts. Themes surface automatically with AI.',
    },
    {
      name: 'Word Cloud',
      shape: 'flower',
      color: 'wisteria',
      body:
        'One word — or three — to describe a moment. Live, shared, anonymous.',
    },
    {
      name: 'Ranking',
      shape: 'stack',
      color: 'blue',
      body:
        'Order priorities, values, or steps. See where the room agrees.',
    },
    {
      name: 'Image Annotation',
      shape: 'blob',
      color: 'pink',
      body:
        'Tap regions of an image. Spot the milestone, find the issue.',
    },
    {
      name: 'Branching Scenario',
      shape: 'star5',
      color: 'orange',
      body:
        'Choose-your-own-adventure for real classroom moments.',
    },
  ]

  return (
    <section className="bg-white px-6 md:px-10 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange/15 text-orange px-4 py-1.5 text-[11px] font-semibold tracking-eyebrow uppercase">
            What&rsquo;s inside
          </span>
          <h2
            className="mt-6 text-deep text-balance"
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Seven ways to make a session land.
          </h2>
          <p
            className="mt-5 mx-auto text-deep/70 text-balance"
            style={{ maxWidth: 600, fontSize: 18, fontWeight: 400, lineHeight: 1.5 }}
          >
            From a quick warm-up to a full debrief. Each exercise is built
            around a real human moment.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {types.map((t) => (
            <article
              key={t.name}
              className="rounded-3xl bg-white border-[1.5px] border-line p-6 md:p-7 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
            >
              <BrandShape kind={t.shape} color={t.color} px={88} />
              <h3
                className="mt-5 text-deep"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                {t.name}
              </h3>
              <p
                className="mt-2 text-deep/70"
                style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5 }}
              >
                {t.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 4 — Pricing teaser
//
// Blush again. Two cards, organization gets the wisteria border accent.
// Don't touch Stripe wiring — this is a teaser that links to /pricing
// for the full comparison.
// ---------------------------------------------------------------------
function PricingTeaser() {
  const personal = [
    'Up to 100 participants per session',
    'Unlimited sessions',
    'All 7 exercise types',
    'Real-time word clouds and Q&A',
    'Email support',
  ]
  const organization = [
    'Up to 500 participants per session',
    'Unlimited workspaces and team members',
    'All 7 exercise types',
    'Advanced analytics and exports',
    'Live Q&A moderation',
    'Priority support',
  ]

  return (
    <section className="px-6 md:px-10 py-32">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-wisteria/15 text-wisteria px-4 py-1.5 text-[11px] font-semibold tracking-eyebrow uppercase">
            Pricing
          </span>
          <h2
            className="mt-6 text-deep text-balance"
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Plans that grow with you.
          </h2>
          <p
            className="mt-5 mx-auto text-deep/70 text-balance"
            style={{ maxWidth: 600, fontSize: 18, fontWeight: 400, lineHeight: 1.5 }}
          >
            Start free for 14 days. No credit card to start. Cancel anytime.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <PlanCard
            eyebrow="For individual trainers"
            name="Personal"
            price="AED 199"
            cadence="/ month"
            tagline="Perfect for one trainer running regular sessions."
            features={personal}
          />
          <PlanCard
            eyebrow="For teams & institutions"
            name="Organization"
            price="AED 899"
            cadence="/ month"
            tagline="Built for training departments and education teams."
            features={organization}
            highlight
          />
        </div>

        <p className="mt-8 text-center text-sm text-deep/60">
          Need more?{' '}
          <Link
            href="/pricing"
            className="font-semibold text-deep underline underline-offset-2 decoration-wisteria decoration-2 hover:text-wisteria"
          >
            See all plans &amp; enterprise
          </Link>
          .
        </p>
      </div>
    </section>
  )
}

function PlanCard({
  eyebrow,
  name,
  price,
  cadence,
  tagline,
  features,
  highlight = false,
}: {
  eyebrow: string
  name: string
  price: string
  cadence: string
  tagline: string
  features: string[]
  highlight?: boolean
}) {
  return (
    <div
      className={
        'relative rounded-3xl bg-white p-7 md:p-9 ' +
        (highlight
          ? 'border-2 border-wisteria shadow-glow'
          : 'border-[1.5px] border-line shadow-soft')
      }
    >
      {highlight && (
        <span className="absolute -top-3 left-8 inline-flex items-center rounded-full bg-sunglow text-deep px-3 py-1 text-[10px] font-semibold tracking-eyebrow uppercase">
          Most popular
        </span>
      )}
      <p className="font-mono text-[10px] tracking-eyebrow uppercase text-deep/55">
        {eyebrow}
      </p>
      <h3
        className="mt-2 text-deep"
        style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        {name}
      </h3>
      <div className="mt-5 flex items-baseline gap-2">
        <span
          className="text-deep"
          style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}
        >
          {price}
        </span>
        <span className="text-deep/55 text-base font-medium">{cadence}</span>
      </div>
      <p className="mt-3 text-deep/70 text-sm">{tagline}</p>
      <ul className="mt-6 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-deep/85">
            <Check className="h-4 w-4 shrink-0 mt-0.5 text-mint" strokeWidth={3} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className="mt-8 inline-flex items-center justify-center gap-2 w-full rounded-full bg-wisteria text-white px-6 py-3 text-sm font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98]"
      >
        Start free trial
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------
// Section 5 — Trust strip
//
// Confidence beat — small section, blush-deep background. Placeholder
// logos are deliberate honesty (no fake brand names).
// ---------------------------------------------------------------------
function TrustStrip() {
  return (
    <section className="bg-blush-deep px-6 md:px-10 py-24">
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white text-deep px-4 py-1.5 text-[11px] font-semibold tracking-eyebrow uppercase">
          Built for education
        </span>
        <p
          className="mt-6 mx-auto text-deep text-balance"
          style={{
            maxWidth: 760,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}
        >
          Trusted by trainers in nurseries, schools, universities, and
          corporate L&amp;D teams.
        </p>
        <div className="mt-10 flex items-center justify-center gap-8 md:gap-12 opacity-50">
          {(['hexagon', 'sparkle', 'star5', 'flower', 'cross'] as BrandShapeKind[]).map(
            (k, i) => (
              <BrandShape
                key={`${k}-${i}`}
                kind={k}
                color="deep"
                size="md"
                className="grayscale"
              />
            ),
          )}
        </div>
        <p className="mt-5 text-xs text-deep/55 font-mono uppercase tracking-eyebrow">
          Customer logos coming soon
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 6 — Final CTA
//
// The only dark section on the page — creates rhythm and gravity.
// Decoration kept restrained: a large faint squiggle behind the heading
// + one small sparkle near the headline.
// ---------------------------------------------------------------------
function FinalCta() {
  return (
    <section className="relative bg-deep text-white px-6 md:px-10 py-32 overflow-hidden">
      {/* Decoration — restrained for dark sections */}
      <BrandSquiggle
        variant="loop"
        color="wisteria"
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[120%] h-32 opacity-25"
      />
      <BrandShape
        kind="sparkle"
        color="pink"
        size="sm"
        rotate={20}
        className="hidden md:block absolute top-24 right-1/3 opacity-90"
      />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2
          className="text-blush text-balance"
          style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Ready to run training that lands?
        </h2>
        <p
          className="mt-5 mx-auto text-blush/75"
          style={{ maxWidth: 520, fontSize: 18, fontWeight: 400, lineHeight: 1.5 }}
        >
          14 days free. Setup takes 3 minutes. Cancel anytime.
        </p>
        <Link
          href="/signup"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-sunglow text-deep px-8 py-4 text-base font-semibold hover:bg-sunglow/90 transition-all active:scale-[0.98]"
        >
          Start your free trial
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-6 text-sm text-blush/60">
          Already a customer?{' '}
          <Link
            href="/admin/login"
            className="font-semibold text-blush hover:text-wisteria transition-colors underline underline-offset-2 decoration-wisteria/50"
          >
            Sign in →
          </Link>
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 7 — Footer
// ---------------------------------------------------------------------
function SiteFooter() {
  return (
    <footer className="bg-deep text-white px-6 md:px-10 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <Logo variant="light" height={28} />
            <p className="mt-4 text-sm text-blush/60 max-w-[280px]">
              Training your team will remember.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="font-mono text-[10px] tracking-eyebrow uppercase text-blush/55 mb-3">
              Trainzy
            </p>
            <ul className="space-y-2 text-sm font-medium text-blush/75">
              <li>
                <Link href="/pricing" className="hover:text-wisteria transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-wisteria transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-wisteria transition-colors">
                  Start free trial
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-wisteria transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-wisteria transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-sm text-blush/50">Made with care in Dubai.</p>
            <div className="mt-4 flex items-center gap-3 opacity-60">
              <BrandShape kind="sparkle" color="wisteria" size="sm" />
              <BrandShape kind="cross" color="pink" size="sm" />
              <BrandShape kind="flower" color="sunglow" size="sm" />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-blush/10 text-center text-xs text-blush/45">
          © {new Date().getFullYear()} Trainzy · trainzy.io
        </div>
      </div>
    </footer>
  )
}
