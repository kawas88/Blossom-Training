import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateJoinCode, slugify } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const title = String(body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const supabase = createAdminClient()
    const baseSlug = slugify(title) || 'training'
    const baseCodePrefix = baseSlug.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'T'

    let slug = baseSlug
    let joinCode = generateJoinCode(baseCodePrefix)
    let inserted: { id: string } | null = null
    let attempts = 0
    while (attempts < 5) {
      const trySlug = attempts === 0 ? baseSlug : `${baseSlug}-${attempts + 1}`
      const tryCode = generateJoinCode(baseCodePrefix)
      const { data, error } = await supabase
        .from('trainings')
        .insert({
          title,
          nursery_name: body.nursery_name || null,
          trainer_name: body.trainer_name || null,
          description: body.description || null,
          icebreaker_id: body.icebreaker_id || null,
          survey_id: body.survey_id || null,
          scheduled_at: body.scheduled_at || null,
          slug: trySlug,
          join_code: tryCode,
          status: 'draft',
        })
        .select('*')
        .single()
      if (!error && data) {
        inserted = data as unknown as { id: string }
        slug = trySlug
        joinCode = tryCode
        break
      }
      attempts++
    }
    if (!inserted) {
      return NextResponse.json({ error: 'Could not create training (collision)' }, { status: 500 })
    }
    return NextResponse.json({ training: { ...inserted, slug, join_code: joinCode } })
  } catch (e: unknown) {
    console.error('admin/trainings POST error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
