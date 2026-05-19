import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { Decoration } from '@/components/ui/Decoration'

export const dynamic = 'force-dynamic'

// This layout is intentionally sparse — no sidebar — for the onboarding
// wizard and workspace-creation flows. Auth check only; the page itself
// decides what to do with the session.
export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return (
    <main className="relative min-h-screen flex flex-col bg-blush text-deep overflow-hidden">
      <Decoration />
      <div className="relative z-10 flex-1">{children}</div>
    </main>
  )
}
