import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  listTrainingExercises,
  type TrainingExerciseWithDef,
} from '@/lib/exercises'
import { ensureTrainingSession, type TrainingSession } from '@/lib/sessions'
import type { Training, Participant } from '@/lib/types'
import { PresenterView } from './PresenterView'

export const dynamic = 'force-dynamic'

type Params = { slug: string }

// Big-screen view of a live training. Designed for the projector behind
// the trainer — large type, large counters, no chrome. Read-only.
// Public on purpose: anyone with the slug can open it (e.g. trainer puts
// the URL on the conference machine). Same surface area as the participant
// join page from a security perspective.
export default async function PresenterPage({ params }: { params: Params }) {
  const supabase = createAdminClient()

  const { data: training } = await supabase
    .from('trainings')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle<Training>()

  if (!training) {
    redirect('/')
  }

  if (training.status !== 'live') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-deep text-white p-8">
        <div className="text-center max-w-2xl">
          <p className="font-mono text-xs tracking-eyebrow uppercase text-white/60">
            Presenter view
          </p>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl font-extrabold tracking-tightish text-balance">
            This training isn&rsquo;t live yet.
          </h1>
          <p className="mt-5 text-white/70 text-balance">
            Go live from the trainer dashboard and refresh this page.
          </p>
        </div>
      </main>
    )
  }

  const exercises: TrainingExerciseWithDef[] = await listTrainingExercises(
    training.id,
  )
  const initialSession: TrainingSession = await ensureTrainingSession(training.id)

  const { data: participants } = await supabase
    .from('participants')
    .select('id, display_name, joined_at')
    .eq('training_id', training.id)
    .order('joined_at', { ascending: true })

  const { data: responses } = await supabase
    .from('exercise_responses')
    .select('*')
    .eq('training_id', training.id)

  return (
    <PresenterView
      training={training}
      exercises={exercises}
      initialSession={initialSession}
      initialParticipants={(participants ?? []) as Participant[]}
      initialResponses={responses ?? []}
    />
  )
}
