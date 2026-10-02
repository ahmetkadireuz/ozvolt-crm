import { NextRequest } from 'next/server'
import { sql, berekenTotalen } from '@/lib/db'
import { standaardProfiel, type FiscaalProfiel } from '@/lib/fiscaal/profiel'
import { tarievenVoor, tarievenBekend } from '@/lib/fiscaal/tarieven'
import { urenEis } from '@/lib/fiscaal/analyse'
import { botAuth, botJson, botAlleenLezen, parseRegels, rond, leeg } from '@/lib/bot-auth'

export const dynamic = 'force-dynamic'

/** Profiel lezen zonder de tabel aan te maken (haalProfiel doet CREATE TABLE) */
async function leesProfiel(jaar: number): Promise<{ profiel: FiscaalProfiel; ingevuld: boolean }> {
  const rows = await sql`SELECT * FROM fiscaal_profiel WHERE jaar = ${jaar}`.catch(leeg)
  const r: any = rows[0]
  if (!r) return { profiel: standaardProfiel(jaar), ingevuld: false }
  return {
    ingevuld: true,
    profiel: {
      jaar: r.jaar,
      loon_cumulatief: Number(r.loon_cumulatief),
      loonheffing_cumulatief: Number(r.loonheffing_cumulatief),
      loon_tm_maand: Number(r.loon_tm_maand),
      extra_loon: Number(r.extra_loon),
      start_datum: r.start_datum ? new Date(r.start_datum).toISOString().slice(0, 10) : null,
      uren_loondienst_per_week: Number(r.uren_loondienst_per_week),
      urencriterium: !!r.urencriterium,
      starter: !!r.starter,
      reserve_apart: Number(r.reserve_apart),
      bijgewerkt_op: r.bijgewerkt_op,
    },
  }
}

// GET /api/bot/fiscaal?jaar=2026 — urenregistratie/urencriterium en btw per kwartaal uit het CRM.
// Cijfers uit Moneybird (omzet, kosten, voorbelasting) staan onder /api/bot/moneybird/* (finance-sleutel).
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const jaarRaw = req.nextUrl.searchParams.get('jaar') ?? ''
  const jaar = /^\d{4}$/.test(jaarRaw) ? parseInt(jaarRaw) : new Date().getFullYear()

  try {
    const [{ profiel, ingevuld }, urenRows, factuurRows] = await Promise.all([
      leesProfiel(jaar),
      sql`
        SELECT EXTRACT(QUARTER FROM datum)::int AS kwartaal, COALESCE(SUM(uren), 0) AS uren
        FROM project_uren WHERE EXTRACT(YEAR FROM datum) = ${jaar}
        GROUP BY 1
      `.catch(leeg),
      sql`
        SELECT EXTRACT(QUARTER FROM factuurdatum)::int AS kwartaal, regels, btw_pct
        FROM facturen
        WHERE EXTRACT(YEAR FROM factuurdatum) = ${jaar} AND status <> 'concept'
      `,
    ])

    const t = tarievenVoor(jaar)
    const { urenLoondienstJaar, urenNodig } = urenEis(profiel, t)

    const kwartalen = [1, 2, 3, 4].map(q => {
      const uren = Number(urenRows.find((r: any) => r.kwartaal === q)?.uren ?? 0)
      const facturen = factuurRows.filter((f: any) => f.kwartaal === q)
      let omzet = 0, btw = 0
      const perTarief = new Map<number, { omzet_ex_btw: number; btw: number }>()
      for (const f of facturen) {
        const pct = Number(f.btw_pct ?? 21)
        const tot = berekenTotalen(parseRegels(f.regels), 0, pct)
        omzet += tot.naTotaal
        btw += tot.btw
        const cur = perTarief.get(pct) ?? { omzet_ex_btw: 0, btw: 0 }
        cur.omzet_ex_btw += tot.naTotaal
        cur.btw += tot.btw
        perTarief.set(pct, cur)
      }
      return {
        kwartaal: `${jaar}-Q${q}`,
        gewerkte_uren: rond(uren),
        aantal_facturen: facturen.length,
        omzet_ex_btw: rond(omzet),
        btw_omzet: rond(btw),
        per_tarief: Array.from(perTarief.entries()).map(([btw_pct, v]) => ({
          btw_pct, omzet_ex_btw: rond(v.omzet_ex_btw), btw: rond(v.btw),
        })),
      }
    })

    const urenTotaal = rond(kwartalen.reduce((s, k) => s + k.gewerkte_uren, 0))

    return botJson({
      jaar,
      profiel_ingevuld: ingevuld,
      tarieven_bekend: tarievenBekend(jaar),
      urencriterium: {
        gewerkte_uren: urenTotaal,
        bron: 'Projecturen in het CRM (project_uren); niet-projecturen (administratie, acquisitie) staan hier niet in.',
        minimum_uren: t.urencriterium,
        uren_loondienst_per_week: profiel.uren_loondienst_per_week,
        uren_loondienst_jaar: urenLoondienstJaar,
        uren_nodig: urenNodig,
        nog_nodig: rond(Math.max(0, urenNodig - urenTotaal)),
        gehaald: urenTotaal >= urenNodig,
        urencriterium_aangevinkt_in_profiel: profiel.urencriterium,
        starter: profiel.starter,
      },
      btw_per_kwartaal: kwartalen,
      btw_toelichting: 'Af te dragen btw over CRM-facturen (geen concepten), op factuurdatum. Voorbelasting op inkoop staat in Moneybird: zie /api/bot/moneybird/btw.',
    })
  } catch (err) {
    console.error('[bot/fiscaal] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

export const { POST, PUT, PATCH, DELETE } = botAlleenLezen
