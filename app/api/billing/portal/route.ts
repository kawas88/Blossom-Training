import { NextResponse } from 'next/server'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = String(body.workspace_id || '').trim()
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }
    const access = await requireWorkspaceAccess(workspaceId, 'admin')
    if (!access.ok) return workspaceErrorResponse(access)
    const workspace = access.workspace

    if (!workspace.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing record yet — upgrade your plan first.' },
        { status: 400 },
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      `http://localhost:3000`

    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${appUrl}/admin/settings?tab=billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: unknown) {
    console.error('billing/portal error', e)
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
