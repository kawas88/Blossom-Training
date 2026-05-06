import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSessionToken } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const trainingId = String(body.training_id || '').trim()
    const rawName = body.display_name
    const displayName =
      typeof rawName === 'string' && rawName.trim().length > 0
        ? rawName.trim().slice(0, 60)
        : null

    if (!trainingId) {
      return NextResponse.json({ error: 'Missing training_id' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: training, error: tErr } = await supabase
      .from('trainings')
      .select('id, status')
      .eq('id', trainingId)
      .maybeSingle()
    if (tErr) throw tErr
    if (!training) return NextResponse.json({ error: 'Training not found' }, { status: 404 })
    if (training.status !== 'live') {
      return NextResponse.json({ error: 'Training is not accepting participants' }, { status: 400 })
    }

    let token = generateSessionToken()
    let attempts = 0
    let inserted: { id: string } | null = null
    while (attempts < 5) {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          training_id: trainingId,
          display_name: displayName,
          session_token: token,
        })
        .select('id')
        .single()
      if (!error && data) {
        inserted = data as { id: string }
        break
      }
      // unique violation on session_token, retry
      attempts++
      token = generateSessionToken()
    }
    if (!inserted) {
      return NextResponse.json({ error: 'Could not create participant' }, { status: 500 })
    }

    cookies().set(`pt_${trainingId}`, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return NextResponse.json({ participant_id: inserted.id })
  } catch (e: unknown) {
    console.error('participants/join error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
