'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ChevronUp, Loader2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Training, Participant, TrainingQuestion, TrainingQuestionVote } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  participant: Participant
}

// Slido-style live Q&A panel rendered as a collapsible drawer on the
// participant's screen. Participants post questions, upvote others, and
// see the trainer's answered/hidden state in real time.
export function QnAPanel({ training, participant }: Props) {
  const [open, setOpen] = useState(false)
  const [questions, setQuestions] = useState<TrainingQuestion[]>([])
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initial load + realtime subscription.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      const [qRes, vRes] = await Promise.all([
        supabase
          .from('training_questions')
          .select('*')
          .eq('training_id', training.id)
          .neq('status', 'hidden')
          .order('upvotes', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase
          .from('training_question_votes')
          .select('question_id')
          .eq('participant_id', participant.id),
      ])
      if (cancelled) return
      setQuestions((qRes.data ?? []) as TrainingQuestion[])
      setMyVotes(new Set(((vRes.data ?? []) as { question_id: string }[]).map((v) => v.question_id)))
      setLoading(false)
    }
    load()

    const qCh = supabase
      .channel(`pqna-questions-${training.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_questions' },
        (payload) => {
          const row = (payload.new ?? payload.old) as TrainingQuestion | null
          if (row?.training_id !== training.id) return
          if (payload.eventType === 'DELETE') {
            const old = payload.old as TrainingQuestion
            setQuestions((cur) => cur.filter((q) => q.id !== old.id))
            return
          }
          const nextRow = payload.new as TrainingQuestion
          setQuestions((cur) => {
            // Hidden rows shouldn't appear to participants.
            if (nextRow.status === 'hidden') {
              return cur.filter((q) => q.id !== nextRow.id)
            }
            const exists = cur.find((q) => q.id === nextRow.id)
            const merged = exists
              ? cur.map((q) => (q.id === nextRow.id ? nextRow : q))
              : [...cur, nextRow]
            return sortQuestions(merged)
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(qCh)
    }
  }, [training.id, participant.id])

  const pending = useMemo(() => questions.filter((q) => q.status === 'pending'), [questions])
  const answered = useMemo(() => questions.filter((q) => q.status === 'answered'), [questions])

  async function submit() {
    const text = draft.trim()
    if (!text || submitting) return
    if (text.length < 3) {
      setError('Write at least 3 characters.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_id: training.id,
          participant_id: participant.id,
          question: text,
          anonymous,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not post your question.')
      } else {
        setDraft('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleVote(q: TrainingQuestion) {
    const isVoted = myVotes.has(q.id)
    // Optimistic update — realtime will reconcile the canonical count.
    setMyVotes((cur) => {
      const next = new Set(cur)
      if (isVoted) next.delete(q.id)
      else next.add(q.id)
      return next
    })
    setQuestions((cur) =>
      sortQuestions(
        cur.map((row) =>
          row.id === q.id
            ? { ...row, upvotes: Math.max(0, row.upvotes + (isVoted ? -1 : 1)) }
            : row,
        ),
      ),
    )
    await fetch('/api/questions/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: q.id,
        participant_id: participant.id,
        action: isVoted ? 'remove' : 'add',
      }),
    })
  }

  const totalCount = pending.length + answered.length

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Q&A"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-deep text-white px-4 py-3 text-sm font-semibold shadow-card hover:bg-deep/90 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Q&amp;A
        {totalCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-wisteria text-xs font-bold">
            {totalCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-deep/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 max-h-[85vh] flex flex-col rounded-t-3xl bg-white text-deep border-t-[1.5px] border-line shadow-card"
            >
              <header className="px-5 py-4 border-b border-line flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-eyebrow uppercase text-deep/55">
                    Live Q&amp;A
                  </p>
                  <h3 className="font-serif text-xl font-extrabold text-deep">
                    Ask the room
                  </h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-deep/50 hover:text-deep text-sm font-semibold"
                >
                  Close
                </button>
              </header>

              <div className="px-5 py-4 border-b border-line space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="What would you like the trainer to talk about?"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-base text-deep placeholder:text-deep/40 focus:outline-none focus:border-wisteria focus:border-2 focus:px-[15px] focus:py-[11px] resize-y"
                />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-deep/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="h-4 w-4 rounded border-line accent-wisteria"
                    />
                    Post anonymously
                  </label>
                  <span className="text-xs text-deep/45">{draft.length}/500</span>
                </div>
                {error && (
                  <p className="text-xs text-pink">{error}</p>
                )}
                <button
                  onClick={submit}
                  disabled={submitting || draft.trim().length < 3}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-wisteria text-white px-5 py-2.5 text-sm font-semibold hover:bg-wisteria/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {submitting ? 'Posting…' : 'Ask question'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loading && (
                  <p className="text-sm text-deep/50 text-center py-8">Loading questions…</p>
                )}
                {!loading && pending.length === 0 && answered.length === 0 && (
                  <p className="text-sm text-deep/55 text-center py-8">
                    No questions yet. Be the first to ask.
                  </p>
                )}
                {pending.length > 0 && (
                  <Section
                    label={`Pending · ${pending.length}`}
                    questions={pending}
                    myVotes={myVotes}
                    onVote={toggleVote}
                  />
                )}
                {answered.length > 0 && (
                  <Section
                    label={`Answered · ${answered.length}`}
                    questions={answered}
                    myVotes={myVotes}
                    onVote={toggleVote}
                    muted
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Section({
  label,
  questions,
  myVotes,
  onVote,
  muted,
}: {
  label: string
  questions: TrainingQuestion[]
  myVotes: Set<string>
  onVote: (q: TrainingQuestion) => void
  muted?: boolean
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] tracking-eyebrow uppercase text-deep/55">
        {label}
      </p>
      <ul className="space-y-2">
        {questions.map((q) => {
          const voted = myVotes.has(q.id)
          return (
            <li
              key={q.id}
              className={cn(
                'rounded-2xl border-[1.5px] border-line p-3 flex items-start gap-3',
                muted ? 'bg-mint/10' : 'bg-white',
              )}
            >
              <button
                onClick={() => onVote(q)}
                className={cn(
                  'shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors',
                  voted
                    ? 'bg-wisteria text-white'
                    : 'bg-blush-deep text-deep hover:bg-blush-deep/80',
                )}
                aria-pressed={voted}
              >
                <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                <span className="text-xs font-bold leading-tight">{q.upvotes}</span>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-deep break-words">{q.question}</p>
                <p className="mt-1 text-[10px] text-deep/55 font-mono uppercase tracking-eyebrow">
                  {q.display_name || 'Anonymous'}
                  {muted && ' · Answered'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function sortQuestions(list: TrainingQuestion[]): TrainingQuestion[] {
  return [...list].sort((a, b) => {
    // pending before answered
    const orderA = a.status === 'pending' ? 0 : 1
    const orderB = b.status === 'pending' ? 0 : 1
    if (orderA !== orderB) return orderA - orderB
    // higher upvotes first
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
    // older first within the same upvote count
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}
