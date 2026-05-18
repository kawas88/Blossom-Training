import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { getActiveWorkspace } from '@/lib/workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsClient } from './SettingsClient'
import type { WorkspaceInvite, WorkspaceMember, AdminUser } from '@/lib/types'

export const dynamic = 'force-dynamic'

type SearchParams = { tab?: string }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  const active = await getActiveWorkspace()
  if (!active) redirect('/admin')

  const supabase = createAdminClient()
  const [{ data: rawMembers }, { data: rawInvites }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('id, role, joined_at, user_id, admin_users!inner(id, name, email)')
      .eq('workspace_id', active.workspace.id)
      .order('joined_at', { ascending: true }),
    supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', active.workspace.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  type MemberRow = WorkspaceMember & {
    admin_users: Pick<AdminUser, 'id' | 'name' | 'email'>
  }
  const members = (rawMembers ?? []).map((m) => {
    const r = m as unknown as MemberRow
    const u = Array.isArray(r.admin_users) ? r.admin_users[0] : r.admin_users
    return {
      id: r.id,
      role: r.role,
      joined_at: r.joined_at,
      user_id: r.user_id,
      name: u?.name ?? '',
      email: u?.email ?? '',
    }
  })

  return (
    <SettingsClient
      currentUser={session}
      workspace={active.workspace}
      role={active.role}
      members={members}
      invites={(rawInvites ?? []) as WorkspaceInvite[]}
      initialTab={searchParams.tab || 'general'}
    />
  )
}
