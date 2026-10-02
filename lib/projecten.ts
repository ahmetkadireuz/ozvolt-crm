import { sql } from '@/lib/db'
import { ensureFactuurKolommen } from '@/lib/facturen'
import { ensureTikkieKolommen } from '@/lib/tikkie'
import { vindOfMaakKlant } from '@/lib/klanten'

/* ============================================================
   Projecten (tabel `klussen`) zijn leidend: offertes en facturen
   hangen aan één project en nemen de klant van het project over.
   ============================================================ */

export type ProjectOptie = {
  id: number
  klant_id: number
  klant_naam: string
  klant_email: string | null
  klant_locatie: string | null
  type_werk: string | null
  omschrijving: string | null
  status: string
}

export async function maakProject(p: {
  klant_id: number
  type_werk?: string | null
  omschrijving?: string | null
  bron?: string | null
}): Promise<number> {
  const rows = await sql`
    INSERT INTO klussen (klant_id, type_werk, omschrijving, bron, status)
    VALUES (${p.klant_id}, ${p.type_werk?.trim() || null}, ${p.omschrijving?.trim() || null}, ${p.bron || 'handmatig'}, 'nieuw')
    RETURNING id
  `
  return rows[0].id
}

/**
 * Bepaalt het project uit het formulier van "nieuwe offerte/factuur" (components/ProjectKiezer):
 * een gekozen project, of een nieuw project voor een gekozen of nieuwe klant.
 * Geeft een foutcode terug als er geen project of klant is.
 */
export async function projectUitFormulier(fd: FormData): Promise<{ klusId: number } | { fout: 'klant' | 'project' }> {
  const veld = (n: string) => String(fd.get(n) ?? '').trim()
  const klusId = parseInt(veld('klus_id')) || 0
  if (klusId) {
    const r = await sql`SELECT id FROM klussen WHERE id = ${klusId}`
    return r[0] ? { klusId } : { fout: 'project' }
  }
  if (veld('project_modus') !== 'nieuw') return { fout: 'project' }

  let klantId = parseInt(veld('klant_id')) || 0
  if (!klantId && veld('nieuwe_naam')) {
    const k = await vindOfMaakKlant({
      naam: veld('nieuwe_naam'), email: veld('nieuwe_email'), telefoon: veld('nieuwe_telefoon'),
      locatie: veld('nieuwe_locatie'), type: veld('nieuwe_type'),
    })
    klantId = k.id
  }
  if (!klantId) return { fout: 'klant' }
  const nieuw = await maakProject({ klant_id: klantId, type_werk: veld('type_werk'), omschrijving: veld('omschrijving') })
  return { klusId: nieuw }
}

/** Projecten voor de projectkiezer, nieuwste eerst. */
export async function projectOpties(): Promise<ProjectOptie[]> {
  const rows = await sql`
    SELECT k.id, k.klant_id, k.type_werk, k.omschrijving, k.status,
           kt.naam AS klant_naam, kt.email AS klant_email, kt.locatie AS klant_locatie
    FROM klussen k JOIN klanten kt ON kt.id = k.klant_id
    ORDER BY (k.status = 'afgerond'), k.aangemaakt_op DESC
  `
  return JSON.parse(JSON.stringify(rows))
}

/**
 * Zet een andere klant op het project. De klant volgt mee op offertes die nog niet getekend zijn
 * en op facturen die niet betaald zijn en niet in Moneybird staan; de rest blijft ongemoeid.
 */
export async function wijzigProjectKlant(klusId: number, klantId: number) {
  await ensureFactuurKolommen()
  await ensureTikkieKolommen()
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS moneybird_id VARCHAR(64) DEFAULT NULL`

  const upd = await sql`UPDATE klussen SET klant_id = ${klantId}, bijgewerkt_op = NOW() WHERE id = ${klusId} RETURNING id`
  if (!upd[0]) throw new Error('Project niet gevonden')

  const offertes = await sql`
    UPDATE offertes SET klant_id = ${klantId}, bijgewerkt_op = NOW()
    WHERE klus_id = ${klusId} AND klant_id <> ${klantId}
      AND accepted_at IS NULL AND status <> 'geaccepteerd'
    RETURNING id
  `
  const facturen = await sql`
    UPDATE facturen SET klant_id = ${klantId}, bijgewerkt_op = NOW()
    WHERE klus_id = ${klusId} AND klant_id <> ${klantId}
      AND status <> 'betaald' AND moneybird_id IS NULL AND tikkie_betaald_op IS NULL
    RETURNING id
  `
  const blijven = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM offertes WHERE klus_id = ${klusId} AND klant_id <> ${klantId}) AS offertes,
      (SELECT COUNT(*)::int FROM facturen WHERE klus_id = ${klusId} AND klant_id <> ${klantId}) AS facturen
  `
  return {
    offertesMee: offertes.length,
    facturenMee: facturen.length,
    offertesOngewijzigd: Number(blijven[0]?.offertes ?? 0),
    facturenOngewijzigd: Number(blijven[0]?.facturen ?? 0),
  }
}
