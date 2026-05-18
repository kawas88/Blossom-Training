import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { Decoration } from '@/components/ui/Decoration'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')

  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />
      <header className="px-6 md:px-10 pt-8">
        <Link href="/" className="font-mono text-xs tracking-wider uppercase text-ink/70">
          ← Trainzy
        </Link>
      </header>
      <div className="flex-1 px-6 py-16 flex items-center">
        <div className="mx-auto max-w-md w-full">
          <div className="text-center mb-8">
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60">
              Trainer area
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tightish text-ink">
              Welcome <span className="italic-sage">back.</span>
            </h1>
          </div>
          <div className="rounded-2xl bg-white border border-ink/10 shadow-card p-6 md:p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  )
}
