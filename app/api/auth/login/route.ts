import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'
import { checkLoginAttempts, recordLoginFailure, clearLoginAttempts, getClientIp } from '@/lib/security'

export async function POST(req: NextRequest) {
  const ip = await getClientIp()

  const check = checkLoginAttempts(ip)
  if (!check.allowed) {
    return NextResponse.redirect(new URL('/login?error=locked', req.url))
  }

  const formData = await req.formData()
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const adminUser = process.env.ADMIN_USER ?? ''
  const adminPassHash = process.env.ADMIN_PASS_HASH ?? ''
  const adminPass = process.env.ADMIN_PASS ?? ''

  let valid = false

  if (username === adminUser) {
    if (adminPassHash) {
      valid = await bcrypt.compare(password, adminPassHash)
    } else {
      valid = password === adminPass
    }
  }

  if (!valid) {
    recordLoginFailure(ip)
    return NextResponse.redirect(new URL('/login?error=invalid', req.url))
  }

  clearLoginAttempts(ip)
  await createSession({ loggedIn: true, user: username })

  return NextResponse.redirect(new URL('/', req.url))
}
