import { NextResponse } from 'next/server'
import { requireWorkspaceAccess, workspaceErrorResponse } from '@/lib/workspace-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomFromAlpha } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const workspaceId = String(body.workspace_id || '').trim()
    const email = String(body.email || '').toLowerCase().trim()
    const role = String(body.role || '')

    const access = await requireWorkspaceAccess(workspaceId, 'admin')
    if (!access.ok) return workspaceErrorResponse(access)

    if (!EMAIL_RX.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (!['admin', 'trainer', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Seat limit check — members + active invites
    const [{ count: memberCount = 0 }, { count: pendingInvites = 0 }] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId),
      supabase
        .from('workspace_invites')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString()),
    ])
    const seatsUsed = (memberCount ?? 0) + (pendingInvites ?? 0)
    if (seatsUsed >= access.workspace.seat_limit) {
      return NextResponse.json(
        {
          error:
            "You've reached your seat limit. Upgrade to Organization for up to 10 seats.",
        },
        { status: 400 },
      )
    }

    // Email not already a member?
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id, admin_users!inner(email)')
      .eq('workspace_id', workspaceId)
      .eq('admin_users.email', email)
      .maybeSingle()
    if (existingMember) {
      return NextResponse.json(
        { error: 'That email is already a member of this workspace.' },
        { status: 409 },
      )
    }

    const token = randomFromAlpha(24).toLowerCase()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('workspace_invites')
      .upsert(
        {
          workspace_id: workspaceId,
          email,
          role,
          invite_token: token,
          invited_by: access.session.user_id,
          expires_at: expiresAt,
          accepted_at: null,
        },
        { onConflict: 'workspace_id,email' },
      )
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ invite: data })
  } catch (e: unknown) {
    console.error('invite create', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
