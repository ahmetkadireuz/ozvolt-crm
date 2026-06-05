import { sql } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export const KLANT_COOKIE = 'ozvolt_klant'
const SESSIE_DAGEN = 30

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

// Login-link is 24 uur geldig, kan meerdere keren gebruikt worden in die tijd
// Sessie-cookie blijft 30 dagen geldig na inloggen
const LINK_UREN = 24

export async function maakKlantSessie(klantId: number): Promise<string> {
  const token = randomBytes(16).toString('base64url')
  const hash = hashToken(token)
  // Link verloopt na 24 uur — de sessie cookie na 30 dagen
  const verlopen = new Date(Date.now() + LINK_UREN * 3600_000)

  await sql`
    INSERT INTO klant_sessies (klant_id, token_hash, verlopen_op)
    VALUES (${klantId}, ${hash}, ${verlopen.toISOString()})
  `
  return token
}

/**
 * Valideert een login-link token.
 * De link is 24 uur geldig en kan meerdere keren gebruikt worden (admin kan ook testen).
 */
export async function valideerEnGebruikKlantToken(token: string): Promise<number | null> {
  const hash = hashToken(token)
  const rows = await sql`
    SELECT klant_id FROM klant_sessies
    WHERE token_hash = ${hash}
      AND verlopen_op > NOW()
    LIMIT 1
  `
  if (!rows[0]) return null
  await sql`UPDATE klant_sessies SET gebruikt_op = NOW() WHERE token_hash = ${hash}`
  return rows[0].klant_id
}

/**
 * Valideert een token voor sessie-checks (cookie, mag vaker).
 * Controleert NIET of de link al gebruikt is — dat mag na het inloggen.
 */
export async function valideerKlantToken(token: string): Promise<number | null> {
  const hash = hashToken(token)
  const rows = await sql`
    SELECT klant_id FROM klant_sessies
    WHERE token_hash = ${hash}
      AND verlopen_op > NOW()
    LIMIT 1
  `
  if (!rows[0]) return null
  await sql`UPDATE klant_sessies SET gebruikt_op = NOW() WHERE token_hash = ${hash}`
  return rows[0].klant_id
}

export async function getKlantSessie(): Promise<number | null> {
  const jar = await cookies()
  const token = jar.get(KLANT_COOKIE)?.value
  if (!token) return null
  return valideerKlantToken(token)
}

export async function getKlantSessieFromReq(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get(KLANT_COOKIE)?.value
  if (!token) return null
  return valideerKlantToken(token)
}
