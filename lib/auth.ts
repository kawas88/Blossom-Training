import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createAdminClient } from './supabase/admin'
import {
  ROLE_HIERARCHY,
  type AdminSession,
  type AdminUser,
  type WorkspaceRole,
} from './types'

const COOKIE_NAME = 'trainzy_session'
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
      typeof payload.user_id !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.session_version !== 'number'
    ) {
      return null
    }
    const activeWorkspaceId =
      typeof payload.active_workspace_id === 'string'
        ? payload.active_workspace_id
        : null

    // Verify session_version is current — this powers "sign out from all sessions".
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('admin_users')
      .select('session_version')
      .eq('id', payload.user_id)
      .maybeSingle()
    if (!data || data.session_version !== payload.session_version) {
      return null
    }

    return {
      user_id: payload.user_id,
      email: payload.email,
      name: payload.name,
      active_workspace_id: activeWorkspaceId,
      session_version: payload.session_version,
    }
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

// ---------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------
// Looks up the user, verifies password, picks an active workspace (most
// recently created the user is a member of), and writes the session cookie.
// Returns the new session, or null if credentials are invalid.
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
  const user = data as AdminUser & { session_version: number }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null

  // Pick a default active workspace (most recently created membership).
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces!inner(created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1)
  const activeWorkspaceId =
    memberships && memberships.length > 0
      ? (memberships[0] as { workspace_id: string }).workspace_id
      : null

  const session: AdminSession = {
    user_id: user.id,
    email: user.email,
    name: user.name,
    active_workspace_id: activeWorkspaceId,
    session_version: user.session_version ?? 0,
  }
  await setAdminSessionCookie(session)
  return session
}

// ---------------------------------------------------------------------
// Update only the active_workspace_id on the existing session cookie.
// Caller is responsible for verifying workspace membership first.
// ---------------------------------------------------------------------
export async function setActiveWorkspaceOnSession(
  workspaceId: string | null,
): Promise<AdminSession | null> {
  const current = await getAdminSession()
  if (!current) return null
  const next: AdminSession = { ...current, active_workspace_id: workspaceId }
  await setAdminSessionCookie(next)
  return next
}

// ---------------------------------------------------------------------
// Role enforcement helper. Returns the user's role if they meet `minRole`,
// otherwise null. Service-role calls bypass — this is purely for app-level
// authorization in route handlers.
// ---------------------------------------------------------------------
export async function requireRole(
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole = 'viewer',
): Promise<WorkspaceRole | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  const role = data.role as WorkspaceRole
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) return null
  return role
}
