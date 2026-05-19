import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Sparkles,
  Settings,
  Layers,
} from 'lucide-react'
import { getAdminSession } from '@/lib/auth'
import { getActiveWorkspace, getUserWorkspaces } from '@/lib/workspace'
import { getBillingState } from '@/lib/billing-state'
import { BillingBanner } from '@/components/billing/BillingBanner'
import { LogoutButton } from './LogoutButton'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/trainings', label: 'Trainings', icon: Users },
  { href: '/admin/exercises', label: 'Exercises', icon: Layers },
  { href: '/admin/surveys', label: 'Surveys', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]
// Note: "Icebreakers" (/admin/icebreakers) is intentionally omitted from
// the sidebar — its functionality is folded into Exercises in Phase 3A.
// The legacy route still resolves for any bookmarked URLs.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const memberships = await getUserWorkspaces(session.user_id)
  if (memberships.length === 0) {
    redirect('/admin/no-workspace')
  }

  const active = await getActiveWorkspace()
  if (!active) {
    redirect('/admin')
  }

  // First-run setup not finished — bounce to onboarding.
  if (!active.workspace.onboarded_at) {
    redirect('/admin/onboarding')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-ink/10 px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-mono text-xs tracking-[0.2em] uppercase text-ink flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-sage" />
          Trainzy
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
        <div className="px-5 pt-6 pb-4">
          <Link href="/admin" className="flex items-center gap-2 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-cream">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="font-serif text-xl tracking-tightish text-ink">
              Trainzy
            </span>
          </Link>
          <WorkspaceSwitcher
            active={active.workspace}
            memberships={memberships}
          />
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
          {active.workspace.plan === 'trial' && active.workspace.trial_ends_at && (
            <TrialBadge endsAt={active.workspace.trial_ends_at} />
          )}
          <LogoutButton className="mt-3 w-full" />
        </div>
      </aside>

      <main className="flex-1 md:ml-64 px-4 md:px-10 py-6 md:py-10">
        <div className="mx-auto max-w-6xl">
          <BillingBanner
            state={getBillingState(active.workspace)}
            workspaceId={active.workspace.id}
          />
          {children}
        </div>
      </main>
    </div>
  )
}

function TrialBadge({ endsAt }: { endsAt: string }) {
  const days = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000))
  return (
    <div className="mt-3 rounded-xl bg-sage/10 border border-sage/20 px-3 py-2 text-xs">
      <p className="font-medium text-sage">Trial</p>
      <p className="text-ink/70">
        {days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`}
      </p>
    </div>
  )
}
