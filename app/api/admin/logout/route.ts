import { NextResponse } from 'next/server'
import { clearAdminSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  clearAdminSessionCookie()
  return NextResponse.json({ ok: true })
}
