'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Props = {
  defaultName: string
}

export function CreateWorkspaceForm({ defaultName }: Props) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create workspace.')
      router.push('/admin/onboarding')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-ink/10 p-6 space-y-4">
      <Input
        label="Workspace name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        required
        autoFocus
      />
      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create workspace'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin')}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
