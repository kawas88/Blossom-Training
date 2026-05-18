'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { AdminSession } from '@/lib/types'

export function ProfileTab({ currentUser }: { currentUser: AdminSession }) {
  const router = useRouter()
  const [name, setName] = useState(currentUser.name)
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwErr, setPwErr] = useState<string | null>(null)

  const [signOutBusy, setSignOutBusy] = useState(false)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (savingName) return
    setSavingName(true)
    setNameMsg(null)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setNameMsg('Saved')
      router.refresh()
    } catch (e: unknown) {
      setNameMsg(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSavingName(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (savingPw) return
    setPwErr(null)
    setPwMsg(null)
    if (newPw.length < 8) {
      setPwErr('Password must be at least 8 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setPwErr('Passwords don\'t match.')
      return
    }
    setSavingPw(true)
    try {
      const res = await fetch('/api/admin/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPw,
          new_password: newPw,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not change password')
      setPwMsg('Password updated')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (e: unknown) {
      setPwErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSavingPw(false)
    }
  }

  async function signOutAll() {
    if (signOutBusy) return
    if (!confirm('Sign out everywhere? You\'ll need to log in again on this device too.'))
      return
    setSignOutBusy(true)
    try {
      await fetch('/api/admin/profile/sign-out-all', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } finally {
      setSignOutBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <form
        onSubmit={saveName}
        className="rounded-2xl bg-white border border-ink/10 p-6 space-y-4"
      >
        <h3 className="font-serif text-lg tracking-tightish text-ink">
          Your details
        </h3>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <code className="block rounded-xl bg-cream border border-ink/15 px-3 py-2 font-mono text-sm text-ink/70">
            {currentUser.email}
          </code>
          <p className="mt-1 text-xs text-ink/50">
            Email changes coming soon. Contact support if you need this now.
          </p>
        </div>
        {nameMsg && (
          <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-2.5 text-sm text-success">
            {nameMsg}
          </div>
        )}
        <Button type="submit" disabled={savingName || !name.trim()}>
          {savingName ? 'Saving…' : 'Save'}
        </Button>
      </form>

      <form
        onSubmit={changePassword}
        className="rounded-2xl bg-white border border-ink/10 p-6 space-y-4"
      >
        <h3 className="font-serif text-lg tracking-tightish text-ink">
          Change password
        </h3>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          required
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          minLength={8}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          minLength={8}
          required
        />
        {pwErr && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
            {pwErr}
          </div>
        )}
        {pwMsg && (
          <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-2.5 text-sm text-success">
            {pwMsg}
          </div>
        )}
        <Button type="submit" disabled={savingPw}>
          {savingPw ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <div className="rounded-2xl border border-ink/10 bg-white p-6 space-y-3">
        <h3 className="font-serif text-lg tracking-tightish text-ink">
          Sign out everywhere
        </h3>
        <p className="text-sm text-ink/70">
          Sign out of every device and browser using your account. Useful if you&rsquo;ve lost a device.
        </p>
        <Button variant="secondary" onClick={signOutAll} disabled={signOutBusy}>
          {signOutBusy ? 'Signing out…' : 'Sign out from all sessions'}
        </Button>
      </div>
    </div>
  )
}
