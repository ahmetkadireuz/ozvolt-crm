import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { analyseerDocument } from '@/lib/bonnen/ai'
import { bewaarAnalyse, haalAnalyses, haalDocument, haalGrootboeken, wijzigCategorieen, zetStatus, type DocSoort } from '@/lib/bonnen/data'

// AI-analyse van een pdf kan even duren
export const maxDuration = 60

const SOORTEN: DocSoort[] = ['purchase_invoices', 'receipts']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireSession()) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  if (!process.env.MONEYBIRD_API_TOKEN || !process.env.MONEYBIRD_ADMIN_ID) {
    return NextResponse.json({ error: 'Moneybird is niet gekoppeld' }, { status: 503 })
  }

  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Ongeldig document' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const soort = body.soort as DocSoort
  if (!SOORTEN.includes(soort)) return NextResponse.json({ error: 'Ongeldig documenttype' }, { status: 400 })

  try {
    switch (body.actie) {
      case 'analyseer': {
        const [doc, grootboeken] = await Promise.all([haalDocument(soort, id), haalGrootboeken()])
        try {
          const analyse = await analyseerDocument(soort, doc, grootboeken)
          await bewaarAnalyse(id, soort, 'geanalyseerd', analyse, null)
          return NextResponse.json({ ok: true, analyse })
        } catch (err) {
          const fout = err instanceof Error ? err.message : String(err)
          await bewaarAnalyse(id, soort, 'fout', null, fout)
          return NextResponse.json({ error: fout }, { status: 502 })
        }
      }

      case 'toepassen': {
        // Alleen wat de gebruiker expliciet heeft goedgekeurd; alleen bestaande regels en rekeningen
        const wijzigingen = Array.isArray(body.wijzigingen) ? body.wijzigingen : []
        const [doc, grootboeken] = await Promise.all([haalDocument(soort, id), haalGrootboeken()])
        const regelIds = new Set((doc?.details ?? []).map((d: any) => String(d.id)))
        const rekeningIds = new Set(grootboeken.map(g => g.id))
        const geldig = wijzigingen
          .map((w: any) => ({ detail_id: String(w.detail_id), ledger_account_id: String(w.ledger_account_id) }))
          .filter((w: { detail_id: string; ledger_account_id: string }) => regelIds.has(w.detail_id) && rekeningIds.has(w.ledger_account_id))
        if (geldig.length === 0) return NextResponse.json({ error: 'Geen geldige wijzigingen' }, { status: 400 })

        await wijzigCategorieen(soort, id, geldig)
        const bestaand = (await haalAnalyses()).get(id)
        if (bestaand) await zetStatus(id, 'toegepast')
        else await bewaarAnalyse(id, soort, 'toegepast', null, null)
        return NextResponse.json({ ok: true, gewijzigd: geldig.length })
      }

      case 'negeren': {
        const bestaand = (await haalAnalyses()).get(id)
        if (bestaand) await zetStatus(id, 'genegeerd')
        else await bewaarAnalyse(id, soort, 'genegeerd', null, null)
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
    }
  } catch (err) {
    console.error('[bonnen]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Onbekende fout' }, { status: 500 })
  }
}
