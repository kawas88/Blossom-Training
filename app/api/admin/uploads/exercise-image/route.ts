import { NextResponse } from 'next/server'
import { getAdminSession, requireRole } from '@/lib/auth'
import { getActiveWorkspace } from '@/lib/workspace'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const active = await getActiveWorkspace()
  if (!active) return NextResponse.json({ error: 'No active workspace' }, { status: 400 })
  const role = await requireRole(active.workspace.id, session.user_id, 'trainer')
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Bad form data' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is larger than 5MB.' }, { status: 400 })
  }

  const ext = (() => {
    const fromName = file.name.split('.').pop()?.toLowerCase()
    if (fromName && fromName.length <= 5) return fromName
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') return 'jpg'
    if (file.type === 'image/png') return 'png'
    if (file.type === 'image/webp') return 'webp'
    if (file.type === 'image/gif') return 'gif'
    return 'bin'
  })()

  const filename = `${active.workspace.id}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`

  const supabase = createAdminClient()
  const bytes = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage
    .from('exercise-images')
    .upload(filename, bytes, {
      contentType: file.type,
      upsert: false,
    })
  if (uploadErr) {
    console.error('upload exercise-image', uploadErr)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: publicUrl } = supabase.storage
    .from('exercise-images')
    .getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl.publicUrl, path: filename })
}
