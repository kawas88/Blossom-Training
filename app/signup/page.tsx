import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { Decoration } from '@/components/ui/Decoration'
import { Logo } from '@/components/Logo'
import { SignupForm } from './SignupForm'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')

  return (
    <main className="relative min-h-screen flex flex-col bg-blush text-deep overflow-hidden">
      <Decoration />
      <header className="relative z-10 px-6 md:px-10 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-deep/70 hover:text-deep transition-colors"
        >
          <Logo height={28} />
        </Link>
      </header>
      <div className="relative z-10 flex-1 px-6 py-12 md:py-16 flex items-center">
        <div className="mx-auto max-w-md w-full">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-wisteria/15 text-wisteria px-4 py-1.5 text-xs font-semibold tracking-eyebrow uppercase">
              Free 14-day trial
            </span>
            <h1 className="mt-5 font-serif text-4xl md:text-5xl font-extrabold tracking-tightish text-deep leading-tight text-balance">
              Start your <span className="italic-wisteria">first training.</span>
            </h1>
            <p className="mt-3 text-sm text-deep/60">
              No card required. Cancel anytime.
            </p>
          </div>
          <div className="rounded-3xl bg-white border-[1.5px] border-line shadow-card p-6 md:p-8">
            <SignupForm />
          </div>
          <p className="mt-6 text-center text-sm text-deep/60">
            Already have an account?{' '}
            <Link
              href="/admin/login"
              className="font-semibold text-deep underline underline-offset-2 decoration-wisteria decoration-2 hover:text-wisteria transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
