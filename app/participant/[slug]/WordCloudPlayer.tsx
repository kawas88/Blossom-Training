'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Plus } from 'lucide-react'
import type { Exercise, WordCloudConfig } from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { Button } from '@/components/ui/Button'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: WordCloudConfig }
  onComplete: () => void
  /** If true, this is a trainer-paced session — don't auto-advance after submit. */
  hold?: boolean
}

export function WordCloudPlayer({
  training,
  participant,
  exercise,
  onComplete,
  hold = false,
}: Props) {
  const config = exercise.config
  const allowMultiple = !!config.allowMultiple

  const [inputs, setInputs] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function updateInput(i: number, value: string) {
    setInputs((s) => s.map((v, idx) => (idx === i ? value : v)))
  }

  function addInput() {
    if (!allowMultiple) return
    setInputs((s) => [...s, ''])
  }

  const canSubmit = inputs.some((v) => v.trim().length > 0) && !submitting

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    const words = inputs.map((v) => v.trim()).filter(Boolean)
    try {
      const res = await fetch('/api/exercises/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: training.id,
          exerciseId: exercise.id,
          participantId: participant.id,
          response: { words },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save your word.')
      }
      setSubmitting(false)
      setSaved(words)
      // Self-paced: auto-advance after a brief celebration.
      // Trainer-paced (hold=true): stay on the confirmation screen until the
      // trainer advances everyone.
      if (!hold) {
        window.setTimeout(() => onComplete(), 1500)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (saved) {
    return (
      <div className="px-4 md:px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage/15">
            <Sparkles className="h-10 w-10 text-sage" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
            Thanks — your {saved.length === 1 ? 'word is' : 'words are'} in the{' '}
            <span className="italic-sage">cloud.</span>
          </h2>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {saved.map((w) => (
              <span
                key={w}
                className="inline-flex items-center rounded-full bg-sage/15 text-sage px-4 py-2 font-serif text-lg tracking-tightish"
              >
                {w}
              </span>
            ))}
          </div>
          {hold && (
            <p className="mt-6 text-sm text-ink/60">
              The trainer will move us on when everyone&rsquo;s ready.
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-24">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Word cloud
        </p>
        <h1 className="mt-1 font-serif text-3xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          {exercise.title}
        </h1>

        <div className="mt-8 rounded-2xl bg-white border border-ink/10 p-6">
          <p className="font-serif text-xl tracking-tightish text-ink leading-snug text-balance">
            {config.prompt}
          </p>
          <div className="mt-4 space-y-2">
            {inputs.map((value, i) => (
              <input
                key={i}
                type="text"
                value={value}
                onChange={(e) => updateInput(i, e.target.value)}
                maxLength={Math.max(5, Math.min(100, config.maxLength || 30))}
                placeholder={i === 0 ? 'Type a word…' : 'Another word…'}
                className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20 transition-all"
                autoFocus={i === 0}
              />
            ))}
            {allowMultiple && inputs.length < 5 && (
              <button
                type="button"
                onClick={addInput}
                className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another word
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button size="lg" onClick={submit} disabled={!canSubmit}>
            {submitting
              ? 'Sending…'
              : allowMultiple
              ? 'Add to the cloud →'
              : 'Submit →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
