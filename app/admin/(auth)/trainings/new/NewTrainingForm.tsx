'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'

type Props = {
  icebreakers: { id: string; title: string; format: string }[]
  surveys: { id: string; title: string }[]
}

export function NewTrainingForm({ icebreakers, surveys }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [nurseryName, setNurseryName] = useState('')
  const [trainerName, setTrainerName] = useState('')
  const [description, setDescription] = useState('')
  const [icebreakerId, setIcebreakerId] = useState(icebreakers[0]?.id || '')
  const [surveyId, setSurveyId] = useState(surveys[0]?.id || '')
  const [scheduledAt, setScheduledAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          nursery_name: nurseryName || null,
          trainer_name: trainerName || null,
          description: description || null,
          icebreaker_id: icebreakerId || null,
          survey_id: surveyId || null,
          scheduled_at: scheduledAt || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create training.')
      router.push(`/admin/trainings/${data.training.id}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white border border-ink/10 p-6 md:p-8 space-y-5"
    >
      <Input
        label="Training title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. ASQ-3 Annual Reflection"
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <Input
          label="Organization"
          value={nurseryName}
          onChange={(e) => setNurseryName(e.target.value)}
          placeholder="e.g. Acme Co. or Sunflower Nursery"
        />
        <Input
          label="Trainer name"
          value={trainerName}
          onChange={(e) => setTrainerName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="A short summary visible on the join page."
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <Select
          label="Warm-up activity (optional)"
          hint="A matching game or quick prompts to start the session."
          value={icebreakerId}
          onChange={(e) => setIcebreakerId(e.target.value)}
        >
          <option value="">— None —</option>
          {icebreakers.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title} ({i.format})
            </option>
          ))}
        </Select>
        <Select
          label="Feedback form (optional)"
          hint="Questions participants answer after the session."
          value={surveyId}
          onChange={(e) => setSurveyId(e.target.value)}
        >
          <option value="">— None —</option>
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Scheduled (optional)"
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
      />
      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Creating…' : 'Create training'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
