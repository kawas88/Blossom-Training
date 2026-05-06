import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Sparkles,
} from 'lucide-react'
import { getAdminSession } from '@/lib/auth'
import { LogoutButton } from './LogoutButton'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/trainings', label: 'Trainings', icon: Users },
  { href: '/admin/icebreakers', label: 'Icebreakers', icon: Sparkles },
  { href: '/admin/surveys', label: 'Surveys', icon: ClipboardList },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-ink/10 px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-mono text-xs tracking-[0.2em] uppercase text-ink">
          NTH · Admin
        </Link>
        <LogoutButton compact />
      </header>

      {/* Mobile nav strip */}
      <nav className="md:hidden border-b border-ink/10 bg-cream/95 backdrop-blur-md sticky top-[49px] z-20">
        <div className="flex overflow-x-auto px-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink/70 hover:text-ink whitespace-nowrap"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:fixed md:inset-y-0 md:left-0 flex-col border-r border-ink/10 bg-cream/80 backdrop-blur-md">
        <div className="px-6 pt-7 pb-6">
          <Link href="/admin" className="block">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink/60">
              Nursery Trainer Hub
            </div>
            <div className="mt-1 font-serif text-xl tracking-tightish text-ink">
              Trainer studio
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/80 hover:text-ink hover:bg-sand/40 transition-colors"
            >
              <n.icon className="h-4 w-4 text-ink/60" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-ink/10">
          <div className="text-sm font-medium text-ink truncate">{session.name}</div>
          <div className="text-xs text-ink/50 truncate">{session.email}</div>
          <LogoutButton className="mt-3 w-full" />
        </div>
      </aside>

      <main className="flex-1 md:ml-64 px-4 md:px-10 py-6 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
