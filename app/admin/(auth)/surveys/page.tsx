import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SurveysListPage() {
  const supabase = createAdminClient()
  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, title, description, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
            Surveys
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
            Feedback <span className="italic-sage">forms.</span>
          </h1>
        </div>
        <Link
          href="/admin/surveys/new"
          className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
        >
          <Plus className="h-4 w-4" />
          New survey
        </Link>
      </div>

      {!surveys || surveys.length === 0 ? (
        <EmptyState
          title="No surveys yet"
          description="Build a feedback form for educators to fill in after a session."
          action={
            <Link
              href="/admin/surveys/new"
              className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-2.5 text-sm font-medium hover:bg-sage transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create one
            </Link>
          }
        />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {surveys.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl bg-white border border-ink/10 p-5 flex flex-col"
            >
              <h3 className="font-serif text-xl tracking-tightish text-ink leading-snug">
                {s.title}
              </h3>
              {s.description && (
                <p className="mt-1 text-sm text-ink/60 line-clamp-2">{s.description}</p>
              )}
              <p className="mt-2 text-xs text-ink/50">{formatDate(s.created_at)}</p>
              <div className="mt-auto pt-4 flex gap-2">
                <Link
                  href={`/admin/surveys/${s.id}/edit`}
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
