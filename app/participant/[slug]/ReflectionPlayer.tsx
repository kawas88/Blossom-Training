'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import type { Exercise, ReflectionConfig } from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { Button } from '@/components/ui/Button'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: ReflectionConfig }
  onComplete: () => void
}

export function ReflectionPlayer({
  training,
  participant,
  exercise,
  onComplete,
}: Props) {
  const config = exercise.config
  const minLength = config.minLength ?? 0

  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const length = text.trim().length
  const canSubmit = length >= minLength

  async function submit() {
    if (submitting || saved) return
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/exercises/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: training.id,
          exerciseId: exercise.id,
          participantId: participant.id,
          response: { text: text.trim() },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save reflection.')
      }
      setSubmitting(false)
      setSaved(true)
      window.setTimeout(() => onComplete(), 1500)
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
            <Heart className="h-10 w-10 fill-sage text-sage" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
            Thanks — your reflection has been <span className="italic-sage">saved.</span>
          </h2>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-8 md:py-12 pb-24">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Reflection
        </p>
        <h1 className="mt-1 font-serif text-3xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          {exercise.title}
        </h1>

        <div className="mt-8 rounded-2xl bg-white border border-ink/10 p-6">
          <p className="font-serif text-xl tracking-tightish text-ink leading-snug text-balance">
            {config.prompt}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="mt-4 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20 transition-all resize-y"
            placeholder="Take your time. Nothing here is right or wrong."
            maxLength={5000}
          />
          {minLength > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-ink/50">
                {canSubmit
                  ? "You're good to go."
                  : 'A little more to go before you can submit.'}
              </span>
              <span className="font-mono text-xs text-ink/60">
                {length} / {minLength}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button
            size="lg"
            onClick={submit}
            disabled={!canSubmit || submitting || saved}
          >
            {saved ? 'Saved ✓' : submitting ? 'Saving…' : 'Submit reflection →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
