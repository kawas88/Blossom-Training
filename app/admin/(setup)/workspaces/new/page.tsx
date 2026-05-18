import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { CreateWorkspaceForm } from './CreateWorkspaceForm'

export const dynamic = 'force-dynamic'

export default async function NewWorkspacePage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return (
    <div className="px-6 md:px-10 py-10 md:py-20">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 font-mono text-xs tracking-[0.25em] uppercase text-ink/60">
          Trainzy · New workspace
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
          A fresh <span className="italic-sage">space.</span>
        </h1>
        <p className="mt-3 text-ink/70 text-balance">
          Workspaces keep your trainings, surveys and team separate. You can switch between them anytime.
        </p>
        <div className="mt-8">
          <CreateWorkspaceForm defaultName={`${session.name.split(' ')[0] || session.name}'s workspace`} />
        </div>
      </div>
    </div>
  )
}
