'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  EXERCISE_TYPE_LABELS,
  type ExerciseResponse,
  type QuizConfig,
  type QuizResponseShape,
  type TrainingExerciseWithDef,
  type WordCloudResponseShape,
} from '@/lib/exercises'
import type { Training, Participant } from '@/lib/types'
import type { TrainingSession } from '@/lib/sessions'
import { Logo } from '@/components/Logo'
import { QrCode } from '@/components/QrCode'
import { WordCloud, aggregateWords } from '@/components/WordCloud'
import { cn } from '@/lib/utils'

type Props = {
  training: Training
  exercises: TrainingExerciseWithDef[]
  initialSession: TrainingSession
  initialParticipants: Participant[]
  initialResponses: ExerciseResponse[]
}

export function PresenterView({
  training,
  exercises,
  initialSession,
  initialParticipants,
  initialResponses,
}: Props) {
  const [session, setSession] = useState<TrainingSession>(initialSession)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [responses, setResponses] = useState<ExerciseResponse[]>(initialResponses)

  const [origin, setOrigin] = useState('')
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const joinUrl = origin ? `${origin}/?code=${training.join_code}` : ''

  // Realtime: same per-table channel pattern that works in LiveCockpit.
  // Anyone with the URL can read live data because public RLS is `true`
  // for response tables and gated on trainings.status='live' for sessions.
  useEffect(() => {
    const supabase = createClient()

    const sessionCh = supabase
      .channel(`present-session-${training.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_sessions' },
        (payload) => {
          const next = payload.new as TrainingSession | null
          if (next?.training_id === training.id && next.id) setSession(next)
        },
      )
      .subscribe()

    const participantsCh = supabase
      .channel(`present-participants-${training.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants' },
        (payload) => {
          const p = payload.new as Participant
          if (p?.training_id !== training.id) return
          setParticipants((cur) => (cur.find((x) => x.id === p.id) ? cur : [...cur, p]))
        },
      )
      .subscribe()

    const responsesCh = supabase
      .channel(`present-responses-${training.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exercise_responses' },
        (payload) => {
          const r = payload.new as ExerciseResponse
          if (r?.training_id !== training.id) return
          setResponses((cur) => (cur.find((x) => x.id === r.id) ? cur : [...cur, r]))
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'exercise_responses' },
        (payload) => {
          const r = payload.new as ExerciseResponse
          if (r?.training_id !== training.id) return
          setResponses((cur) =>
            cur.some((x) => x.id === r.id)
              ? cur.map((x) => (x.id === r.id ? r : x))
              : [...cur, r],
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionCh)
      supabase.removeChannel(participantsCh)
      supabase.removeChannel(responsesCh)
    }
  }, [training.id])

  const currentExercise = useMemo(() => {
    if (!session.current_exercise_id) return null
    return exercises.find((e) => e.id === session.current_exercise_id) ?? null
  }, [session.current_exercise_id, exercises])

  const exerciseResponses = useMemo(
    () =>
      currentExercise
        ? responses.filter((r) => r.exercise_id === currentExercise.id)
        : [],
    [responses, currentExercise],
  )

  return (
    <main className="min-h-screen bg-deep text-white flex flex-col overflow-hidden">
      {/* Top bar with brand + participant count. Intentionally minimal. */}
      <header className="px-8 md:px-12 py-6 flex items-center justify-between border-b border-white/10">
        <Logo variant="light" height={36} />
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
          <Users className="h-4 w-4" />
          {participants.length} in the room
        </div>
      </header>

      <div className="flex-1 flex">
        <AnimatePresence mode="wait">
          {session.status === 'idle' && (
            <IdleStage
              key="idle"
              joinCode={training.join_code}
              joinUrl={joinUrl}
              participants={participants.length}
            />
          )}
          {session.status === 'live' && currentExercise && (
            <LiveStage
              key={`live-${currentExercise.id}`}
              exercise={currentExercise}
              responses={exerciseResponses}
              participants={participants.length}
              joinCode={training.join_code}
              joinUrl={joinUrl}
            />
          )}
          {session.status === 'live' && !currentExercise && (
            <BetweenExercisesStage
              key="between"
              joinCode={training.join_code}
              joinUrl={joinUrl}
            />
          )}
          {session.status === 'wrapped' && (
            <WrappedStage
              key="wrapped"
              participants={participants.length}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function IdleStage({
  joinCode,
  joinUrl,
  participants,
}: {
  joinCode: string
  joinUrl: string
  participants: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex items-center justify-center p-8 md:p-16"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 max-w-6xl w-full items-center">
        <div>
          <p className="font-mono text-xs tracking-eyebrow uppercase text-white/60">
            To join
          </p>
          <h1 className="mt-4 font-serif text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tightish leading-[1] text-balance">
            Go to{' '}
            <span className="italic-wisteria">trainzy.io</span>
          </h1>
          <p className="mt-8 font-mono text-xs tracking-eyebrow uppercase text-white/60">
            And enter
          </p>
          <p className="mt-4 font-serif text-7xl md:text-8xl font-extrabold tracking-[0.18em] text-white">
            {joinCode}
          </p>
          <p className="mt-10 text-lg text-white/70">
            {participants === 0
              ? 'Waiting for the room to join…'
              : `${participants} ${participants === 1 ? 'person has' : 'people have'} joined.`}
          </p>
        </div>
        <div className="flex flex-col items-center lg:items-end gap-4">
          {joinUrl && (
            <div className="rounded-3xl bg-white p-4">
              <QrCode value={joinUrl} size={320} className="border-0" />
            </div>
          )}
          <p className="text-sm font-mono uppercase tracking-eyebrow text-white/55">
            Or scan the QR
          </p>
        </div>
      </div>
    </motion.section>
  )
}

function LiveStage({
  exercise,
  responses,
  participants,
  joinCode,
  joinUrl,
}: {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
  participants: number
  joinCode: string
  joinUrl: string
}) {
  const responsePct =
    participants === 0
      ? 0
      : Math.min(100, Math.round((responses.length / participants) * 100))

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex flex-col p-8 md:p-12 lg:p-16"
    >
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="max-w-4xl">
          <p className="font-mono text-xs tracking-eyebrow uppercase text-white/55">
            Now · {EXERCISE_TYPE_LABELS[exercise.type]}
          </p>
          <h2 className="mt-3 font-serif text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tightish leading-[1.05] text-balance">
            {exercise.title}
          </h2>
          {exercise.description && (
            <p className="mt-4 text-xl md:text-2xl text-white/75 text-balance max-w-3xl">
              {exercise.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-eyebrow uppercase text-white/55">
              Responses
            </p>
            <p className="font-serif text-5xl md:text-6xl font-extrabold text-white">
              {responses.length}
              <span className="text-white/40 text-3xl">/{participants || '?'}</span>
            </p>
          </div>
          <div className="h-2 w-40 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full bg-wisteria"
              animate={{ width: `${responsePct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <ExerciseLivePanel exercise={exercise} responses={responses} />
      </div>

      {/* Always-visible footer reminder of how to join, in case latecomers
          look up at the projector mid-session. */}
      <footer className="mt-8 flex items-center justify-between border-t border-white/10 pt-6 gap-4 flex-wrap">
        <p className="text-sm font-mono uppercase tracking-eyebrow text-white/55">
          Join at <span className="text-white">trainzy.io</span> · code{' '}
          <span className="text-white font-extrabold tracking-[0.25em]">{joinCode}</span>
        </p>
        {joinUrl && <QrCode value={joinUrl} size={88} />}
      </footer>
    </motion.section>
  )
}

function ExerciseLivePanel({
  exercise,
  responses,
}: {
  exercise: TrainingExerciseWithDef
  responses: ExerciseResponse[]
}) {
  // Word Cloud — render the live aggregate at projector scale.
  if (exercise.type === 'word_cloud') {
    const allWords: string[] = []
    for (const r of responses) {
      const ws = (r.response as WordCloudResponseShape | undefined)?.words ?? []
      for (const w of ws) if (typeof w === 'string' && w.trim()) allWords.push(w.trim())
    }
    if (allWords.length === 0) {
      return (
        <p className="text-2xl text-white/40 italic">Waiting for the first word…</p>
      )
    }
    return (
      <div className="w-full max-w-5xl">
        <WordCloud
          words={aggregateWords(allWords)}
          className="text-white"
          minSize={28}
          maxSize={112}
        />
      </div>
    )
  }

  // Quiz — show option tallies as fat horizontal bars.
  if (exercise.type === 'quiz') {
    const cfg = exercise.config as QuizConfig
    const questions = cfg.questions ?? []
    if (responses.length === 0) {
      return <p className="text-2xl text-white/40 italic">Waiting for the first answer…</p>
    }
    return (
      <div className="w-full max-w-4xl space-y-6">
        {questions.map((q, qi) => {
          const tallies = q.options.map(
            (_, oi) =>
              responses.filter(
                (r) =>
                  (r.response as QuizResponseShape | undefined)?.answers?.[q.id] === oi,
              ).length,
          )
          const total = tallies.reduce((s, n) => s + n, 0)
          return (
            <div key={q.id}>
              <p className="font-serif text-2xl font-extrabold text-white/90 mb-3">
                <span className="text-white/40 mr-2">{qi + 1}.</span>
                {q.prompt}
              </p>
              <ul className="space-y-2">
                {q.options.map((opt, oi) => {
                  const count = tallies[oi]
                  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
                  const isCorrect = oi === q.correctIndex
                  return (
                    <li key={oi} className="flex items-center gap-3">
                      <span className="w-8 text-center font-mono text-sm text-white/55 shrink-0">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1 min-w-0 text-lg text-white/90 truncate">
                        {opt}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            isCorrect ? 'bg-mint' : 'bg-wisteria',
                          )}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="font-mono text-base text-white/70 w-20 text-right shrink-0">
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

  // Generic — show the count + the most recent few names if not anonymous.
  return (
    <div className="text-center max-w-2xl">
      <p className="font-serif text-7xl md:text-8xl font-extrabold text-white">
        {responses.length}
      </p>
      <p className="mt-3 text-2xl text-white/65">
        {responses.length === 1 ? 'response in' : 'responses in'}
      </p>
      <p className="mt-8 text-base text-white/45">
        Detailed results are shown on the trainer dashboard after the session.
      </p>
    </div>
  )
}

function BetweenExercisesStage({
  joinCode,
  joinUrl,
}: {
  joinCode: string
  joinUrl: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex items-center justify-center p-8 md:p-16"
    >
      <div className="text-center max-w-3xl">
        <p className="font-mono text-xs tracking-eyebrow uppercase text-white/55">
          Take a breath
        </p>
        <h2 className="mt-4 font-serif text-6xl md:text-7xl font-extrabold tracking-tightish leading-[1.05] text-balance">
          Next activity coming up…
        </h2>
        <p className="mt-8 text-lg text-white/65">
          Late to the room? Join at <span className="text-white font-semibold">trainzy.io</span> with code{' '}
          <span className="font-extrabold tracking-[0.2em] text-white">{joinCode}</span>
        </p>
        {joinUrl && (
          <div className="mt-8 inline-block rounded-2xl bg-white p-3">
            <QrCode value={joinUrl} size={180} className="border-0" />
          </div>
        )}
      </div>
    </motion.section>
  )
}

function WrappedStage({ participants }: { participants: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex items-center justify-center p-8 md:p-16"
    >
      <div className="text-center max-w-3xl">
        <p className="font-mono text-xs tracking-eyebrow uppercase text-white/55">
          That&rsquo;s a wrap
        </p>
        <h2 className="mt-4 font-serif text-6xl md:text-7xl font-extrabold tracking-tightish leading-[1.05] text-balance">
          Thanks for <span className="italic-wisteria">showing up.</span>
        </h2>
        <p className="mt-8 text-2xl text-white/70">
          {participants} {participants === 1 ? 'person' : 'people'} took part.
        </p>
      </div>
    </motion.section>
  )
}
