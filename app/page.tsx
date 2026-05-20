import Link from 'next/link'
import {
  Sparkles,
  Share2,
  Activity,
  Layers,
  CheckCircle2,
  MessageSquare,
  Cloud,
  ListOrdered,
  Target,
  GitBranch,
  Check,
  ArrowRight,
} from 'lucide-react'
import { Logo } from '@/components/Logo'

// ---------------------------------------------------------------------
// Trainzy marketing homepage v3.
//
// Premium B2B SaaS posture for education buyers — training managers in
// nurseries, schools, universities, and L&D departments. Reference set
// is Wooclap / Slido: white + ink + one accent, restrained corporate
// composition, real product screenshots carry the proof.
//
// Palette lock for this page only (rest of the product keeps its full
// playful palette):
//   --white    #ffffff   primary surface
//   --cream    #fcfaf7   secondary surface
//   --ink      #1d0d2a   all text + dark moments
//   --wisteria #b497de   single primary accent
//   --sunglow  #f8d278   highlight, used sparingly
//
// No BrandShape / BrandSquiggle on this page. No pink/mint/blue/orange/
// mauve. No italics — wisteria emphasis is colour + weight 900 only.
// ---------------------------------------------------------------------
export default function HomePage() {
  return (
    <main className="bg-white text-ink">
      <TopNav />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <ProductPreview />
      <ExerciseTypes />
      <PricingTeaser />
      <FinalCta />
      <SiteFooter />
    </main>
  )
}

// ---------------------------------------------------------------------
// Top nav — sticky, ~72px tall, hairline bottom border.
// Mobile: nav links hide, logo + primary CTA remain.
// ---------------------------------------------------------------------
function TopNav() {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-ink/8">
      <div className="mx-auto max-w-6xl px-6 md:px-8 h-[72px] flex items-center justify-between">
        <Link href="/" aria-label="Trainzy home">
          <Logo height={32} />
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <Link href="#how-it-works" className="text-sm font-medium text-ink/75 hover:text-ink transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-ink/75 hover:text-ink transition-colors">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/admin/login" className="hidden sm:inline text-sm font-medium text-ink/75 hover:text-ink transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="inline-flex items-center rounded-full bg-wisteria text-white px-4 py-2 text-sm font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98]">
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------
// Section 1 — Split hero.
// Left: copy + CTAs + demoted join-code form for participants.
// Right: big screenshot placeholder (4:3) — sets the bar for premium
// feel and tells future-Kawas exactly which screenshot belongs here.
// ---------------------------------------------------------------------
function Hero() {
  return (
    <section className="bg-white min-h-[80vh] flex items-center px-6 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* Left column — copy */}
        <div>
          <span className="inline-flex items-center rounded-full bg-wisteria/10 text-wisteria px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.1em]">
            For trainers in education
          </span>

          <h1 className="mt-6 text-ink text-balance" style={{ fontSize: 'clamp(40px, 5.5vw, 76px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Run training your team will{' '}
            <span className="text-wisteria" style={{ fontWeight: 900 }}>
              remember.
            </span>
          </h1>

          <p className="mt-6 text-ink/70" style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.55, maxWidth: 480 }}>
            Live, interactive sessions for trainers who care about retention.
            Quizzes, reflections, word clouds, branching scenarios — all in
            one place, no installs.
          </p>

          <div className="mt-8 flex items-center gap-5 flex-wrap">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-wisteria text-white px-6 py-3 text-base font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98]">
              Start free trial
            </Link>
            <Link href="#how-it-works" className="inline-flex items-center gap-1.5 text-base font-medium text-ink hover:text-wisteria transition-colors">
              See how it works
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Demoted participant entry. Smaller, lighter — doesn't compete
              with the buyer CTA above. */}
          <div className="mt-10 max-w-md">
            <p className="text-[13px] text-ink/55 mb-2">Got a join code?</p>
            <form action="/join" method="GET" className="flex items-center gap-1 rounded-full bg-white border border-ink/15 p-1">
              <input type="text" name="code" id="code" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20} placeholder="Enter code" aria-label="Join code" className="flex-1 min-w-0 bg-transparent px-3 py-1.5 text-sm font-semibold tracking-[0.16em] uppercase text-ink placeholder:text-ink/35 focus:outline-none" />
              <button type="submit" aria-label="Continue with join code" className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-ink text-white hover:bg-ink/90 transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right column — hero screenshot placeholder (4:3) */}
        <div className="relative aspect-[4/3] bg-ink/5 rounded-2xl border border-ink/10 overflow-hidden flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-xs font-semibold tracking-widest uppercase text-ink/40 mb-2">
              Screenshot placeholder
            </div>
            <div className="text-sm text-ink/60">
              Live cockpit · 1200×900px
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 2 — Trust strip. Quiet beat with placeholder logos. Honest
// rectangles instead of fake brand names; replace as customers land.
// ---------------------------------------------------------------------
function TrustStrip() {
  return (
    <section className="bg-cream px-6 md:px-8 py-12">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-ink/80" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' }}>
          Trusted by trainers in nurseries, schools, universities, and L&amp;D teams.
        </p>
        <div className="mt-8 flex items-center justify-center gap-8 md:gap-12 flex-wrap opacity-50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-32 h-10 bg-ink/10 rounded flex items-center justify-center text-xs text-ink/40">
              Logo {i}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 3 — How it works. Three numbered cards, lucide line icons.
// ---------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      number: '01',
      Icon: Sparkles,
      title: 'Build a session in minutes.',
      body:
        'Pick from seven exercise types — quizzes, reflections, word clouds, ranking, image annotations, branching scenarios, and matching games. Mix and match. We’ve already filled in the boring bits.',
    },
    {
      number: '02',
      Icon: Share2,
      title: 'Share a code or QR.',
      body:
        'Each session gets a short join code. Show it on screen, share the QR, or send the link. Participants join in one tap — no accounts, no downloads, no app stores.',
    },
    {
      number: '03',
      Icon: Activity,
      title: 'Run it live or self-paced.',
      body:
        'Drive the room from a live cockpit, or let participants work through exercises at their own pace. Either way, you see responses, themes, and reactions in real time.',
    },
  ]

  return (
    <section id="how-it-works" className="bg-white px-6 md:px-8 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center rounded-full bg-wisteria/10 text-wisteria px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.1em]">
            How it works
          </span>
          <h2 className="mt-5 text-ink text-balance" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Three steps to a session that lands.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map(({ number, Icon, title, body }) => (
            <article key={number} className="rounded-2xl bg-white border border-ink/10 p-8 hover:border-ink/20 transition-colors">
              <Icon className="h-7 w-7 text-ink" strokeWidth={1.5} />
              <p className="mt-6 text-ink/50" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {number}
              </p>
              <h3 className="mt-2 text-ink" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {title}
              </h3>
              <p className="mt-3 text-ink/70" style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.55 }}>
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 4 — Product preview moment. The big screenshot placeholder
// at 16:9, framed with a small heading + subhead. Cream surface so the
// frame reads as a paused moment in the scroll.
// ---------------------------------------------------------------------
function ProductPreview() {
  return (
    <section className="bg-cream px-6 md:px-8 py-32">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center rounded-full bg-sunglow/25 text-ink px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.1em]">
            Inside Trainzy
          </span>
          <h2 className="mt-5 text-ink text-balance" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            See what your trainers do.
          </h2>
          <p className="mt-5 text-ink/70 mx-auto" style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.55, maxWidth: 600 }}>
            Real-time word clouds, AI-surfaced themes, and live Q&amp;A — all
            from one cockpit.
          </p>
        </div>

        <div className="mt-12 relative aspect-[16/9] bg-ink/5 rounded-2xl border border-ink/10 overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-semibold tracking-widest uppercase text-ink/40 mb-2">
              Screenshot placeholder
            </div>
            <div className="text-sm text-ink/60">
              Trainer cockpit during live session · 1600×900px
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 5 — Exercise types. Seven cards, lucide line icons in
// wisteria. The accent on icons gives the grid visual rhythm without
// pulling the brand toward "kids' app".
// ---------------------------------------------------------------------
function ExerciseTypes() {
  const types = [
    {
      name: 'Matching',
      Icon: Layers,
      body: 'Drag concepts to where they belong. For facts that need to stick.',
    },
    {
      name: 'Quiz',
      Icon: CheckCircle2,
      body: 'Multiple choice with instant feedback. Two questions or twenty.',
    },
    {
      name: 'Reflection',
      Icon: MessageSquare,
      body: 'Open-ended writing prompts. Themes surface automatically with AI.',
    },
    {
      name: 'Word Cloud',
      Icon: Cloud,
      body: 'One word — or three — to describe a moment. Live, shared, anonymous.',
    },
    {
      name: 'Ranking',
      Icon: ListOrdered,
      body: 'Order priorities, values, or steps. See where the room agrees.',
    },
    {
      name: 'Image Annotation',
      Icon: Target,
      body: 'Tap regions of an image. Spot the milestone, find the issue.',
    },
    {
      name: 'Branching Scenario',
      Icon: GitBranch,
      body: 'Choose-your-own-adventure for real classroom moments.',
    },
  ]

  return (
    <section className="bg-white px-6 md:px-8 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center rounded-full bg-wisteria/10 text-wisteria px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.1em]">
            What’s inside
          </span>
          <h2 className="mt-5 text-ink text-balance" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Seven ways to make a session land.
          </h2>
          <p className="mt-5 text-ink/70 mx-auto" style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.55, maxWidth: 600 }}>
            From a quick warm-up to a full debrief. Each exercise is built for
            a real human moment.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {types.map(({ name, Icon, body }) => (
            <article key={name} className="rounded-2xl bg-white border border-ink/10 p-6 hover:border-ink/20 transition-colors">
              <Icon className="h-6 w-6 text-wisteria" strokeWidth={1.75} />
              <h3 className="mt-4 text-ink" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {name}
              </h3>
              <p className="mt-2 text-ink/70" style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.55 }}>
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 6 — Pricing teaser. Two cards, Organization wisteria-bordered
// with a sunglow "Most popular" pill. Links to /pricing for the full
// comparison; no Stripe logic touched here.
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
    <section className="bg-cream px-6 md:px-8 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center rounded-full bg-wisteria/10 text-wisteria px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.1em]">
            Pricing
          </span>
          <h2 className="mt-5 text-ink text-balance" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Plans that grow with you.
          </h2>
          <p className="mt-5 text-ink/70 mx-auto" style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.55, maxWidth: 600 }}>
            Start free for 14 days. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <PlanCard eyebrow="For individual trainers" name="Personal" price="AED 199" cadence="/ month" tagline="Perfect for one trainer running regular sessions." features={personal} />
          <PlanCard eyebrow="For teams & institutions" name="Organization" price="AED 899" cadence="/ month" tagline="Built for training departments and education teams." features={organization} highlight />
        </div>

        <p className="mt-8 text-center text-sm text-ink/65">
          Need more?{' '}
          <Link href="/pricing" className="font-semibold text-wisteria hover:underline underline-offset-2">
            Contact us
          </Link>{' '}
          for enterprise plans.
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
    <div className={ 'relative rounded-2xl bg-white p-8 ' + (highlight ? 'border-2 border-wisteria' : 'border border-ink/10') }>
      {highlight && (
        <span className="absolute top-6 right-6 inline-flex items-center rounded-full bg-sunglow text-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]">
          Most popular
        </span>
      )}
      <p className="text-ink/55" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {eyebrow}
      </p>
      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-ink" style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {price}
        </span>
        <span className="text-ink/60 text-sm font-medium">{cadence}</span>
      </div>
      <p className="mt-3 text-ink/70 text-sm">{tagline}</p>
      <ul className="mt-6 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[15px] text-ink/85">
            <Check className="h-4 w-4 shrink-0 mt-0.5 text-wisteria" strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/signup" className="mt-8 inline-flex items-center justify-center w-full rounded-full bg-wisteria text-white px-6 py-3 text-sm font-semibold hover:bg-wisteria/90 transition-all active:scale-[0.98]">
        Start free trial
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------
// Section 7 — Final CTA. Only dark section on the page; gravity beat.
// No decoration — typography + sunglow CTA carry the contrast.
// ---------------------------------------------------------------------
function FinalCta() {
  return (
    <section className="bg-ink text-white px-6 md:px-8 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-white text-balance" style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Ready to run training your team will remember?
        </h2>
        <p className="mt-5 text-white/70 mx-auto" style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.55, maxWidth: 520 }}>
          14 days free. Setup takes 3 minutes. Cancel anytime.
        </p>
        <Link href="/signup" className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-sunglow text-ink px-7 py-3.5 text-base font-semibold hover:bg-sunglow/90 transition-all active:scale-[0.98]">
          Start your free trial
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-6 text-sm text-white/50">
          Already a customer?{' '}
          <Link href="/admin/login" className="font-semibold text-white hover:text-wisteria transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Section 8 — Footer. Four columns; restrained corporate posture.
// ---------------------------------------------------------------------
function SiteFooter() {
  return (
    <footer className="bg-ink text-white px-6 md:px-8 pt-16 pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo variant="light" height={32} />
            <p className="mt-4 text-sm text-white/60 max-w-[260px]">
              Training your team will remember.
            </p>
          </div>

          <FooterCol title="Product" links={[ { label: 'How it works', href: '/#how-it-works' }, { label: 'Exercise types', href: '/#how-it-works' }, { label: 'Pricing', href: '/pricing' }, { label: 'Sign in', href: '/admin/login' }, ]} />

          <FooterCol title="Company" links={[ { label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, ]} />

          <div>
            <p className="text-white/50" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Made in
            </p>
            <p className="mt-3 text-white" style={{ fontSize: 16, fontWeight: 600 }}>
              Dubai, UAE
            </p>
            <p className="mt-2 text-xs text-white/60">
              Built with care for trainers worldwide.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between gap-4 flex-wrap text-xs text-white/40">
          <span>© {new Date().getFullYear()} Trainzy</span>
          <span>trainzy.io</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <nav aria-label={title}>
      <p className="text-white/50" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-white/75">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="hover:text-wisteria transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
