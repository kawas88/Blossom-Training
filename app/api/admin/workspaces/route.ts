import { NextResponse } from 'next/server'
import { getAdminSession, setActiveWorkspaceOnSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const name = String(body.name || '').trim().slice(0, 120)
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const supabase = createAdminClient()
    const baseSlug = slugify(name) || 'workspace'
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
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug,
        plan: 'trial',
        trial_ends_at: trialEnds,
        seat_limit: 1,
        created_by: session.user_id,
      })
      .select('*')
      .single()
    if (wsErr || !ws) {
      console.error('workspace create', wsErr)
      return NextResponse.json({ error: 'Could not create workspace' }, { status: 500 })
    }

    const { error: memErr } = await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: session.user_id,
      role: 'owner',
    })
    if (memErr) throw memErr

    await setActiveWorkspaceOnSession(ws.id)
    return NextResponse.json({ workspace: ws })
  } catch (e: unknown) {
    console.error('workspaces POST', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
