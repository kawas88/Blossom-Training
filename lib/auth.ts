import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createAdminClient } from './supabase/admin'
import type { AdminSession, AdminUser } from './types'

const COOKIE_NAME = 'nth_admin_session'
const ALG = 'HS256'

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_JWT_SECRET is missing or too short (min 16 chars).')
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: AdminSession): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] })
    if (
      typeof payload.user_id === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.name === 'string' &&
      (payload.role === 'admin' || payload.role === 'trainer')
    ) {
      return {
        user_id: payload.user_id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const c = cookies().get(COOKIE_NAME)
  if (!c?.value) return null
  return verifySession(c.value)
}

export async function setAdminSessionCookie(session: AdminSession) {
  const token = await signSession(session)
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearAdminSessionCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function signInAdmin(
  email: string,
  password: string,
): Promise<AdminSession | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  if (error || !data) return null
  const user = data as AdminUser
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null
  const session: AdminSession = {
    user_id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
  await setAdminSessionCookie(session)
  return session
}
