import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspace } from '@/lib/workspace'
import { Pill } from '@/components/ui/Pill'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function IcebreakersListPage() {
  const active = await getActiveWorkspace()
  const workspaceId = active!.workspace.id
  const supabase = createAdminClient()
  const { data: ices } = await supabase
    .from('icebreakers')
    .select('id, title, format, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Icebreakers
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
            Warm-up <span className="italic-sage">activities.</span>
          </h1>
        </div>
        <Link
          href="/admin/icebreakers/new"
          className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
        >
          <Plus className="h-4 w-4" />
          New icebreaker
        </Link>
      </div>

      {!ices || ices.length === 0 ? (
        <EmptyState
          title="No icebreakers yet"
          description="Build a matching activity or a quick prompt set."
          action={
            <Link
              href="/admin/icebreakers/new"
              className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create one
            </Link>
          }
        />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {ices.map((i) => (
            <li
              key={i.id}
              className="rounded-2xl bg-white border border-ink/10 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-xl tracking-tightish text-ink leading-snug">
                  {i.title}
                </h3>
                <Pill variant="default">{i.format}</Pill>
              </div>
              <p className="mt-1 text-xs text-ink/50">{formatDate(i.created_at)}</p>
              <div className="mt-auto pt-4 flex gap-2">
                <Link
                  href={`/admin/icebreakers/${i.id}/edit`}
                  className="text-sm text-ink hover:underline"
                >
                  Edit →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
