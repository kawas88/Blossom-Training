'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Props = {
  token: string
  email: string
  workspaceName: string
  signedIn: boolean
}

export function AcceptForm({ token, email, workspaceName, signedIn }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim() || undefined,
          password: password || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not accept invite')
      router.push('/admin')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (signedIn) {
    return (
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink/70">
          You&rsquo;re already signed in as {email}. Tap accept to join {workspaceName}.
        </p>
        {error && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
            {error}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Joining…' : `Accept invite to ${workspaceName}`}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-ink/70">
        Create your Trainzy account to accept this invite. If you already have an
        account with <span className="font-medium">{email}</span>, just sign in below.
      </p>
      <Input label="Email" value={email} disabled />
      <Input
        label="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="(leave blank if you already have an account)"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        minLength={8}
        required
      />
      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? 'Joining…' : `Accept invite to ${workspaceName}`}
      </Button>
    </form>
  )
}
