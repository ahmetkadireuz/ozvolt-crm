import { sql } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export const KLANT_COOKIE = 'ozvolt_klant'
const SESSIE_DAGEN = 30

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function maakKlantSessie(klantId: number): Promise<string> {
  const token = randomBytes(16).toString('base64url')
  const hash = hashToken(token)
  const verlopen = new Date(Date.now() + SESSIE_DAGEN * 86400_000)

  await sql`
    INSERT INTO klant_sessies (klant_id, token_hash, verlopen_op)
    VALUES (${klantId}, ${hash}, ${verlopen.toISOString()})
  `
  return token
}

/**
 * Valideert een token bij inloggen via de magic link (eenmalig gebruik).
 * Na de eerste keer wordt de link geblokkeerd voor hergebruik.
 * De sessie cookie blijft gewoon 30 dagen geldig.
 */
export async function valideerEnGebruikKlantToken(token: string): Promise<number | null> {
  const hash = hashToken(token)

  // Zorg dat de kolom bestaat (migratie veilig)
  try {
    await sql`ALTER TABLE klant_sessies ADD COLUMN IF NOT EXISTS link_gebruikt BOOLEAN NOT NULL DEFAULT FALSE`
  } catch { /* kolom bestaat al */ }

  const rows = await sql`
    SELECT klant_id, link_gebruikt FROM klant_sessies
    WHERE token_hash = ${hash}
      AND verlopen_op > NOW()
    LIMIT 1
  `
  if (!rows[0]) return null
  if (rows[0].link_gebruikt) return null // link al eerder gebruikt

  // Markeer de link als gebruikt (eenmalig)
  await sql`UPDATE klant_sessies SET link_gebruikt = TRUE, gebruikt_op = NOW() WHERE token_hash = ${hash}`
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
