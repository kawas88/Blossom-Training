'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus } from 'lucide-react'
import type { Exercise, WordCloudConfig } from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import { Button } from '@/components/ui/Button'

type Props = {
  training: Training
  participant: Participant
  exercise: Exercise & { config: WordCloudConfig }
  onComplete: () => void
  /** Trainer-paced sessions: hold on the cumulative screen until the trainer advances. */
  hold?: boolean
}

type SubmitResponse = {
  ok: boolean
  words?: string[]
  maxWords?: number
  atLimit?: boolean
  error?: string
  message?: string
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
  const maxWords = allowMultiple
    ? Math.max(1, Math.min(10, Number(config.maxWordsPerParticipant) || 3))
    : 1

  const [submitted, setSubmitted] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [atLimit, setAtLimit] = useState(false)

  const remaining = Math.max(0, maxWords - submitted.length)
  const canSubmit = draft.trim().length > 0 && !submitting && !atLimit

  async function submit() {
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
          response: { words: [draft.trim()] },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as SubmitResponse
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Could not save your word.')
      }
      if (data.error === 'max_words') {
        setSubmitted(data.words ?? submitted)
        setAtLimit(true)
        return
      }
      if (data.error === 'already_responded') {
        // Single-word mode duplicate; treat as success
        setSubmitted((s) => (s.length > 0 ? s : [draft.trim()]))
        setAtLimit(true)
      } else {
        setSubmitted(data.words ?? [draft.trim()])
        setAtLimit(!!data.atLimit)
      }
      setDraft('')

      // Self-paced flow: if this submission filled the quota (or single-word
      // mode), auto-advance back to the hub after a beat. Trainer-paced
      // (hold=true) stays here regardless until the trainer advances.
      const willHold = hold
      const justFilled = data.atLimit === true || !allowMultiple
      if (justFilled && !willHold) {
        window.setTimeout(() => onComplete(), 1500)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function done() {
    if (hold) return
    onComplete()
  }

  // Once they've sent at least one word, show the celebration screen with
  // cumulative chips and an "add another" input (or "done" button).
  if (submitted.length > 0) {
    return (
      <div className="px-4 md:px-6 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sage/15">
            <Sparkles className="h-8 w-8 text-sage" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
            {atLimit
              ? 'All your words are in the '
              : 'Thanks — your word is in the '}
            <span className="italic-sage">cloud.</span>
          </h2>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <AnimatePresence>
              {submitted.map((w) => (
                <motion.span
                  key={w}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center rounded-full bg-sage/15 text-sage px-4 py-2 font-serif text-lg tracking-tightish"
                >
                  {w}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {allowMultiple && (
            <p className="mt-4 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              {submitted.length} of {maxWords} submitted
            </p>
          )}

          {!atLimit && allowMultiple && remaining > 0 && (
            <div className="mt-7 rounded-2xl bg-white border border-ink/10 p-4 md:p-5 text-left">
              <label className="block text-sm font-medium text-ink mb-2">
                Add another word
              </label>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submit()
                  }
                }}
                maxLength={Math.max(5, Math.min(100, config.maxLength || 30))}
                placeholder={`${remaining} more allowed…`}
                className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20 transition-all"
              />
              {error && (
                <p className="mt-2 text-xs text-error">{error}</p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <Button onClick={submit} disabled={!canSubmit}>
                  {submitting ? 'Sending…' : 'Add to the cloud →'}
                </Button>
                {!hold && (
                  <button
                    type="button"
                    onClick={done}
                    className="text-sm text-ink/60 hover:text-ink underline underline-offset-2"
                  >
                    I&rsquo;m done
                  </button>
                )}
              </div>
            </div>
          )}

          {hold && (
            <p className="mt-6 text-sm text-ink/60">
              The trainer will move us on when everyone&rsquo;s ready.
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  // First-submit form
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
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            maxLength={Math.max(5, Math.min(100, config.maxLength || 30))}
            placeholder="Type a word…"
            className="mt-4 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/20 transition-all"
            autoFocus
          />
          {allowMultiple && (
            <p className="mt-2 text-xs text-ink/55">
              You can share up to {maxWords} word{maxWords === 1 ? '' : 's'} —
              add them one at a time.
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button size="lg" onClick={submit} disabled={!canSubmit}>
            {submitting ? 'Sending…' : 'Submit →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
