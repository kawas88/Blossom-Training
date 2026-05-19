import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  Layers,
} from 'lucide-react'
import { getAdminSession } from '@/lib/auth'
import { getActiveWorkspace, getUserWorkspaces } from '@/lib/workspace'
import { getBillingState } from '@/lib/billing-state'
import { BillingBanner } from '@/components/billing/BillingBanner'
import { Logo } from '@/components/Logo'
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
    <div className="min-h-screen flex flex-col md:flex-row bg-blush">
      {/* Mobile top bar — deep purple for parity with desktop sidebar */}
      <header className="md:hidden sticky top-0 z-30 bg-deep text-white border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/admin">
          <Logo variant="light" height={24} />
        </Link>
        <LogoutButton compact />
      </header>

      {/* Mobile nav strip — deep purple */}
      <nav className="md:hidden border-b border-white/10 bg-deep sticky top-[57px] z-20">
        <div className="flex overflow-x-auto px-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:text-white whitespace-nowrap"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop sidebar — deep purple per brand spec */}
      <aside className="hidden md:flex md:w-64 md:fixed md:inset-y-0 md:left-0 flex-col bg-deep text-white">
        <div className="px-5 pt-6 pb-4">
          <Link href="/admin" className="block mb-5">
            <Logo variant="light" height={28} />
          </Link>
          <WorkspaceSwitcher
            active={active.workspace}
            memberships={memberships}
          />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/75 hover:text-white hover:bg-white/10 transition-colors"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-white/10">
          <div className="text-sm font-semibold text-white truncate">{session.name}</div>
          <div className="text-xs text-white/55 truncate">{session.email}</div>
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
    <div className="mt-3 rounded-xl bg-wisteria/20 border border-wisteria/40 px-3 py-2 text-xs">
      <p className="font-semibold text-wisteria">Trial</p>
      <p className="text-white/70">
        {days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`}
      </p>
    </div>
  )
}
