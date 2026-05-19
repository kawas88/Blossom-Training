'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy,
  Check,
  ExternalLink,
  Power,
  RotateCcw,
  ArrowLeft,
  Lock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Tabs } from '@/components/ui/Tabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import type {
  Training,
  Participant,
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  IcebreakerPrompt,
  Survey,
  SurveyQuestion,
  IcebreakerMatchingResponse,
  IcebreakerPromptResponse,
  SurveyResponse,
  TrainerNote,
} from '@/lib/types'
import { OverviewTab } from './tabs/OverviewTab'
import { IcebreakerTab } from './tabs/IcebreakerTab'
import { SurveyTab } from './tabs/SurveyTab'
import { NotesTab } from './tabs/NotesTab'
import { ExportTab } from './tabs/ExportTab'
import { ExercisesTab } from './tabs/ExercisesTab'
import type {
  Exercise,
  TrainingExerciseWithDef,
} from '@/lib/exercises'

type Props = {
  training: Training
  participants: Participant[]
  icebreaker: Icebreaker | null
  categories: IcebreakerCategory[]
  items: IcebreakerItem[]
  prompts: IcebreakerPrompt[]
  survey: Survey | null
  questions: SurveyQuestion[]
  matchingResponses: IcebreakerMatchingResponse[]
  promptResponses: IcebreakerPromptResponse[]
  surveyResponses: SurveyResponse[]
  notes: TrainerNote[]
  trainingExercises: TrainingExerciseWithDef[]
  workspaceExercises: Exercise[]
  matchingExerciseId: string | null
}

export function TrainingDashboard(props: Props) {
  const router = useRouter()
  const { training, participants } = props
  const [tab, setTab] = useState('overview')
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`training-${training.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `training_id=eq.${training.id}` },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'icebreaker_matching_responses', filter: `training_id=eq.${training.id}` },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'icebreaker_prompt_responses', filter: `training_id=eq.${training.id}` },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'survey_responses', filter: `training_id=eq.${training.id}` },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trainer_notes', filter: `training_id=eq.${training.id}` },
        () => router.refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [training.id, router])

  function copy(field: 'code' | 'link', text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  async function changeStatus(status: 'live' | 'closed' | 'draft') {
    if (statusBusy) return
    if (status === 'closed') {
      const ok = confirm('Close this training? Participants will no longer be able to join.')
      if (!ok) return
    }
    setStatusBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/trainings/${training.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not update status')
      }
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setStatusBusy(false)
    }
  }

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || ''
  const joinLink = `${appUrl}/?code=${training.join_code}`

  const hasMatching = !!props.matchingExerciseId
  const tabs = [
    { value: 'overview', label: 'Overview' },
    {
      value: 'exercises',
      label: 'Exercises',
      count: props.trainingExercises.length,
    },
    ...(hasMatching
      ? [{ value: 'icebreaker', label: 'Matching results' }]
      : []),
    { value: 'survey', label: 'Survey' },
    { value: 'notes', label: 'Notes', count: props.notes.length },
    { value: 'export', label: 'Export & report' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/trainings"
          className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          All trainings
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <StatusPill status={training.status} />
              <span className="text-xs text-ink/50">
                {participants.length} participant{participants.length === 1 ? '' : 's'}
              </span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight">
              {training.title}
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              {[training.nursery_name, training.trainer_name].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => copy('code', training.join_code)}
              className="inline-flex items-center gap-2 rounded-full bg-ink/5 hover:bg-ink/10 px-4 py-2 text-sm font-mono tracking-wider text-ink transition-colors"
            >
              {copiedField === 'code' ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4 text-ink/50" />
              )}
              {training.join_code}
            </button>
            <button
              onClick={() => copy('link', joinLink)}
              className="inline-flex items-center gap-2 rounded-full bg-ink/5 hover:bg-ink/10 px-4 py-2 text-sm text-ink transition-colors"
            >
              {copiedField === 'link' ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4 text-ink/50" />
              )}
              Copy link
            </button>
            <Link
              href={`/?code=${training.join_code}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full bg-ink/5 hover:bg-ink/10 px-4 py-2 text-sm text-ink transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-ink/50" />
              Open as participant
            </Link>
            <StatusControl
              status={training.status}
              onChange={changeStatus}
              busy={statusBusy}
            />
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-xl bg-error/10 border border-error/20 px-4 py-2.5 text-sm text-error">
            {error}
          </div>
        )}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {tab === 'overview' && <OverviewTab {...props} />}
        {tab === 'exercises' && (
          <ExercisesTab
            training={props.training}
            trainingExercises={props.trainingExercises}
            workspaceExercises={props.workspaceExercises}
          />
        )}
        {tab === 'icebreaker' && hasMatching && <IcebreakerTab {...props} />}
        {tab === 'survey' && <SurveyTab {...props} />}
        {tab === 'notes' && <NotesTab {...props} />}
        {tab === 'export' && <ExportTab {...props} />}
      </motion.div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === 'live') return <Pill variant="live">● Live</Pill>
  if (status === 'closed') return <Pill variant="closed">Closed</Pill>
  return <Pill variant="draft">Draft</Pill>
}

function StatusControl({
  status,
  onChange,
  busy,
}: {
  status: string
  onChange: (s: 'live' | 'closed' | 'draft') => void
  busy: boolean
}) {
  if (status === 'draft') {
    return (
      <Button onClick={() => onChange('live')} disabled={busy}>
        <Power className="h-4 w-4" /> Go live
      </Button>
    )
  }
  if (status === 'live') {
    return (
      <Button variant="danger" onClick={() => onChange('closed')} disabled={busy}>
        <Lock className="h-4 w-4" /> Close training
      </Button>
    )
  }
  return (
    <Button onClick={() => onChange('live')} disabled={busy}>
      <RotateCcw className="h-4 w-4" /> Reopen
    </Button>
  )
}
