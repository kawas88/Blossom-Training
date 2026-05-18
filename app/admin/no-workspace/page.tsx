import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Decoration } from '@/components/ui/Decoration'
import { Button } from '@/components/ui/Button'
import { getAdminSession } from '@/lib/auth'
import { getUserWorkspaces } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

export default async function NoWorkspacePage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  const workspaces = await getUserWorkspaces(session.user_id)
  if (workspaces.length > 0) redirect('/admin')

  return (
    <main className="relative min-h-screen flex flex-col">
      <Decoration />
      <div className="flex-1 px-6 py-20 flex items-center">
        <div className="mx-auto max-w-md w-full text-center">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60">
            No workspace
          </p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl tracking-tightish text-ink leading-tight text-balance">
            You&rsquo;re not in any <span className="italic-sage">workspace yet.</span>
          </h1>
          <p className="mt-4 text-ink/70 text-balance">
            Ask a teammate to invite you, or start your own.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/admin/workspaces/new">
              <Button>Create a workspace</Button>
            </Link>
            <form action="/api/admin/logout" method="POST">
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
