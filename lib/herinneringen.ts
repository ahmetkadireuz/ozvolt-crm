import { sql, berekenTotalen, formatEuro } from '@/lib/db'
import { sendMail, herinneringMailHtml } from '@/lib/mail'
import { tikkieVoorFactuur } from '@/lib/tikkie'

/* ============================================================
   Automatische betalingsherinneringen (dagelijks via de cron):
   1e herinnering 3 dagen na de vervaldatum, 2e na 10 dagen,
   elk met een verse Tikkie-link. Daarna alleen een melding aan
   Ahmet om zelf contact op te nemen.
   ============================================================ */

let _ensured = false
async function ensureKolommen() {
  if (_ensured) return
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinneringen INTEGER NOT NULL DEFAULT 0`
  await sql`ALTER TABLE facturen ADD COLUMN IF NOT EXISTS herinnering_laatst TIMESTAMPTZ`
  _ensured = true
}

export async function stuurHerinneringen(): Promise<string[]> {
  await ensureKolommen()
  const rows = await sql`
    SELECT f.id, f.factuurnummer, f.factuurdatum, f.betalingstermijn, f.regels, f.btw_pct, f.herinneringen,
           k.naam AS klant_naam, k.email AS klant_email,
           (f.factuurdatum + COALESCE(f.betalingstermijn, 14))::date AS vervaldatum
    FROM facturen f JOIN klanten k ON k.id = f.klant_id
    WHERE f.status IN ('verstuurd', 'te_laat')
      AND k.email IS NOT NULL AND k.email <> ''
      AND (
        (f.herinneringen = 0 AND (f.factuurdatum + COALESCE(f.betalingstermijn, 14)) + 3 <= CURRENT_DATE)
        OR (f.herinneringen = 1 AND (f.factuurdatum + COALESCE(f.betalingstermijn, 14)) + 10 <= CURRENT_DATE
            AND (f.herinnering_laatst IS NULL OR f.herinnering_laatst < NOW() - INTERVAL '5 days'))
      )
  `
  const verstuurd: string[] = []
  for (const f of rows as any[]) {
    const tweede = f.herinneringen === 1
    try {
      let betaalUrl: string | null = null
      try { betaalUrl = await tikkieVoorFactuur(f.id) } catch (err) { console.error('[herinnering tikkie]', f.factuurnummer, err) }
      const totaal = berekenTotalen(Array.isArray(f.regels) ? f.regels : [], 0, Number(f.btw_pct ?? 21)).inclBtw

      await sendMail({
        to: f.klant_email,
        subject: `${tweede ? 'Tweede herinnering' : 'Herinnering'}: betaalnota ${f.factuurnummer} — Ozvolt Elektrotechniek`,
        html: herinneringMailHtml({
          klantNaam: f.klant_naam,
          factuurNr: f.factuurnummer,
          bedrag: formatEuro(totaal),
          vervaldatum: new Date(f.vervaldatum).toLocaleDateString('nl-NL'),
          betaalUrl,
          tweede,
        }),
      })
      await sql`
        UPDATE facturen SET herinneringen = herinneringen + 1, herinnering_laatst = NOW(), status = 'te_laat'
        WHERE id = ${f.id}
      `
      await sql`
        INSERT INTO admin_notifications (type, titel, bericht, link)
        VALUES ('factuur_herinnering', ${`${tweede ? '2e' : '1e'} herinnering verstuurd: ${f.factuurnummer}`},
          ${tweede
            ? `${f.klant_naam} heeft na twee herinneringen nog niet betaald. Neem zelf contact op.`
            : `${f.klant_naam} kreeg automatisch een herinnering met betaallink.`},
          ${`/facturen/${f.id}`})
      `
      verstuurd.push(`${f.factuurnummer} (${tweede ? 2 : 1})`)
    } catch (err) {
      console.error('[herinnering]', f.factuurnummer, err)
    }
  }
  return verstuurd
}
