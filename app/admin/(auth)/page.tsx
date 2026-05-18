import Link from 'next/link'
import { ArrowRight, Plus, Users } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { getActiveWorkspace } from '@/lib/workspace'
import { Pill } from '@/components/ui/Pill'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getAdminSession()
  const active = await getActiveWorkspace()
  const workspaceId = active!.workspace.id
  const supabase = createAdminClient()

  const [{ count: totalTrainings = 0 }, { count: liveTrainings = 0 }, { count: totalParticipants = 0 }, { count: totalSurveyResp = 0 }, { data: recent }] =
    await Promise.all([
      supabase
        .from('trainings')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId),
      supabase
        .from('trainings')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'live'),
      supabase
        .from('participants')
        .select('id, trainings!inner(workspace_id)', { count: 'exact', head: true })
        .eq('trainings.workspace_id', workspaceId),
      supabase
        .from('survey_responses')
        .select('id, trainings!inner(workspace_id)', { count: 'exact', head: true })
        .eq('trainings.workspace_id', workspaceId),
      supabase
        .from('trainings')
        .select('id, title, nursery_name, join_code, status, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Welcome back, {session?.name?.split(' ')[0] || 'Trainer'}
        </p>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl tracking-tightish text-ink">
          {active!.workspace.name}<span className="italic-sage">.</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total trainings" value={totalTrainings ?? 0} />
        <StatCard label="Live now" value={liveTrainings ?? 0} accent />
        <StatCard label="Participants" value={totalParticipants ?? 0} />
        <StatCard label="Responses" value={totalSurveyResp ?? 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <Link
          href="/admin/trainings/new"
          className="rounded-2xl bg-ink text-cream p-6 hover:bg-sage transition-colors flex items-start justify-between gap-4 group"
        >
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70">
              Quick action
            </p>
            <h3 className="mt-2 font-serif text-2xl tracking-tightish">Create training</h3>
            <p className="mt-1 text-sm opacity-80">
              Set up a session, pick an icebreaker and a survey, share the join code.
            </p>
          </div>
          <Plus className="h-6 w-6 opacity-70 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
        <Link
          href="/admin/trainings"
          className="rounded-2xl bg-white border border-ink/10 p-6 hover:bg-sand/30 transition-colors flex items-start justify-between gap-4 group"
        >
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
              Manage
            </p>
            <h3 className="mt-2 font-serif text-2xl tracking-tightish text-ink">
              View all trainings
            </h3>
            <p className="mt-1 text-sm text-ink/60">
              Drill into past sessions, review responses, export reports.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-ink/60 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-2xl tracking-tightish text-ink">Recent trainings</h2>
          <Link
            href="/admin/trainings"
            className="text-sm text-ink/60 hover:text-ink"
          >
            View all →
          </Link>
        </div>
        {(!recent || recent.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white/40 p-10 text-center">
            <Users className="h-8 w-8 mx-auto text-ink/30" strokeWidth={1.5} />
            <p className="mt-3 font-serif text-xl text-ink">No trainings yet</p>
            <p className="mt-1 text-sm text-ink/60">Create your first session to get started.</p>
            <Link
              href="/admin/trainings/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
            >
              <Plus className="h-4 w-4" /> Create training
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
            <ul className="divide-y divide-ink/5">
              {recent.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/trainings/${t.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-sand/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-ink truncate">{t.title}</div>
                      <div className="text-xs text-ink/50 truncate">
                        {(t as { nursery_name: string | null }).nursery_name || '—'} · {formatDate(t.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-ink/70">{t.join_code}</span>
                      <StatusPill status={t.status} />
                      <ArrowRight className="h-4 w-4 text-ink/40" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      className={
        accent
          ? 'rounded-2xl bg-sage/10 border border-sage/30 p-5'
          : 'rounded-2xl bg-white border border-ink/10 p-5'
      }
    >
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
        {label}
      </p>
      <p
        className={
          accent
            ? 'mt-2 font-serif text-4xl tracking-tightish text-sage'
            : 'mt-2 font-serif text-4xl tracking-tightish text-ink'
        }
      >
        {value}
      </p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === 'live') return <Pill variant="live">● Live</Pill>
  if (status === 'closed') return <Pill variant="closed">Closed</Pill>
  return <Pill variant="draft">Draft</Pill>
}
