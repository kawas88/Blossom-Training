'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  RotateCcw,
  Square,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  EXERCISE_TYPE_LABELS,
  type Exercise,
  type ExerciseResponse,
  type QuizConfig,
  type QuizResponseShape,
  type ReflectionResponseShape,
  type TrainingExerciseWithDef,
  type WordCloudResponseShape,
} from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import type { TrainingSession } from '@/lib/sessions'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { WordCloud, aggregateWords } from '@/components/WordCloud'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  trainingExercises: TrainingExerciseWithDef[]
  initialSession: TrainingSession
  initialParticipants: Participant[]
  initialResponses: ExerciseResponse[]
}

export function LiveCockpit({
  training,
  trainingExercises,
  initialSession,
  initialParticipants,
  initialResponses,
}: Props) {
  const router = useRouter()
  const [session, setSession] = useState<TrainingSession>(initialSession)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [responses, setResponses] = useState<ExerciseResponse[]>(initialResponses)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const driven = useMemo(
    () =>
      trainingExercises
        .filter((e) => e.pacing === 'trainer')
        .sort((a, b) => a.position - b.position),
    [trainingExercises],
  )

  const currentIndex = useMemo(() => {
    if (!session.current_exercise_id) return -1
    return driven.findIndex((e) => e.id === session.current_exercise_id)
  }, [session.current_exercise_id, driven])
  const currentExercise = currentIndex >= 0 ? driven[currentIndex] : null

  // Realtime: subscribe to session row + participants + responses.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`live-cockpit:${training.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_sessions',
          filter: `training_id=eq.${training.id}`,
        },
        (payload) => {
          const next = payload.new as TrainingSession | null
          if (next && next.id) setSession(next)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `training_id=eq.${training.id}`,
        },
        (payload) => {
          const p = payload.new as Participant
          setParticipants((cur) => (cur.find((x) => x.id === p.id) ? cur : [...cur, p]))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exercise_responses',
          filter: `training_id=eq.${training.id}`,
        },
        (payload) => {
          const r = payload.new as ExerciseResponse
          setResponses((cur) => (cur.find((x) => x.id === r.id) ? cur : [...cur, r]))
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [training.id])

  async function callAction(action: 'start' | 'next' | 'prev' | 'wrap' | 'reset') {
    if (busy) return
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/trainings/${training.id}/session/${action}`,
        { method: 'POST' },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not run command')
      if (data.session) setSession(data.session as TrainingSession)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const total = driven.length

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/trainings/${training.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to training
        </Link>
        <div className="mt-3 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              Run live
            </p>
            <h1 className="mt-1 font-serif text-3xl md:text-4xl tracking-tightish text-ink">
              {training.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={session.status} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-ink/10 px-3 py-1 text-xs text-ink/70">
              <Users className="h-3.5 w-3.5" />
              {participants.length} {participants.length === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      {session.status === 'idle' && (
        <IdleStage
          participants={participants.length}
          totalExercises={total}
          onStart={() => callAction('start')}
          starting={busy === 'start'}
        />
      )}

      {session.status === 'live' && currentExercise && (
        <LiveStage
          exercise={currentExercise}
          position={currentIndex + 1}
          total={total}
          responses={responses.filter((r) => r.exercise_id === currentExercise.id)}
          participants={participants}
        />
      )}

      {session.status === 'wrapped' && (
        <WrappedStage
          participants={participants.length}
          exerciseCount={total}
          responses={responses}
          onReset={() => callAction('reset')}
          resetting={busy === 'reset'}
        />
      )}

      {session.status === 'live' && (
        <ControlBar
          position={currentIndex + 1}
          total={total}
          onPrev={() => callAction('prev')}
          onNext={() => callAction('next')}
          onWrap={() => callAction('wrap')}
          busy={busy}
          canPrev={currentIndex > 0}
        />
      )}
    </div>
  )
}

function StatusPill({ status }: { status: TrainingSession['status'] }) {
  if (status === 'live') return <Pill variant="live">● Live</Pill>
  if (status === 'wrapped') return <Pill variant="closed">Wrapped</Pill>
  return <Pill variant="draft">Idle</Pill>
}

function IdleStage({
  participants,
  totalExercises,
  onStart,
  starting,
}: {
  participants: number
  totalExercises: number
  onStart: () => void
  starting: boolean
}) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-8 md:p-12 text-center">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
        Ready when you are
      </p>
      <h2 className="mt-3 font-serif text-3xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
        Hit start when your <span className="italic-sage">participants have joined.</span>
      </h2>
      <p className="mt-4 text-ink/70">
        {participants === 0
          ? 'No one has joined yet — share your training code to invite them.'
          : `${participants} ${participants === 1 ? 'person is' : 'people are'} waiting.`}{' '}
        You&rsquo;ll drive {totalExercises} exercise{totalExercises === 1 ? '' : 's'} from here.
      </p>
      <div className="mt-8">
        <Button size="lg" onClick={onStart} disabled={starting}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {starting ? 'Starting…' : 'Start session'}
        </Button>
      </div>
    </div>
  )
}

function LiveStage({
  exercise,
  position,
  total,
  responses,
  participants,
}: {
  exercise: TrainingExerciseWithDef
  position: number
  total: number
  responses: ExerciseResponse[]
  participants: Participant[]
}) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-6 md:p-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Now playing · {position} of {total} · {EXERCISE_TYPE_LABELS[exercise.type]}
          </p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
            {exercise.title}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 text-sage px-3 py-1 text-xs font-medium">
          {responses.length} response{responses.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-6">
        <ExerciseLiveFeed
          exercise={exercise}
          responses={responses}
          participants={participants}
        />
      </div>
    </div>
  )
}

function ExerciseLiveFeed({
  exercise,
  responses,
  participants,
}: {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: Participant[]
}) {
  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  )

  if (exercise.type === 'word_cloud') {
    const allWords: string[] = []
    for (const r of responses) {
      const ws = (r.response as WordCloudResponseShape | undefined)?.words ?? []
      for (const w of ws) if (typeof w === 'string' && w.trim()) allWords.push(w.trim())
    }
    return (
      <div className="min-h-[260px] flex items-center justify-center rounded-2xl bg-cream/60 border border-dashed border-ink/15 p-6">
        <WordCloud
          words={aggregateWords(allWords)}
          className="max-w-3xl"
          minSize={18}
          maxSize={64}
        />
      </div>
    )
  }

  if (exercise.type === 'quiz') {
    const cfg = exercise.config as QuizConfig
    const questions = cfg.questions ?? []
    return (
      <div className="space-y-3">
        {questions.map((q, qi) => {
          const tallies = q.options.map(
            (_, oi) =>
              responses.filter(
                (r) =>
                  (r.response as QuizResponseShape | undefined)?.answers?.[q.id] === oi,
              ).length,
          )
          const totalForQ = tallies.reduce((s, n) => s + n, 0)
          return (
            <div key={q.id} className="rounded-xl border border-ink/10 p-4">
              <p className="font-serif text-base tracking-tightish text-ink leading-snug">
                <span className="font-mono text-xs text-ink/50 mr-2">
                  {String.fromCharCode(65 + qi)}.
                </span>
                {q.prompt}
              </p>
              <ul className="mt-3 space-y-1.5">
                {q.options.map((opt, oi) => {
                  const count = tallies[oi]
                  const pct = totalForQ === 0 ? 0 : Math.round((count / totalForQ) * 100)
                  const isCorrect = oi === q.correctIndex
                  return (
                    <li key={oi} className="flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono shrink-0',
                          isCorrect ? 'bg-success/20 text-success' : 'bg-ink/10 text-ink/70',
                        )}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1 truncate text-ink/80">
                        {opt || <span className="italic text-ink/40">(empty)</span>}
                      </span>
                      <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-ink/5 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            isCorrect ? 'bg-success' : 'bg-ink/30',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-ink/60 w-14 text-right shrink-0">
                        {count} · {pct}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    )
  }

  if (exercise.type === 'reflection') {
    return (
      <ul className="space-y-2 max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {[...responses]
            .sort(
              (a, b) =>
                new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
            )
            .map((r) => {
              const part = participantMap.get(r.participant_id)
              const text = (r.response as ReflectionResponseShape | undefined)?.text ?? ''
              return (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl border border-ink/10 bg-cream/40 p-3"
                >
                  <p className="text-[10px] font-mono uppercase tracking-wider text-ink/50">
                    {part?.display_name?.trim() || 'Anonymous'}
                  </p>
                  <p className="mt-1 text-sm text-ink whitespace-pre-line">{text}</p>
                </motion.li>
              )
            })}
        </AnimatePresence>
      </ul>
    )
  }

  if (exercise.type === 'matching') {
    const completedCount = responses.length
    return (
      <div className="rounded-2xl bg-cream/60 border border-dashed border-ink/15 p-6 text-center">
        <p className="font-serif text-2xl tracking-tightish text-ink">
          {completedCount} of {participants.length || '—'} completed
        </p>
        <p className="mt-2 text-sm text-ink/60">
          Open the Results tab for the full per-milestone breakdown after the session.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-cream/60 border border-dashed border-ink/15 p-6 text-sm text-ink/60 text-center">
      Live feed for {EXERCISE_TYPE_LABELS[exercise.type]} isn&rsquo;t implemented yet.
    </div>
  )
}

function WrappedStage({
  participants,
  exerciseCount,
  responses,
  onReset,
  resetting,
}: {
  participants: number
  exerciseCount: number
  responses: ExerciseResponse[]
  onReset: () => void
  resetting: boolean
}) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-8 md:p-12 text-center">
      <h2 className="font-serif text-3xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
        Session <span className="italic-sage">wrapped.</span>
      </h2>
      <p className="mt-3 text-ink/70">
        {participants} {participants === 1 ? 'person' : 'people'} took part across{' '}
        {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'} — {responses.length}{' '}
        responses collected.
      </p>
      <div className="mt-8 flex justify-center">
        <Button variant="secondary" onClick={onReset} disabled={resetting}>
          {resetting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {resetting ? 'Resetting…' : 'Run again'}
        </Button>
      </div>
    </div>
  )
}

function ControlBar({
  position,
  total,
  onPrev,
  onNext,
  onWrap,
  busy,
  canPrev,
}: {
  position: number
  total: number
  onPrev: () => void
  onNext: () => void
  onWrap: () => void
  busy: string | null
  canPrev: boolean
}) {
  return (
    <div className="sticky bottom-4 z-30 rounded-2xl bg-ink text-cream shadow-card flex items-center justify-between gap-3 px-4 py-3">
      <button
        onClick={onPrev}
        disabled={!canPrev || !!busy}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-cream/80 hover:bg-cream/10 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>
      <div className="text-xs font-mono uppercase tracking-wider text-cream/70">
        {position} of {total}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onWrap}
          disabled={!!busy}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-cream/10 hover:bg-cream/20 px-3 py-1.5 text-sm text-cream/80 disabled:opacity-40"
        >
          <Square className="h-3.5 w-3.5" />
          Wrap up
        </button>
        <button
          onClick={onNext}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-cream text-ink hover:bg-sand px-5 py-2 text-sm font-medium disabled:opacity-40"
        >
          {busy === 'next' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {position >= total ? 'Wrap up' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
