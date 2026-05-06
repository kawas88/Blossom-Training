'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Props = {
  trainingId: string
  slug: string
}

export function JoinForm({ trainingId, slug }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(displayName: string | null) {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/participants/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training_id: trainingId, display_name: displayName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not join — please try again.')
      }
      router.push(`/participant/${slug}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(name.trim() || null)
      }}
      className="space-y-4"
    >
      <Input
        label="Your name (optional)"
        name="display_name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        autoFocus
        placeholder="e.g. Aisha"
        hint="Leave blank to stay anonymous."
      />
      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={submitting} className="flex-1">
          Continue
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={() => submit(null)}
          className="flex-1"
        >
          Continue anonymously
        </Button>
      </div>
    </form>
  )
}
