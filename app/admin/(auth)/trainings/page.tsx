import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspace } from '@/lib/workspace'
import { Pill } from '@/components/ui/Pill'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function TrainingsListPage() {
  const active = await getActiveWorkspace()
  const workspaceId = active!.workspace.id
  const supabase = createAdminClient()
  const { data: trainings } = await supabase
    .from('trainings')
    .select('id, title, nursery_name, trainer_name, join_code, status, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  // Counts in a separate query
  const counts: Record<string, number> = {}
  if (trainings && trainings.length > 0) {
    const ids = trainings.map((t) => t.id)
    const { data: rows } = await supabase
      .from('participants')
      .select('training_id')
      .in('training_id', ids)
    for (const r of rows || []) {
      counts[r.training_id] = (counts[r.training_id] || 0) + 1
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Trainings
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
            Every <span className="italic-sage">session.</span>
          </h1>
        </div>
        <Link
          href="/admin/trainings/new"
          className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
        >
          <Plus className="h-4 w-4" />
          New training
        </Link>
      </div>

      {!trainings || trainings.length === 0 ? (
        <EmptyState
          title="No trainings yet"
          description="Create your first session to share with educators."
          action={
            <Link
              href="/admin/trainings/new"
              className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create training
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sand/30 text-left">
                <tr className="text-xs font-mono uppercase tracking-wider text-ink/60">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Participants</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {trainings.map((t) => (
                  <tr key={t.id} className="hover:bg-sand/20 transition-colors">
                    <td className="px-5 py-4 max-w-md">
                      <div className="font-medium text-ink truncate">{t.title}</div>
                      <div className="text-xs text-ink/50 truncate">
                        {[t.nursery_name, t.trainer_name].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-ink/80">{t.join_code}</td>
                    <td className="px-5 py-4"><StatusPill status={t.status} /></td>
                    <td className="px-5 py-4 text-right tabular-nums">{counts[t.id] || 0}</td>
                    <td className="px-5 py-4 text-ink/60">{formatDate(t.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/trainings/${t.id}`}
                        className="text-sm text-ink hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === 'live') return <Pill variant="live">● Live</Pill>
  if (status === 'closed') return <Pill variant="closed">Closed</Pill>
  return <Pill variant="draft">Draft</Pill>
}
