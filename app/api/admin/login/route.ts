import { NextResponse } from 'next/server'
import { signInAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }
    const session = await signInAdmin(String(email), String(password))
    if (!session) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    return NextResponse.json({ ok: true, user: session })
  } catch (e: unknown) {
    console.error('admin/login error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
