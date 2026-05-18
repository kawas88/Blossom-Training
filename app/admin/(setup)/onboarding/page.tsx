import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { getActiveWorkspace, getUserWorkspaces } from '@/lib/workspace'
import { OnboardingWizard } from './OnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const memberships = await getUserWorkspaces(session.user_id)
  if (memberships.length === 0) redirect('/admin/no-workspace')

  const active = await getActiveWorkspace()
  if (!active) redirect('/admin')

  // Already onboarded — bounce to dashboard.
  if (active.workspace.onboarded_at) {
    redirect('/admin')
  }

  return (
    <OnboardingWizard
      workspaceId={active.workspace.id}
      initialName={active.workspace.name}
      initialFocus={active.workspace.training_focus ?? []}
      firstName={session.name.split(' ')[0] || session.name}
    />
  )
}
