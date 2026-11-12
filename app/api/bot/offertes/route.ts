import { NextRequest } from 'next/server'
import { sql, berekenTotalen, type RegelItem } from '@/lib/db'
import { botAuth, botSchrijfAuth, botJson, botMethodeNietToegestaan, offerteNummer, parseRegels, rond, datumStr } from '@/lib/bot-auth'
import { vindOfMaakKlant } from '@/lib/klanten'
import { maakProject } from '@/lib/projecten'
import { actieveOfferte, getekendeOfferte, maakOfferteVoorProject, ensureOfferteKolommen } from '@/lib/offertes'
import { ensureUoKolom } from '@/lib/offerte-sjablonen'
import { normaliseerUoItem, type UoItem } from '@/lib/uitgangspunten'
import { stuurPushMelding } from '@/lib/melding'

export const dynamic = 'force-dynamic'

// GET /api/bot/offertes?zoek=<tekst>&status=<status>&limit=<n> — alleen-lezen lijst voor de Claude-bots
export async function GET(req: NextRequest) {
  const geweigerd = botAuth(req)
  if (geweigerd) return geweigerd

  const sp = req.nextUrl.searchParams
  const zoek = (sp.get('zoek') ?? '').trim().slice(0, 100)
  const status = (sp.get('status') ?? '').trim().slice(0, 30)
  const limitRaw = parseInt(sp.get('limit') ?? '20')
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100)

  // "OZVT-0012", "0012" of "12" → zoek ook op offertenummer
  const nrMatch = zoek.match(/^(?:ozvt-?)?0*(\d+)$/i)
  const nummer = nrMatch ? parseInt(nrMatch[1]) : null
  const patroon = zoek ? `%${zoek.replace(/[\\%_]/g, m => '\\' + m)}%` : null

  try {
    const rows = await sql`
      SELECT o.id, o.offertenummer, o.status, o.datum, o.regels, o.korting_pct, o.btw_pct,
             k.id AS klant_id, k.naam AS klant_naam, ks.type_werk AS klus_titel
      FROM offertes o
      JOIN klanten k ON k.id = o.klant_id
      LEFT JOIN klussen ks ON ks.id = o.klus_id
      WHERE (${status || null}::text IS NULL OR o.status = ${status || null})
        AND (
          ${patroon}::text IS NULL
          OR k.naam ILIKE ${patroon}
          OR ks.type_werk ILIKE ${patroon}
          OR o.regels->0->>'omschrijving' ILIKE ${patroon}
          OR ('OZVT-' || LPAD(o.offertenummer::text, 4, '0')) ILIKE ${patroon}
          OR (${nummer}::int IS NOT NULL AND o.offertenummer = ${nummer})
        )
      ORDER BY o.datum DESC, o.id DESC
      LIMIT ${limit}
    `

    const offertes = rows.map((o: any) => {
      const regels = parseRegels(o.regels)
      const t = berekenTotalen(regels, Number(o.korting_pct ?? 0), Number(o.btw_pct ?? 21))
      return {
        id: o.id,
        offertenummer: offerteNummer(o.offertenummer),
        titel: o.klus_titel || regels[0]?.omschrijving || null,
        status: o.status,
        datum: datumStr(o.datum),
        klant_id: o.klant_id,
        klant_naam: o.klant_naam,
        totaal_ex_btw: rond(t.naTotaal),
        totaal_incl_btw: rond(t.inclBtw),
      }
    })

    return botJson({ aantal: offertes.length, offertes })
  } catch (err) {
    console.error('[bot/offertes] ophalen mislukt:', err)
    return botJson({ fout: 'Ophalen mislukt' }, 500)
  }
}

/* ============================================================
   POST /api/bot/offertes — de offertebot zet een offerte als CONCEPT in het CRM.
   Alleen nieuwe concepten: nooit versturen, mailen, status wijzigen of bestaande
   offertes/klanten/facturen wijzigen. Alleen met BOT_SCHRIJVEN=aan.
   Zie docs/BOT_API.md voor de body.
   ============================================================ */

const MAX_BODY_BYTES = 100 * 1024
const BTW_TARIEVEN = [0, 9, 21]

type Fouten = Record<string, string>

const tekst = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null) return null
  const t = String(v).trim()
  return t ? t.slice(0, max) : null
}
const getal = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const positiefId = (v: unknown): number | null =>
  (typeof v === 'number' || typeof v === 'string') && /^\d+$/.test(String(v)) && Number(v) > 0 ? Number(v) : null

type Invoer = {
  klant: { id: number } | { naam: string; email: string | null; telefoon: string | null; locatie: string | null; type: 'Particulier' | 'Zakelijk' } | null
  klusId: number | null
  project: { type_werk: string; omschrijving: string | null } | null
  regels: RegelItem[]
  btwPct: number
  uoItems: UoItem[]
  vijftigVijftig: boolean
  notities: string | null
}

function valideer(body: any): { invoer: Invoer } | { fouten: Fouten } {
  const f: Fouten = {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { fouten: { body: 'De body moet een JSON-object zijn' } }

  // Project
  let klusId: number | null = null
  if (body.klus_id !== undefined && body.klus_id !== null) {
    klusId = positiefId(body.klus_id)
    if (!klusId) f.klus_id = 'klus_id moet een positief geheel getal zijn'
  }
  let project: Invoer['project'] = null
  if (!klusId && !f.klus_id) {
    const p = body.project
    const typeWerk = p && typeof p === 'object' ? tekst(p.type_werk, 255) : null
    if (!typeWerk) f['project.type_werk'] = 'Vul project.type_werk in (of geef een bestaand klus_id mee)'
    else project = { type_werk: typeWerk, omschrijving: tekst(p.omschrijving, 5000) }
  }

  // Klant
  let klant: Invoer['klant'] = null
  const k = body.klant
  if (k !== undefined && k !== null) {
    if (typeof k !== 'object' || Array.isArray(k)) f.klant = 'klant moet een object zijn: { id } of { naam, email?, telefoon?, locatie?, type? }'
    else if (k.id !== undefined && k.id !== null) {
      const id = positiefId(k.id)
      if (!id) f['klant.id'] = 'klant.id moet een positief geheel getal zijn'
      else klant = { id }
    } else {
      const naam = tekst(k.naam, 255)
      if (!naam) f['klant.naam'] = 'Naam van de klant ontbreekt'
      if (k.type !== undefined && k.type !== null && k.type !== 'Particulier' && k.type !== 'Zakelijk') {
        f['klant.type'] = "klant.type moet 'Particulier' of 'Zakelijk' zijn"
      }
      const email = tekst(k.email, 255)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) f['klant.email'] = 'Ongeldig e-mailadres'
      if (naam) klant = {
        naam, email, telefoon: tekst(k.telefoon, 50), locatie: tekst(k.locatie, 255),
        type: k.type === 'Zakelijk' ? 'Zakelijk' : 'Particulier',
      }
    }
  } else if (!klusId) {
    f.klant = 'Geef een klant mee ({ id } of { naam, … }) of een bestaand klus_id'
  }

  // Regels
  const regels: RegelItem[] = []
  const tarieven = new Set<number>()
  if (!Array.isArray(body.regels) || body.regels.length < 1 || body.regels.length > 50) {
    f.regels = 'regels moet een lijst met 1 tot 50 regels zijn'
  } else {
    body.regels.forEach((r: any, i: number) => {
      const pad = `regels[${i}]`
      if (!r || typeof r !== 'object') { f[pad] = 'Regel moet een object zijn'; return }
      const omschrijving = tekst(r.omschrijving, 500)
      const aantal = getal(r.aantal)
      const prijs = getal(r.prijs_ex_btw)
      const btw = getal(r.btw_tarief)
      if (!omschrijving) f[`${pad}.omschrijving`] = 'Omschrijving ontbreekt'
      if (aantal === null || aantal <= 0) f[`${pad}.aantal`] = 'Aantal moet groter dan 0 zijn'
      if (prijs === null || prijs < 0) f[`${pad}.prijs_ex_btw`] = 'Prijs (ex btw) moet 0 of hoger zijn'
      if (btw === null || !BTW_TARIEVEN.includes(btw)) f[`${pad}.btw_tarief`] = 'btw_tarief moet 0, 9 of 21 zijn'
      if (omschrijving && aantal !== null && aantal > 0 && prijs !== null && prijs >= 0 && btw !== null && BTW_TARIEVEN.includes(btw)) {
        tarieven.add(btw)
        // Zelfde regelobject als de offerte-editor (components/RegelEditor.tsx)
        regels.push({
          omschrijving,
          beschrijving: tekst(r.beschrijving, 5000) ?? '',
          aantal: Math.round(aantal * 100) / 100,
          prijs: Math.round(prijs * 100) / 100,
          btw,
        })
      }
    })
    // De offerte rekent met één btw-tarief over het totaal (btw_pct); gemengde tarieven kan het CRM niet tonen
    if (tarieven.size > 1) f.regels = 'Alle regels moeten hetzelfde btw_tarief hebben (de offerte rekent met één btw-tarief)'
  }

  // Uitgangspunten & opties
  const uoItems: UoItem[] = []
  if (body.uitgangspunten !== undefined && body.uitgangspunten !== null) {
    if (!Array.isArray(body.uitgangspunten) || body.uitgangspunten.length > 50) f.uitgangspunten = 'uitgangspunten moet een lijst van maximaal 50 items zijn'
    else body.uitgangspunten.forEach((u: any, i: number) => {
      const t = u && typeof u === 'object' ? tekst(u.tekst, 10000) : null
      if (!t) f[`uitgangspunten[${i}].tekst`] = 'Tekst ontbreekt'
      else uoItems.push(normaliseerUoItem({ soort: 'uitgangspunt', titel: tekst(u.titel, 300) ?? '', tekst: t }))
    })
  }
  if (body.opties !== undefined && body.opties !== null) {
    if (!Array.isArray(body.opties) || body.opties.length > 50) f.opties = 'opties moet een lijst van maximaal 50 items zijn'
    else body.opties.forEach((o: any, i: number) => {
      const titel = o && typeof o === 'object' ? tekst(o.titel, 300) : null
      if (!titel) { f[`opties[${i}].titel`] = 'Titel ontbreekt'; return }
      let meerprijs: number | null = null
      if (o.meerprijs !== undefined && o.meerprijs !== null && o.meerprijs !== '') {
        meerprijs = getal(o.meerprijs)
        if (meerprijs === null || meerprijs < 0) { f[`opties[${i}].meerprijs`] = 'Meerprijs (ex btw) moet 0 of hoger zijn'; return }
      }
      uoItems.push(normaliseerUoItem({ soort: 'optie', titel, tekst: tekst(o.tekst, 10000) ?? '', meerprijs }))
    })
  }

  // Betaalplan
  const bp = body.betaalplan ?? 'volledig'
  if (bp !== 'volledig' && bp !== '50_50') f.betaalplan = "betaalplan moet 'volledig' of '50_50' zijn"

  if (body.notities_intern !== undefined && body.notities_intern !== null && typeof body.notities_intern !== 'string') {
    f.notities_intern = 'notities_intern moet tekst zijn'
  }

  if (Object.keys(f).length) return { fouten: f }
  return {
    invoer: {
      klant, klusId, project, regels,
      btwPct: regels[0]?.btw ?? 21,
      uoItems,
      vijftigVijftig: bp === '50_50',
      notities: tekst(body.notities_intern, 10000),
    },
  }
}

export async function POST(req: NextRequest) {
  const geweigerd = botSchrijfAuth(req)
  if (geweigerd) return geweigerd

  // Body lezen met limiet (nooit loggen: bevat klantgegevens)
  const lengte = Number(req.headers.get('content-length') ?? 0)
  if (lengte > MAX_BODY_BYTES) return botJson({ fout: 'Body is te groot (maximaal 100 kB)' }, 413)
  let body: unknown
  try {
    const ruw = await req.text()
    if (Buffer.byteLength(ruw, 'utf8') > MAX_BODY_BYTES) return botJson({ fout: 'Body is te groot (maximaal 100 kB)' }, 413)
    body = JSON.parse(ruw)
  } catch {
    return botJson({ fout: 'Ongeldige JSON' }, 400)
  }

  const v = valideer(body)
  if ('fouten' in v) return botJson({ fout: 'Ongeldige invoer', velden: v.fouten }, 400)
  const inv = v.invoer

  try {
    await ensureOfferteKolommen()
    await ensureUoKolom()

    let klantId: number
    let klantNaam: string
    let klantBestaand: boolean
    let klusId: number

    if (inv.klusId) {
      // Bestaand project: de klant komt altijd van het project
      const p = await sql`SELECT k.id, k.klant_id, kt.naam FROM klussen k JOIN klanten kt ON kt.id = k.klant_id WHERE k.id = ${inv.klusId}`
      if (!p[0]) return botJson({ fout: 'Project niet gevonden', velden: { klus_id: 'Onbekend project' } }, 404)
      if (inv.klant && 'id' in inv.klant && inv.klant.id !== p[0].klant_id) {
        return botJson({ fout: 'Ongeldige invoer', velden: { 'klant.id': 'Deze klant hoort niet bij dit project' } }, 400)
      }
      const getekend = await getekendeOfferte(inv.klusId)
      if (getekend) return botJson({ fout: 'Dit project heeft al een getekende offerte', bestaande_offerte_id: getekend.id }, 409)
      const actief = await actieveOfferte(inv.klusId)
      if (actief) return botJson({ fout: 'Dit project heeft al een actieve offerte', bestaande_offerte_id: actief.id }, 409)
      klusId = inv.klusId
      klantId = p[0].klant_id
      klantNaam = p[0].naam
      klantBestaand = true
    } else {
      if (inv.klant && 'id' in inv.klant) {
        const kr = await sql`SELECT id, naam FROM klanten WHERE id = ${inv.klant.id}`
        if (!kr[0]) return botJson({ fout: 'Klant niet gevonden', velden: { 'klant.id': 'Onbekende klant' } }, 404)
        klantId = kr[0].id
        klantNaam = kr[0].naam
        klantBestaand = true
      } else {
        // Nooit dubbel; bij een bestaande klant worden alleen lege velden aangevuld
        const kl = await vindOfMaakKlant(inv.klant!)
        klantId = kl.id
        klantNaam = kl.naam
        klantBestaand = kl.bestaand
      }
      klusId = await maakProject({
        klant_id: klantId, type_werk: inv.project!.type_werk, omschrijving: inv.project!.omschrijving, bron: 'bot',
      })
    }

    const offerteId = await maakOfferteVoorProject(klusId)
    const rows = await sql`
      UPDATE offertes SET
        regels = ${JSON.stringify(inv.regels)}::jsonb,
        btw_pct = ${inv.btwPct},
        uo_items = ${JSON.stringify(inv.uoItems)}::jsonb,
        betaling_50_50 = ${inv.vijftigVijftig},
        notities = ${inv.notities},
        aangemaakt_door = 'bot',
        bijgewerkt_op = NOW()
      WHERE id = ${offerteId} AND status = 'concept'
      RETURNING offertenummer
    `
    const nummer = offerteNummer(rows[0].offertenummer)

    await stuurPushMelding({
      titel: 'Nieuwe concept-offerte van de bot',
      bericht: `${nummer} – ${klantNaam}`,
      link: `/offertes/${offerteId}`,
    })

    const t = berekenTotalen(inv.regels, 0, inv.btwPct)
    return botJson({
      id: offerteId,
      offertenummer: nummer,
      klant_id: klantId,
      klant_bestaand: klantBestaand,
      klus_id: klusId,
      totalen: {
        totaal_ex_btw: rond(t.naTotaal),
        btw_pct: inv.btwPct,
        btw: rond(t.btw),
        totaal_incl_btw: rond(t.inclBtw),
        ...(inv.vijftigVijftig ? {
          eerste_termijn_incl_btw: rond(t.inclBtw / 2),
          tweede_termijn_incl_btw: rond(t.inclBtw - rond(t.inclBtw / 2)),
        } : {}),
      },
      url: `/offertes/${offerteId}`,
    }, 201)
  } catch (err: any) {
    // Geen body/klantgegevens in de log
    console.error('[bot/offertes] concept aanmaken mislukt:', err?.code ?? '', err?.message ?? 'onbekende fout')
    return botJson({ fout: 'Aanmaken mislukt' }, 500)
  }
}

const alleenGetPost = () => botMethodeNietToegestaan('GET, POST')
export const PUT = alleenGetPost
export const PATCH = alleenGetPost
export const DELETE = alleenGetPost
