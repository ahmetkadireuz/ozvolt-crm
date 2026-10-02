import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { botAuth, botJson, botAlleenLezen } from '@/lib/bot-auth'
import { ibanAanwezig } from '@/lib/betalen'
import { ensureTikkieKolommen, testTikkieKoppeling, tikkieAan, tikkieGeldig, tikkieOmgeving, factuurBedragCenten } from '@/lib/tikkie'

export const dynamic = 'force-dynamic'

// GET /api/bot/tikkie — diagnose van de Tikkie-koppeling. Alleen lezen.
// Geeft nooit (delen van) sleutels terug: alleen ja/nee, de omgeving en de foutmelding van ABN.
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req, 'finance')
  if (geweigerd) return geweigerd

  await ensureTikkieKolommen()
  const [test, meldingen, facturen] = await Promise.all([
    tikkieAan() ? testTikkieKoppeling() : Promise.resolve({ ok: false, melding: 'Tikkie-env ontbreekt' }),
    sql`
      SELECT titel, bericht, aangemaakt_op FROM admin_notifications
      WHERE type IN ('tikkie_fout', 'tikkie_deelbetaling') OR titel ILIKE '%tikkie%'
      ORDER BY aangemaakt_op DESC LIMIT 10
    `,
    sql`
      SELECT id, factuurnummer, status, soort, betaling_50_50, regels, btw_pct,
             tikkie_token IS NOT NULL AS heeft_token, tikkie_url, tikkie_bedrag_centen, tikkie_verloopt_op,
             tikkie_aangemaakt_op, tikkie_betaald_op
      FROM facturen WHERE status IN ('verstuurd', 'te_laat') OR tikkie_token IS NOT NULL
      ORDER BY id DESC LIMIT 20
    `,
  ])

  return botJson({
    env: {
      TIKKIE_API_KEY: !!process.env.TIKKIE_API_KEY,
      TIKKIE_APP_TOKEN: !!process.env.TIKKIE_APP_TOKEN,
      TIKKIE_OMGEVING: process.env.TIKKIE_OMGEVING ? tikkieOmgeving() : null,
      BEDRIJF_IBAN: ibanAanwezig(),
      SITE_URL: !!process.env.SITE_URL,
    },
    omgeving: tikkieOmgeving(),
    test,
    meldingen,
    facturen: facturen.map((f: any) => ({
      id: f.id,
      factuurnummer: f.factuurnummer,
      status: f.status,
      soort: f.soort,
      oude_5050: !!f.betaling_50_50,
      bedrag_centen: factuurBedragCenten(f),
      heeft_tikkie: f.heeft_token,
      tikkie_geldig: tikkieGeldig(f),
      tikkie_bedrag_centen: f.tikkie_bedrag_centen,
      tikkie_verloopt_op: f.tikkie_verloopt_op,
      tikkie_aangemaakt_op: f.tikkie_aangemaakt_op,
      tikkie_betaald_op: f.tikkie_betaald_op,
    })),
  })
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
