import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getActiveWorkspace } from '@/lib/workspace'
import { listExercisesForWorkspace } from '@/lib/exercises'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExercisesGrid } from './ExercisesGrid'

export const dynamic = 'force-dynamic'

export default async function ExercisesListPage() {
  const active = await getActiveWorkspace()
  const exercises = await listExercisesForWorkspace(active!.workspace.id)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Exercises
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
            Your <span className="italic-sage">library.</span>
          </h1>
          <p className="mt-2 text-sm text-ink/60 max-w-xl">
            Build interactive activities once, drop them into any training.
          </p>
        </div>
        <Link
          href="/admin/exercises/new"
          className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
        >
          <Plus className="h-4 w-4" />
          New exercise
        </Link>
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          title="No exercises yet"
          description="Create your first matching, quiz or reflection — then add it to a training."
          action={
            <Link
              href="/admin/exercises/new"
              className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create one
            </Link>
          }
        />
      ) : (
        <ExercisesGrid exercises={exercises} />
      )}
    </div>
  )
}
