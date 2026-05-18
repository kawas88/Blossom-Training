import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAdminSession,
  setAdminSessionCookie,
} from '@/lib/auth'
import type { AdminSession } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = String(body.token || '').trim()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const supabase = createAdminClient()
    const { data: invite } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('invite_token', token)
      .maybeSingle()
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    if (invite.accepted_at)
      return NextResponse.json({ error: 'Invite already used' }, { status: 400 })
    if (new Date(invite.expires_at).getTime() < Date.now())
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })

    const inviteEmail = invite.email.toLowerCase()

    // Either there's a logged-in user matching this email, or we'll sign them in / create them.
    const existingSession = await getAdminSession()
    let userId: string | null = null
    let userName = ''
    let userEmail = ''
    let sessionVersion = 0

    if (existingSession && existingSession.email.toLowerCase() === inviteEmail) {
      userId = existingSession.user_id
      userName = existingSession.name
      userEmail = existingSession.email
      sessionVersion = existingSession.session_version
    } else {
      // Look up the email
      const { data: existingUser } = await supabase
        .from('admin_users')
        .select('id, email, name, password_hash, session_version')
        .eq('email', inviteEmail)
        .maybeSingle()

      if (existingUser) {
        if (!password) {
          return NextResponse.json(
            { error: 'Password required to accept this invite.' },
            { status: 400 },
          )
        }
        const ok = await bcrypt.compare(password, existingUser.password_hash)
        if (!ok) {
          return NextResponse.json(
            { error: 'Incorrect password for this email.' },
            { status: 401 },
          )
        }
        userId = existingUser.id
        userName = existingUser.name
        userEmail = existingUser.email
        sessionVersion = existingUser.session_version ?? 0
      } else {
        // Brand new account
        if (!name) {
          return NextResponse.json({ error: 'Name required for a new account.' }, { status: 400 })
        }
        if (password.length < 8) {
          return NextResponse.json(
            { error: 'Password must be at least 8 characters.' },
            { status: 400 },
          )
        }
        const hash = await bcrypt.hash(password, 10)
        const { data: created, error } = await supabase
          .from('admin_users')
          .insert({
            name,
            email: inviteEmail,
            password_hash: hash,
            role: 'trainer',
          })
          .select('id, email, name, session_version')
          .single()
        if (error || !created) {
          console.error('accept invite create user', error)
          return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
        }
        userId = created.id
        userName = created.name
        userEmail = created.email
        sessionVersion = (created as { session_version?: number }).session_version ?? 0
      }
    }

    // Add as workspace member (idempotent via on-conflict)
    const { error: memberErr } = await supabase.from('workspace_members').upsert(
      {
        workspace_id: invite.workspace_id,
        user_id: userId,
        role: invite.role,
      },
      { onConflict: 'workspace_id,user_id' },
    )
    if (memberErr) {
      console.error('accept invite member', memberErr)
      return NextResponse.json({ error: 'Could not add you to workspace' }, { status: 500 })
    }

    // Mark invite accepted
    await supabase
      .from('workspace_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Update session with new workspace as active
    const session: AdminSession = {
      user_id: userId!,
      email: userEmail,
      name: userName,
      active_workspace_id: invite.workspace_id,
      session_version: sessionVersion,
    }
    await setAdminSessionCookie(session)

    return NextResponse.json({ ok: true, workspace_id: invite.workspace_id })
  } catch (e: unknown) {
    console.error('accept invite', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
