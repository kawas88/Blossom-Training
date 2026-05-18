import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { Decoration } from '@/components/ui/Decoration'
import { SignupForm } from './SignupForm'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')

  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />
      <header className="px-6 md:px-10 pt-8">
        <Link
          href="/"
          className="font-mono text-xs tracking-wider uppercase text-ink/70"
        >
          ← Trainzy
        </Link>
      </header>
      <div className="flex-1 px-6 py-12 md:py-16 flex items-center">
        <div className="mx-auto max-w-md w-full">
          <div className="text-center mb-8">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60">
              Free 14-day trial
            </p>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
              Start your <span className="italic-sage">first training.</span>
            </h1>
            <p className="mt-3 text-sm text-ink/60">
              No card required. Cancel anytime.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-ink/10 shadow-card p-6 md:p-8">
            <SignupForm />
          </div>
          <p className="mt-6 text-center text-sm text-ink/60">
            Already have an account?{' '}
            <Link href="/admin/login" className="text-ink underline underline-offset-2 hover:text-sage">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
