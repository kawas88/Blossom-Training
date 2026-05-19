'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ExerciseConfig,
  type ExerciseType,
  type MatchingConfig,
  type QuizConfig,
  type ReflectionConfig,
} from '@/lib/exercises'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { MatchingConfigEditor } from './editors/MatchingConfigEditor'
import { QuizConfigEditor } from './editors/QuizConfigEditor'
import { ReflectionConfigEditor } from './editors/ReflectionConfigEditor'

type Props = {
  mode: 'create' | 'edit'
  type: ExerciseType
  exerciseId?: string
  initial: {
    title: string
    description: string
    config: ExerciseConfig
  }
}

export function ExerciseEditor({ mode, type, exerciseId, initial }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [config, setConfig] = useState<ExerciseConfig>(initial.config)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (submitting) return
    if (!title.trim()) {
      setError('Please give your exercise a title.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const url =
        mode === 'create' ? '/api/admin/exercises' : `/api/admin/exercises/${exerciseId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const body = JSON.stringify({
        type,
        title: title.trim(),
        description: description.trim() || null,
        config,
      })
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save exercise')
      router.push('/admin/exercises')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-ink/10 p-6 space-y-4">
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. ASQ-3 quick check"
          maxLength={120}
        />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="A short summary shown to participants when they tap the activity."
        />
      </div>

      {type === 'matching' && (
        <MatchingConfigEditor
          config={config as MatchingConfig}
          onChange={(next) => setConfig(next)}
        />
      )}
      {type === 'quiz' && (
        <QuizConfigEditor
          config={config as QuizConfig}
          onChange={(next) => setConfig(next)}
        />
      )}
      {type === 'reflection' && (
        <ReflectionConfigEditor
          config={config as ReflectionConfig}
          onChange={(next) => setConfig(next)}
        />
      )}

      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
            ? 'Create exercise'
            : 'Save changes'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push('/admin/exercises')}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
