import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { IcebreakerForm } from '../../IcebreakerForm'
import type {
  Icebreaker,
  IcebreakerCategory,
  IcebreakerItem,
  IcebreakerPrompt,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

type Params = { id: string }

export default async function EditIcebreakerPage({ params }: { params: Params }) {
  const supabase = createAdminClient()
  const { data: ice } = await supabase
    .from('icebreakers')
    .select('*')
    .eq('id', params.id)
    .maybeSingle<Icebreaker>()

  if (!ice) notFound()

  const [{ data: cats }, { data: items }, { data: prompts }] = await Promise.all([
    supabase
      .from('icebreaker_categories')
      .select('*')
      .eq('icebreaker_id', ice.id)
      .order('position'),
    supabase
      .from('icebreaker_items')
      .select('*')
      .eq('icebreaker_id', ice.id)
      .order('position'),
    supabase
      .from('icebreaker_prompts')
      .select('*')
      .eq('icebreaker_id', ice.id)
      .order('position'),
  ])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/60">
          Edit icebreaker
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tightish text-ink">
          {ice.title}
        </h1>
      </div>
      <IcebreakerForm
        initial={{
          icebreaker: ice,
          categories: (cats ?? []) as IcebreakerCategory[],
          items: (items ?? []) as IcebreakerItem[],
          prompts: (prompts ?? []) as IcebreakerPrompt[],
        }}
      />
    </div>
  )
}
