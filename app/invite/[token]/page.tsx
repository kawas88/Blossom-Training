import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { Decoration } from '@/components/ui/Decoration'
import { Logo } from '@/components/Logo'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { AcceptForm } from './AcceptForm'
import { formatDate } from '@/lib/utils'
import type { Workspace, WorkspaceInvite } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Params = { token: string }

export default async function InvitePage({ params }: { params: Params }) {
  const supabase = createAdminClient()
  const { data: invite } = await supabase
    .from('workspace_invites')
    .select('*, workspaces(*)')
    .eq('invite_token', params.token)
    .maybeSingle()

  if (!invite) {
    return (
      <Shell>
        <h1 className="font-serif text-3xl tracking-tightish text-ink">
          Invite not found
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          This invite link doesn&rsquo;t look right. Ask your workspace admin for a new one.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="secondary">Back home</Button>
        </Link>
      </Shell>
    )
  }

  const typed = invite as WorkspaceInvite & {
    workspaces: Workspace | Workspace[] | null
  }
  const workspace = Array.isArray(typed.workspaces) ? typed.workspaces[0] : typed.workspaces
  if (!workspace) {
    return (
      <Shell>
        <h1 className="font-serif text-3xl tracking-tightish text-ink">
          Workspace gone
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          The workspace this invite points to no longer exists.
        </p>
      </Shell>
    )
  }

  if (typed.accepted_at) {
    return (
      <Shell>
        <Pill variant="success">Already accepted</Pill>
        <h1 className="mt-4 font-serif text-3xl tracking-tightish text-ink">
          You&rsquo;re already in.
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          This invite has already been used. Sign in to continue.
        </p>
        <Link href="/admin/login" className="mt-6 inline-block">
          <Button>Sign in</Button>
        </Link>
      </Shell>
    )
  }

  if (new Date(typed.expires_at).getTime() < Date.now()) {
    return (
      <Shell>
        <Pill variant="error">Expired</Pill>
        <h1 className="mt-4 font-serif text-3xl tracking-tightish text-ink">
          This invite has expired.
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          Please ask the workspace admin to send a new one.
        </p>
      </Shell>
    )
  }

  const session = await getAdminSession()

  // If signed in with the same email — one-click accept
  // If signed in with a different email — show conflict
  // If signed out — ask to sign in or sign up
  let mode: 'accept-existing' | 'wrong-account' | 'new-or-existing'
  if (session) {
    mode =
      session.email.toLowerCase() === typed.email.toLowerCase()
        ? 'accept-existing'
        : 'wrong-account'
  } else {
    // Check if the invite email already has an account
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', typed.email.toLowerCase())
      .maybeSingle()
    mode = existingUser ? 'new-or-existing' : 'new-or-existing'
  }

  return (
    <Shell>
      <Pill variant="sage">Invite</Pill>
      <h1 className="mt-4 font-serif text-3xl md:text-4xl tracking-tightish text-ink leading-tight text-balance">
        Join <span className="italic-sage">{workspace.name}</span> on Trainzy
      </h1>
      <p className="mt-3 text-sm text-ink/60">
        For <span className="font-medium text-ink">{typed.email}</span> · expires {formatDate(typed.expires_at)}
      </p>

      <div className="mt-6">
        {mode === 'wrong-account' && session ? (
          <div className="rounded-2xl bg-warn/10 border border-warn/20 p-5 text-sm">
            <p className="text-ink">
              You&rsquo;re signed in as{' '}
              <span className="font-medium">{session.email}</span>, but this invite is for{' '}
              <span className="font-medium">{typed.email}</span>.
            </p>
            <p className="mt-2 text-ink/70">
              Sign out and sign in with the right email, or ask for a fresh invite.
            </p>
            <form action="/api/admin/logout" method="POST" className="mt-3">
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <AcceptForm
            token={params.token}
            email={typed.email}
            workspaceName={workspace.name}
            signedIn={mode === 'accept-existing'}
          />
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex flex-col bg-blush text-deep overflow-hidden">
      <Decoration />
      <header className="relative z-10 px-6 md:px-10 pt-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <Logo height={28} />
        </Link>
      </header>
      <div className="relative z-10 flex-1 px-6 py-16 flex items-center">
        <div className="mx-auto max-w-md w-full">
          <div className="rounded-3xl bg-white border-[1.5px] border-line shadow-card p-6 md:p-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
