import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const currentPassword = String(body.current_password || '')
    const newPassword = String(body.new_password || '')
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('admin_users')
      .select('password_hash')
      .eq('id', session.user_id)
      .maybeSingle()
    if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    const ok = await bcrypt.compare(currentPassword, user.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: hash })
      .eq('id', session.user_id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('password change', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
