import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { setAdminSessionCookie } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import type { AdminSession } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body.name || '').trim().slice(0, 120)
    const email = String(body.email || '').toLowerCase().trim()
    const password = String(body.password || '')

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!EMAIL_RX.test(email))
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const supabase = createAdminClient()

    // Email uniqueness
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists. Try signing in instead.' },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Create the admin user
    const { data: user, error: userErr } = await supabase
      .from('admin_users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        role: 'admin',
      })
      .select('id, email, name, session_version')
      .single()
    if (userErr || !user) {
      console.error('signup user insert', userErr)
      return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
    }

    // Workspace name + slug
    const firstName = name.split(' ')[0] || name
    const workspaceName = `${firstName}'s workspace`
    const baseSlug = slugify(`${firstName}-workspace`) || 'workspace'

    // Find a free slug
    let slug = baseSlug
    let attempt = 0
    while (attempt < 10) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
      const { data: clash } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      if (!clash) {
        slug = candidate
        break
      }
      attempt++
    }

    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: workspace, error: wsErr } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug,
        plan: 'trial',
        trial_ends_at: trialEnds,
        seat_limit: 1,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (wsErr || !workspace) {
      console.error('signup workspace insert', wsErr)
      return NextResponse.json({ error: 'Could not create workspace' }, { status: 500 })
    }

    const { error: memberErr } = await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })
    if (memberErr) {
      console.error('signup membership insert', memberErr)
      return NextResponse.json({ error: 'Could not add you to workspace' }, { status: 500 })
    }

    const session: AdminSession = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      active_workspace_id: workspace.id,
      session_version: (user as { session_version?: number }).session_version ?? 0,
    }
    await setAdminSessionCookie(session)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('signup error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
