import { sql, berekenTotalen } from '@/lib/db'
import { zorgVoorMoneybirdFactuur } from '@/lib/moneybird-sync'
import { mbMarkeerBetaald } from '@/lib/moneybird'

/* ============================================================
   Alles wat er gebeurt zodra een factuur betaald is:
   1. factuur op 'betaald' (precies één keer, ook bij dubbele meldingen)
   2. betaling registreren in Moneybird (niet als Moneybird zelf de bron is)
   3. project bijwerken: voorschot → 'gepland', eind/gewone factuur → 'afgerond'
   4. melding in het CRM
   ============================================================ */

// Projectstatussen in volgorde; een betaling zet een project nooit terug
const VOLGORDE = ['nieuw', 'in_behandeling', 'offerte_gestuurd', 'gepland', 'afgerond']

export async function verwerkBetaling(
  factuurId: number,
  bron: 'tikkie' | 'moneybird',
): Promise<boolean> {
  const rows = await sql`
    UPDATE facturen SET status = 'betaald', bijgewerkt_op = NOW()
    WHERE id = ${factuurId} AND status <> 'betaald'
    RETURNING id, factuurnummer, klus_id, soort, regels, btw_pct, moneybird_id
  `
  const f: any = rows[0]
  if (!f) return false // al verwerkt

  const fouten: string[] = []

  if (bron !== 'moneybird' && process.env.MONEYBIRD_API_TOKEN && process.env.MONEYBIRD_ADMIN_ID) {
    try {
      const regels = Array.isArray(f.regels) ? f.regels : []
      const totaal = berekenTotalen(regels, 0, Number(f.btw_pct ?? 21)).inclBtw
      const mbId = f.moneybird_id ?? (await zorgVoorMoneybirdFactuur(f.id)).moneybirdId
      await mbMarkeerBetaald(String(mbId), totaal)
    } catch (err) {
      console.error('[betaling → moneybird]', f.factuurnummer, err)
      fouten.push('Moneybird kon niet automatisch bijgewerkt worden; zet de betaling daar handmatig.')
    }
  }

  let projectTekst = ''
  if (f.klus_id) {
    const doel = f.soort === 'voorschot' ? 'gepland' : 'afgerond'
    try {
      const k = await sql`SELECT status FROM klussen WHERE id = ${f.klus_id}`
      const huidig = k[0]?.status as string | undefined
      if (huidig && VOLGORDE.indexOf(huidig) < VOLGORDE.indexOf(doel)) {
        await sql`UPDATE klussen SET status = ${doel}, bijgewerkt_op = NOW() WHERE id = ${f.klus_id}`
        projectTekst = ` Project staat nu op ${doel === 'gepland' ? 'Gepland' : 'Afgerond'}.`
      }
    } catch (err) {
      console.error('[betaling → project]', f.factuurnummer, err)
    }
  }

  const via = bron === 'tikkie' ? 'via Tikkie (iDEAL), het geld staat op je ABN AMRO-rekening.' : 'via Moneybird.'
  await sql`
    INSERT INTO admin_notifications (type, titel, bericht, link)
    VALUES ('factuur_betaald', ${`Factuur ${f.factuurnummer} betaald`},
      ${`Betaald ${via}${projectTekst}${fouten.length ? ' ' + fouten.join(' ') : ''}`},
      ${`/facturen/${f.id}`})
  `
  return true
}
