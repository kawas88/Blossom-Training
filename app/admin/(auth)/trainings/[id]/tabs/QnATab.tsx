'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, EyeOff, Eye, RotateCcw, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TrainingQuestion } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

type Props = {
  trainingId: string
}

type Filter = 'pending' | 'answered' | 'hidden' | 'all'

// Trainer-side moderation pane for the Live Q&A. Lists questions, sorts
// by upvotes within group, and lets the trainer mark-answered/hide.
// Realtime: subscribes to the same training_questions table the
// participants do, so new questions and upvote changes land instantly.
export function QnATab({ trainingId }: Props) {
  const [questions, setQuestions] = useState<TrainingQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from('training_questions')
        .select('*')
        .eq('training_id', trainingId)
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: true })
      if (cancelled) return
      setQuestions((data ?? []) as TrainingQuestion[])
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel(`admin-qna-${trainingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_questions' },
        (payload) => {
          const row = (payload.new ?? payload.old) as TrainingQuestion | null
          if (row?.training_id !== trainingId) return
          if (payload.eventType === 'DELETE') {
            setQuestions((cur) => cur.filter((q) => q.id !== row.id))
            return
          }
          const next = payload.new as TrainingQuestion
          setQuestions((cur) => {
            const exists = cur.find((q) => q.id === next.id)
            const merged = exists
              ? cur.map((q) => (q.id === next.id ? next : q))
              : [...cur, next]
            return sort(merged)
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [trainingId])

  const filtered = useMemo(() => {
    if (filter === 'all') return questions
    return questions.filter((q) => q.status === filter)
  }, [questions, filter])

  async function moderate(
    q: TrainingQuestion,
    action: 'mark_answered' | 'unmark_answered' | 'hide' | 'unhide',
  ) {
    setBusyId(q.id)
    try {
      await fetch(`/api/admin/trainings/${trainingId}/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      // Realtime will reconcile the visual state.
    } finally {
      setBusyId(null)
    }
  }

  const counts = useMemo(
    () => ({
      pending: questions.filter((q) => q.status === 'pending').length,
      answered: questions.filter((q) => q.status === 'answered').length,
      hidden: questions.filter((q) => q.status === 'hidden').length,
      all: questions.length,
    }),
    [questions],
  )

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border-[1.5px] border-line p-12 text-center text-deep/55">
        Loading questions…
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="h-5 w-5" />}
        title="No questions yet"
        description="Participants can ask questions from their phones during the session. They'll appear here in real time."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(['pending', 'answered', 'hidden', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              filter === f
                ? 'bg-deep text-white'
                : 'bg-white border border-line text-deep/70 hover:bg-blush-deep',
            )}
          >
            <span className="capitalize">{f}</span>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px]',
                filter === f ? 'bg-white/20' : 'bg-blush-deep text-deep/70',
              )}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border-[1.5px] border-line p-8 text-center text-deep/55 text-sm">
          No questions in this filter.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((q) => (
            <li
              key={q.id}
              className={cn(
                'rounded-2xl border-[1.5px] p-4 flex items-start gap-4 transition-colors',
                q.status === 'hidden'
                  ? 'bg-pink/5 border-pink/30 opacity-70'
                  : q.status === 'answered'
                  ? 'bg-mint/10 border-mint/30'
                  : 'bg-white border-line',
              )}
            >
              <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-blush-deep">
                <span className="font-serif text-2xl font-extrabold text-deep leading-none">
                  {q.upvotes}
                </span>
                <span className="text-[9px] text-deep/55 font-mono uppercase tracking-eyebrow">
                  votes
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-deep break-words">{q.question}</p>
                <p className="mt-1 text-[10px] text-deep/55 font-mono uppercase tracking-eyebrow">
                  {q.display_name || 'Anonymous'} ·{' '}
                  {new Date(q.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {q.status === 'pending' && (
                  <>
                    <ActionButton
                      onClick={() => moderate(q, 'mark_answered')}
                      disabled={busyId === q.id}
                      label="Answered"
                      icon={<Check className="h-3.5 w-3.5" />}
                      tone="mint"
                    />
                    <ActionButton
                      onClick={() => moderate(q, 'hide')}
                      disabled={busyId === q.id}
                      label="Hide"
                      icon={<EyeOff className="h-3.5 w-3.5" />}
                      tone="muted"
                    />
                  </>
                )}
                {q.status === 'answered' && (
                  <ActionButton
                    onClick={() => moderate(q, 'unmark_answered')}
                    disabled={busyId === q.id}
                    label="Reopen"
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    tone="muted"
                  />
                )}
                {q.status === 'hidden' && (
                  <ActionButton
                    onClick={() => moderate(q, 'unhide')}
                    disabled={busyId === q.id}
                    label="Restore"
                    icon={<Eye className="h-3.5 w-3.5" />}
                    tone="muted"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  label,
  icon,
  tone,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  icon: React.ReactNode
  tone: 'mint' | 'muted'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
        tone === 'mint'
          ? 'bg-mint text-deep hover:bg-mint/80'
          : 'bg-white border border-line text-deep/70 hover:bg-blush-deep',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function sort(list: TrainingQuestion[]): TrainingQuestion[] {
  return [...list].sort((a, b) => {
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}
