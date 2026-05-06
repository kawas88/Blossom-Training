import { createAdminClient } from '@/lib/supabase/admin'
import { NewTrainingForm } from './NewTrainingForm'
import type { Icebreaker, Survey } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function NewTrainingPage() {
  const supabase = createAdminClient()
  const [{ data: ices }, { data: surveys }] = await Promise.all([
    supabase.from('icebreakers').select('id, title, format').order('created_at', { ascending: false }),
    supabase.from('surveys').select('id, title').order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          New training
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          Set up a <span className="italic-sage">session.</span>
        </h1>
      </div>

      <NewTrainingForm
        icebreakers={(ices ?? []) as Pick<Icebreaker, 'id' | 'title' | 'format'>[]}
        surveys={(surveys ?? []) as Pick<Survey, 'id' | 'title'>[]}
      />
    </div>
  )
}
