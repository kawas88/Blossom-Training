import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession, clearAdminSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = createAdminClient()
    // Increment session_version so all existing JWTs become invalid.
    const { error } = await supabase
      .from('admin_users')
      .update({ session_version: (session.session_version ?? 0) + 1 })
      .eq('id', session.user_id)
    if (error) throw error
    clearAdminSessionCookie()
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('sign-out-all', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
