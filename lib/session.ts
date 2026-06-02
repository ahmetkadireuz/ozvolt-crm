import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'ozvolt_crm_session'

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is niet ingesteld')
    return new TextEncoder().encode('dev-secret-change-in-production-min-32-chars!!')
  }
  return new TextEncoder().encode(s)
}

export type SessionData = {
  loggedIn: boolean
  user: string
}

export async function createSession(data: SessionData) {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionData
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function requireSession() {
  const session = await getSession()
  if (!session?.loggedIn) return null
  return session
}
