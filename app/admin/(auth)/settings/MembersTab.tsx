'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Trash2, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Pill } from '@/components/ui/Pill'
import {
  roleAtLeast,
  type Workspace,
  type WorkspaceInvite,
  type WorkspaceRole,
} from '@/lib/types'
import { formatDate } from '@/lib/utils'

export type MemberRow = {
  id: string
  user_id: string
  role: WorkspaceRole
  name: string
  email: string
  joined_at: string
}

type Props = {
  workspace: Workspace
  role: WorkspaceRole
  members: MemberRow[]
  invites: WorkspaceInvite[]
  currentUserId: string
}

export function MembersTab({
  workspace,
  role,
  members,
  invites,
  currentUserId,
}: Props) {
  const router = useRouter()
  const canManage = roleAtLeast(role, 'admin')

  const seatsUsed = members.length + invites.length
  const seatsLeft = Math.max(0, workspace.seat_limit - seatsUsed)
  const seatLimitReached = seatsLeft === 0

  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'trainer' | 'viewer'>(
    'trainer',
  )
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Inline confirm state — rather than the jarring browser confirm() dialog
  // we toggle a tiny "Really remove? Yes / Cancel" strip on the row itself.
  // Friendlier on mobile and accessible to screen readers.
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          email: email.toLowerCase().trim(),
          role: inviteRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send invite')
      setEmail('')
      setShowForm(false)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeMember(memberId: string) {
    setBusyId(memberId)
    try {
      const res = await fetch(`/api/admin/invites/members/${memberId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPendingRemove(null)
        router.refresh()
      }
    } finally {
      setBusyId(null)
    }
  }

  async function revokeInvite(inviteId: string) {
    setBusyId(inviteId)
    try {
      const res = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPendingRevoke(null)
        router.refresh()
      }
    } finally {
      setBusyId(null)
    }
  }

  async function resendInvite(inviteId: string) {
    const res = await fetch(`/api/admin/invites/${inviteId}/resend`, {
      method: 'POST',
    })
    if (res.ok) router.refresh()
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-ink/10 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-serif text-xl tracking-tightish text-ink">
              Seats
            </h3>
            <p className="text-sm text-ink/60">
              {seatsUsed} of {workspace.seat_limit}{' '}
              {workspace.seat_limit === 1 ? 'seat' : 'seats'} used
              {seatLimitReached && workspace.plan !== 'organization' && (
                <>
                  {' '}
                  &middot; <span className="text-warn">Upgrade to Organization for up to 10 seats.</span>
                </>
              )}
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => setShowForm((s) => !s)}
              disabled={seatLimitReached}
              title={
                seatLimitReached
                  ? 'You\'ve reached your seat limit. Upgrade to add more.'
                  : undefined
              }
            >
              <Plus className="h-4 w-4" />
              Invite teammate
            </Button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={sendInvite}
            className="mt-5 grid sm:grid-cols-[1fr_180px_auto] gap-2 items-end"
          >
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as 'admin' | 'trainer' | 'viewer')
              }
            >
              <option value="admin">Admin</option>
              <option value="trainer">Trainer</option>
              <option value="viewer">Viewer</option>
            </Select>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send invite'}
            </Button>
          </form>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/10">
          <h3 className="font-serif text-lg tracking-tightish text-ink">Members</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand/30 text-left text-xs font-mono uppercase tracking-wider text-ink/60">
              <tr>
                <th className="px-5 py-2.5">Name</th>
                <th className="px-5 py-2.5">Email</th>
                <th className="px-5 py-2.5">Role</th>
                <th className="px-5 py-2.5">Joined</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3 font-medium text-ink">{m.name}</td>
                  <td className="px-5 py-3 text-ink/60">{m.email}</td>
                  <td className="px-5 py-3">
                    <Pill variant={m.role === 'owner' ? 'sage' : 'default'}>{m.role}</Pill>
                  </td>
                  <td className="px-5 py-3 text-ink/60">{formatDate(m.joined_at)}</td>
                  <td className="px-5 py-3 text-right">
                    {canManage &&
                      m.role !== 'owner' &&
                      m.user_id !== currentUserId &&
                      (pendingRemove === m.id ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="text-deep/70">Remove?</span>
                          <button
                            onClick={() => removeMember(m.id)}
                            disabled={busyId === m.id}
                            className="rounded-full bg-pink text-white px-2.5 py-1 font-semibold hover:bg-pink/90 disabled:opacity-60"
                          >
                            {busyId === m.id ? '…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setPendingRemove(null)}
                            disabled={busyId === m.id}
                            className="rounded-full border border-line px-2.5 py-1 text-deep/70 hover:bg-blush-deep"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setPendingRemove(m.id)}
                          className="text-deep/40 hover:text-pink"
                          aria-label="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink/10">
            <h3 className="font-serif text-lg tracking-tightish text-ink">
              Pending invites
            </h3>
          </div>
          <ul className="divide-y divide-ink/5">
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at).getTime() < Date.now()
              return (
                <li
                  key={inv.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{inv.email}</p>
                    <p className="text-xs text-ink/50">
                      {inv.role} · sent {formatDate(inv.created_at)} ·{' '}
                      {expired ? (
                        <span className="text-error">expired</span>
                      ) : (
                        <>expires {formatDate(inv.expires_at)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(inv.invite_token)}
                      className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink/70 hover:bg-sand/40"
                    >
                      {copiedToken === inv.invite_token ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy link
                        </>
                      )}
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => resendInvite(inv.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink/70 hover:bg-sand/40"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Resend
                        </button>
                        {pendingRevoke === inv.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <button
                              onClick={() => revokeInvite(inv.id)}
                              disabled={busyId === inv.id}
                              className="rounded-full bg-pink text-white px-2.5 py-1 font-semibold hover:bg-pink/90 disabled:opacity-60"
                            >
                              {busyId === inv.id ? '…' : 'Confirm revoke'}
                            </button>
                            <button
                              onClick={() => setPendingRevoke(null)}
                              disabled={busyId === inv.id}
                              className="rounded-full border border-line px-2.5 py-1 text-deep/70 hover:bg-blush-deep"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setPendingRevoke(inv.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs text-deep/70 hover:bg-blush-deep"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Revoke
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
