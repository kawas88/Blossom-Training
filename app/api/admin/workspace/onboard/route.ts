import { NextResponse } from 'next/server'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const workspaceId = String(body.workspace_id || '').trim()
    const access = await requireWorkspaceAccess(workspaceId, 'admin')
    if (!access.ok) return workspaceErrorResponse(access)

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) {
      patch.name = body.name.trim().slice(0, 120)
    }
    if (Array.isArray(body.training_focus)) {
      patch.training_focus = body.training_focus
        .filter((v: unknown) => typeof v === 'string')
        .slice(0, 12)
    }
    if (body.onboarded === true) {
      patch.onboarded_at = new Date().toISOString()
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('workspaces')
      .update(patch)
      .eq('id', workspaceId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('onboard error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
