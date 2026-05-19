import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { Decoration } from '@/components/ui/Decoration'
import { Logo } from '@/components/Logo'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')

  return (
    <main className="relative min-h-screen flex flex-col bg-blush text-deep overflow-hidden">
      <Decoration />
      <header className="relative z-10 px-6 md:px-10 pt-8">
        <Link href="/">
          <Logo height={28} />
        </Link>
      </header>
      <div className="relative z-10 flex-1 px-6 py-16 flex items-center">
        <div className="mx-auto max-w-md w-full">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-wisteria/15 text-wisteria px-4 py-1.5 text-xs font-semibold tracking-eyebrow uppercase">
              Trainer area
            </span>
            <h1 className="mt-5 font-serif text-4xl font-extrabold tracking-tightish text-deep">
              Welcome <span className="italic-wisteria">back.</span>
            </h1>
          </div>
          <div className="rounded-3xl bg-white border-[1.5px] border-line shadow-card p-6 md:p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  )
}
