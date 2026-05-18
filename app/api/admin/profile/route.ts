import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession, setAdminSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const name = String(body.name || '').trim().slice(0, 120)
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('admin_users')
      .update({ name })
      .eq('id', session.user_id)
    if (error) throw error

    // Refresh cookie with new name
    await setAdminSessionCookie({ ...session, name })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('profile patch', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
