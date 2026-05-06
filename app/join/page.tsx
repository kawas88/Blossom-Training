import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { Decoration } from '@/components/ui/Decoration'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { JoinForm } from './JoinForm'

export const dynamic = 'force-dynamic'

type SearchParams = { code?: string }

export default async function JoinPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const code = (searchParams.code || '').toUpperCase().trim()

  if (!code) {
    redirect('/')
  }

  const supabase = createAdminClient()
  const { data: training } = await supabase
    .from('trainings')
    .select('id, title, slug, status, nursery_name, trainer_name, join_code')
    .eq('join_code', code)
    .maybeSingle()

  if (!training) {
    return <NotFoundShell code={code} />
  }

  if (training.status === 'draft') {
    return <StatusShell title="Not started yet" body="This training hasn't started. Check with your trainer." pill="draft" />
  }

  if (training.status === 'closed') {
    return <StatusShell title="Training closed" body="This session has wrapped up. Thanks for joining us." pill="closed" />
  }

  // status === 'live'
  const cookieStore = cookies()
  const existing = cookieStore.get(`pt_${training.id}`)
  if (existing?.value) {
    const { data: participant } = await supabase
      .from('participants')
      .select('id, training_id')
      .eq('session_token', existing.value)
      .eq('training_id', training.id)
      .maybeSingle()
    if (participant) {
      redirect(`/participant/${training.slug}`)
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />
      <div className="flex-1 px-6 py-12 md:py-20">
        <div className="mx-auto max-w-md">
          <Link
            href="/"
            className="text-sm text-ink/60 hover:text-ink transition-colors"
          >
            ← Back
          </Link>

          <div className="mt-8 rounded-2xl bg-white border border-ink/10 shadow-card p-6 md:p-8">
            <Pill variant="live">● Live</Pill>
            <h1 className="mt-4 font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-[1.1]">
              {training.title}
            </h1>
            <p className="mt-2 text-sm text-ink/60">
              {[training.nursery_name, training.trainer_name].filter(Boolean).join(' · ')}
            </p>

            <div className="mt-6 border-t border-ink/10 pt-6">
              <JoinForm trainingId={training.id} slug={training.slug} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function NotFoundShell({ code }: { code: string }) {
  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />
      <div className="flex-1 px-6 py-20 flex items-center">
        <div className="mx-auto max-w-md w-full">
          <div className="rounded-2xl bg-white border border-ink/10 shadow-card p-8 text-center">
            <h1 className="font-serif text-3xl tracking-tightish text-ink">
              Code not found
            </h1>
            <p className="mt-3 text-sm text-ink/60">
              We couldn&rsquo;t find a training with the code{' '}
              <span className="font-mono">{code}</span>. Double-check with your trainer.
            </p>
            <Link href="/" className="mt-6 inline-block">
              <Button>Try again</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatusShell({
  title,
  body,
  pill,
}: {
  title: string
  body: string
  pill: 'draft' | 'closed'
}) {
  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />
      <div className="flex-1 px-6 py-20 flex items-center">
        <div className="mx-auto max-w-md w-full">
          <div className="rounded-2xl bg-white border border-ink/10 shadow-card p-8 text-center">
            <Pill variant={pill}>{pill === 'draft' ? 'Draft' : 'Closed'}</Pill>
            <h1 className="mt-4 font-serif text-3xl tracking-tightish text-ink">
              {title}
            </h1>
            <p className="mt-3 text-sm text-ink/60">{body}</p>
            <Link href="/" className="mt-6 inline-block">
              <Button variant="secondary">Back home</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
