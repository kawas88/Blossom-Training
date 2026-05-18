'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import type {
  AdminSession,
  BillingCurrency,
  Workspace,
  WorkspaceInvite,
  WorkspaceRole,
} from '@/lib/types'
import { GeneralTab } from './GeneralTab'
import { MembersTab, type MemberRow } from './MembersTab'
import { BillingTab } from './BillingTab'
import { ProfileTab } from './ProfileTab'

type Props = {
  currentUser: AdminSession
  workspace: Workspace
  role: WorkspaceRole
  members: MemberRow[]
  invites: WorkspaceInvite[]
  defaultCurrency: BillingCurrency
  initialTab: string
}

export function SettingsClient({
  currentUser,
  workspace,
  role,
  members,
  invites,
  defaultCurrency,
  initialTab,
}: Props) {
  const allowed = ['general', 'members', 'billing', 'profile']
  const [tab, setTab] = useState(
    allowed.includes(initialTab) ? initialTab : 'general',
  )

  const tabs = [
    { value: 'general', label: 'General' },
    { value: 'members', label: 'Members', count: members.length },
    { value: 'billing', label: 'Billing' },
    { value: 'profile', label: 'Profile' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Settings
        </p>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl tracking-tightish text-ink">
          {workspace.name}<span className="italic-sage">.</span>
        </h1>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'general' && <GeneralTab workspace={workspace} role={role} />}
      {tab === 'members' && (
        <MembersTab
          workspace={workspace}
          role={role}
          members={members}
          invites={invites}
          currentUserId={currentUser.user_id}
        />
      )}
      {tab === 'billing' && (
        <BillingTab
          workspace={workspace}
          defaultCurrency={defaultCurrency}
          memberCount={members.length}
        />
      )}
      {tab === 'profile' && <ProfileTab currentUser={currentUser} />}
    </div>
  )
}
