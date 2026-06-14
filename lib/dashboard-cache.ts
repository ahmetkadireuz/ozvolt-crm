import { unstable_cache } from 'next/cache'
import { sql } from '@/lib/db'

export const DASHBOARD_TAG = 'dashboard'

export const getDashboardData = unstable_cache(
  async () => {
    const [stats, geldStats, nieuweKlussen, agendaVandaag, openFacturen, recenteOffertes, teLaatFacturen] = await Promise.all([
      sql`
        SELECT
          (SELECT COUNT(*)::int FROM klussen WHERE status='nieuw') AS nieuw,
          (SELECT COUNT(*)::int FROM klussen WHERE status IN ('in_behandeling','offerte_gestuurd','gepland')) AS open,
          (SELECT COUNT(*)::int FROM klanten) AS klanten,
          (SELECT COUNT(*)::int FROM offertes WHERE status IN ('concept','gestuurd')) AS offertes_open,
          (SELECT COUNT(*)::int FROM facturen WHERE status IN ('verstuurd','te_laat')) AS facturen_open,
          (SELECT COUNT(*)::int FROM facturen WHERE status='te_laat') AS te_laat
      `,
      sql`
        SELECT
          COALESCE((
            SELECT SUM(
              (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
               FROM jsonb_array_elements(regels) r)
              * (1 - korting_pct / 100.0)
              * (1 + btw_pct / 100.0)
            )
            FROM offertes WHERE status IN ('concept','gestuurd')
          ), 0) AS offertes_waarde,

          COALESCE((
            SELECT SUM(
              (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
               FROM jsonb_array_elements(regels) r)
              * (1 + btw_pct / 100.0)
            )
            FROM facturen WHERE status IN ('verstuurd','te_laat')
          ), 0) AS facturen_open_waarde,

          COALESCE((
            SELECT SUM(
              (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
               FROM jsonb_array_elements(regels) r)
              * (1 + btw_pct / 100.0)
            )
            FROM facturen WHERE status = 'te_laat'
          ), 0) AS te_laat_waarde,

          COALESCE((
            SELECT SUM(
              (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
               FROM jsonb_array_elements(regels) r)
              * (1 + btw_pct / 100.0)
            )
            FROM facturen
            WHERE status = 'betaald'
              AND DATE_TRUNC('month', factuurdatum) = DATE_TRUNC('month', CURRENT_DATE)
          ), 0) AS omzet_maand,

          COALESCE((
            SELECT SUM(
              (SELECT COALESCE(SUM((r->>'aantal')::numeric * (r->>'prijs')::numeric), 0)
               FROM jsonb_array_elements(regels) r)
              * (1 + btw_pct / 100.0)
            )
            FROM facturen
            WHERE status = 'betaald'
              AND DATE_TRUNC('month', factuurdatum) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
          ), 0) AS omzet_vorige_maand
      `,
      sql`
        SELECT k.id, k.type_werk, k.status, k.bron, k.aangemaakt_op,
               kt.naam AS klant_naam, kt.telefoon, kt.locatie
        FROM klussen k
        JOIN klanten kt ON kt.id = k.klant_id
        WHERE k.status = 'nieuw'
        ORDER BY k.aangemaakt_op DESC
        LIMIT 6
      `,
      sql`
        SELECT a.*, kt.naam AS klant_naam
        FROM agenda_items a
        LEFT JOIN klanten kt ON kt.id = a.klant_id
        WHERE DATE(a.datum_start AT TIME ZONE 'Europe/Amsterdam') = CURRENT_DATE
          AND a.status = 'gepland'
        ORDER BY a.datum_start ASC
        LIMIT 5
      `,
      sql`
        SELECT f.id, f.factuurnummer, f.status, f.factuurdatum, f.regels, f.btw_pct, kt.naam AS klant_naam
        FROM facturen f
        JOIN klanten kt ON kt.id = f.klant_id
        WHERE f.status IN ('verstuurd','te_laat')
        ORDER BY f.status DESC, f.factuurdatum ASC
        LIMIT 5
      `,
      sql`
        SELECT o.id, o.offertenummer, o.status, o.datum, o.regels, o.korting_pct, o.btw_pct, kt.naam AS klant_naam
        FROM offertes o
        JOIN klanten kt ON kt.id = o.klant_id
        WHERE o.status IN ('concept','gestuurd')
        ORDER BY o.datum DESC
        LIMIT 4
      `,
      sql`
        SELECT f.id, f.factuurnummer, kt.naam AS klant_naam, f.factuurdatum
        FROM facturen f
        JOIN klanten kt ON kt.id = f.klant_id
        WHERE f.status = 'te_laat'
        ORDER BY f.factuurdatum ASC
        LIMIT 3
      `,
    ])
    return { stats, geldStats, nieuweKlussen, agendaVandaag, openFacturen, recenteOffertes, teLaatFacturen }
  },
  ['dashboard-data-v1'],
  { revalidate: 60, tags: [DASHBOARD_TAG] }
)
