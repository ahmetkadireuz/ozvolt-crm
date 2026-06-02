import { headers } from 'next/headers'

export function sanitize(value: unknown, maxLen = 500): string {
  return String(value ?? '')
    .trim()
    .slice(0, maxLen)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// Rate limiting — in-memory (per serverless instance)
const ipMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = ipMap.get(ip)
  if (!entry || now >= entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers()
  return headersList.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

// Brute-force login bescherming
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

export function checkLoginAttempts(ip: string): { allowed: boolean; lockedUntil?: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (entry && entry.lockedUntil > now) {
    return { allowed: false, lockedUntil: entry.lockedUntil }
  }

  return { allowed: true }
}

export function recordLoginFailure(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= 5) {
    entry.lockedUntil = now + 5 * 60 * 1000 // 5 minuten
    entry.count = 0
  }
  loginAttempts.set(ip, entry)
}

export function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip)
}
