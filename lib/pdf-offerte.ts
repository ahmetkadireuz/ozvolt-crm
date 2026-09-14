import {
  NAVY, BLUE, GREEN, MUTED, LIGHT, ZACHT_OP_NAVY, TABELKOP_OP_NAVY,
  W, MARGE, FOOTER_TOP, CONTENT_BODEM,
  euro, maakPdf, documentHulp, REGEL_KOLOMMEN, tekenKop,
} from './pdf-basis'
import { berekenTotalen, documentLabel, documentLabelKlein } from './utils'

function datumNL(d: string | Date) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function genereerOffertePDF(params: {
  offertenummer: string
  klantNaam: string
  klantEmail?: string | null
  klantAdres?: string | null
  klantTelefoon?: string | null
  datum: string
  geldigTot?: string | null
  regels: Array<{ omschrijving: string; beschrijving?: string; aantal: number; prijs: number; btw?: number }>
  korting: number
  btwPct: number
  notities?: string | null
  geaccepteerdOp?: string | null
  geaccepteerdDoor?: string | null
  documenttype?: string | null
}): Promise<Buffer> {
  return maakPdf(doc => {
    const margin = MARGE
    const { tekenFooter, nieuwePagina, tekenTabelkop: kop } = documentHulp(doc, params.offertenummer)
    const tekenTabelkop = (ty: number) => kop(ty, REGEL_KOLOMMEN('STUKPRIJS'))
    const isAkkoord = !!params.geaccepteerdOp
    const label = documentLabel(params.documenttype)
    const labelKlein = documentLabelKlein(params.documenttype)

    // ── Kop ───────────────────────────────────────────────────────────────
    // Alleen een badge als hij iets zegt; een nog openstaand document
    // krijgt er geen, net als bij de factuur.
    tekenKop(doc, {
      titel: label,
      nummer: params.offertenummer,
      badge: isAkkoord ? { tekst: '✓ Akkoord', kleur: '#166534' } : null,
    })

    // ── Info blokken ──────────────────────────────────────────────────────
    let y = 140

    doc.rect(margin, y, 230, 100).fill(LIGHT)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
       .text(`${label.toUpperCase()} AAN`, margin + 14, y + 12)
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12)
       .text(params.klantNaam, margin + 14, y + 25, { width: 200 })
    let adresY = y + 43
    if (params.klantAdres) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
         .text(params.klantAdres, margin + 14, adresY, { width: 200 })
      adresY += params.klantAdres.split('\n').length * 13
    }
    if (params.klantEmail) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
         .text(params.klantEmail, margin + 14, adresY, { width: 200 })
      adresY += 13
    }
    if (params.klantTelefoon) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
         .text(params.klantTelefoon, margin + 14, adresY, { width: 200 })
    }

    const rx = margin + 255
    doc.rect(rx, y, 240, 100).fill(LIGHT)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
       .text('GEGEVENS', rx + 14, y + 12)

    const infoRows: Array<[string, string]> = [
      [`${label}nummer`, params.offertenummer],
      ['Datum', datumNL(params.datum)],
    ]
    if (params.geldigTot) infoRows.push(['Geldig tot', datumNL(params.geldigTot)])
    if (isAkkoord) infoRows.push(['Akkoord op', datumNL(params.geaccepteerdOp as string)])

    const verlopen = !isAkkoord && !!params.geldigTot && new Date(params.geldigTot) < new Date()
    infoRows.forEach(([k, v], i) => {
      const ry = y + 26 + i * 17
      doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(k, rx + 14, ry)
      const kleur = k === 'Geldig tot' && verlopen ? '#dc2626' : NAVY
      doc.fillColor(kleur).font('Helvetica-Bold').fontSize(9)
         .text(v, rx + 120, ry, { width: 110, align: 'right' })
    })

    // ── Regels ────────────────────────────────────────────────────────────
    y = 260
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
       .text('VOORGESTELDE WERKZAAMHEDEN', margin, y)
    doc.moveTo(margin, y + 12).lineTo(W - margin, y + 12).strokeColor('#d0dce8').lineWidth(1).stroke()

    y = tekenTabelkop(y + 18)

    params.regels.forEach((r, i) => {
      let beschrijvingH = 0
      if (r.beschrijving) {
        doc.font('Helvetica').fontSize(8)
        beschrijvingH = doc.heightOfString(r.beschrijving, { width: 270 })
      }
      const rowH = Math.max(22, 19 + beschrijvingH + 6)

      if (y + rowH > CONTENT_BODEM) y = tekenTabelkop(nieuwePagina())

      if (i % 2 === 1) doc.rect(margin, y, W - 2 * margin, rowH).fill('#f8fafc')
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5)
         .text(r.omschrijving || '—', margin + 10, y + 6, { width: 270 })
      if (r.beschrijving) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(8)
           .text(r.beschrijving, margin + 10, y + 19, { width: 270 })
      }
      const aantal = Number(r.aantal)
      const prijs = Number(r.prijs)
      const btw = r.btw ?? params.btwPct
      doc.fillColor(NAVY).font('Helvetica').fontSize(9)
         .text(String(aantal), margin + 285, y + 6, { width: 50, align: 'right' })
         .text(euro(prijs), margin + 340, y + 6, { width: 60, align: 'right' })
         .text(`${btw}%`, margin + 405, y + 6, { width: 30, align: 'right' })
         .font('Helvetica-Bold')
         .text(euro(aantal * prijs), margin + 440, y + 6, { width: 55, align: 'right' })
      doc.moveTo(margin, y + rowH).lineTo(W - margin, y + rowH).strokeColor('#e4e9f0').lineWidth(0.5).stroke()
      y += rowH
    })

    // ── Totalen ───────────────────────────────────────────────────────────
    y += 10
    const totalen = berekenTotalen(params.regels as any, params.korting, params.btwPct)
    const totRows: Array<[string, string]> = [['Subtotaal (excl. BTW)', euro(totalen.subtotaal)]]
    if (totalen.korting > 0) totRows.push(['Korting', `− ${euro(totalen.korting)}`])
    totRows.push([`BTW ${params.btwPct}%`, euro(totalen.btw)])

    const totalenH = totRows.length * 20 + 32
    if (y + totalenH > CONTENT_BODEM) y = nieuwePagina()

    const totWidth = 240
    const totX = W - margin - totWidth
    totRows.forEach(([l, v]) => {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(l, totX, y, { width: totWidth / 2 })
      doc.fillColor(l === 'Korting' ? GREEN : NAVY).font('Helvetica-Bold').fontSize(9.5)
         .text(v, totX + totWidth / 2, y, { width: totWidth / 2, align: 'right' })
      doc.moveTo(totX, y + 16).lineTo(totX + totWidth, y + 16).strokeColor('#e4e9f0').lineWidth(0.5).stroke()
      y += 20
    })

    doc.rect(totX, y, totWidth, 32).fill(NAVY)
    doc.fillColor(TABELKOP_OP_NAVY).font('Helvetica').fontSize(9)
       .text('Totaal incl. BTW', totX + 10, y + 9, { width: totWidth / 2 })
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(15)
       .text(euro(totalen.inclBtw), totX + totWidth / 2, y + 7, { width: totWidth / 2 - 10, align: 'right' })
    y += 42

    // ── Opmerkingen ───────────────────────────────────────────────────────
    if (params.notities) {
      doc.font('Helvetica').fontSize(9)
      const notitieH = doc.heightOfString(params.notities, { width: W - 2 * margin - 28 }) + 30
      if (y + notitieH > CONTENT_BODEM) y = nieuwePagina()
      doc.rect(margin, y, W - 2 * margin, notitieH).fill(LIGHT)
      doc.rect(margin, y, 4, notitieH).fill(BLUE)
      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
         .text('OPMERKINGEN', margin + 14, y + 10)
      doc.fillColor('#374151').font('Helvetica').fontSize(9)
         .text(params.notities, margin + 14, y + 23, { width: W - 2 * margin - 28 })
      y += notitieH + 12
    }

    // ── Akkoordblok, onderaan de pagina ───────────────────────────────────
    const blokH = 58
    const ankerY = FOOTER_TOP - 26 - blokH
    if (y > ankerY) y = nieuwePagina()
    const blokY = Math.max(y, ankerY)

    doc.rect(margin, blokY, W - 2 * margin, blokH).fill(isAkkoord ? '#f0fdf4' : LIGHT)
    doc.rect(margin, blokY, 4, blokH).fill(isAkkoord ? GREEN : NAVY)
    doc.fillColor(isAkkoord ? GREEN : BLUE).font('Helvetica-Bold').fontSize(7.5)
       .text(isAkkoord ? 'AKKOORD' : 'GELDIGHEID', margin + 14, blokY + 10)

    if (isAkkoord) {
      doc.fillColor('#166534').font('Helvetica-Bold').fontSize(12)
         .text(`Geaccepteerd op ${datumNL(params.geaccepteerdOp as string)}`, margin + 14, blokY + 23)
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
         .text(params.geaccepteerdDoor ? `Ondertekend door ${params.geaccepteerdDoor}` : 'Digitaal ondertekend via het klantportaal', margin + 14, blokY + 40)
    } else {
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12)
         .text(params.geldigTot ? `Geldig tot ${datumNL(params.geldigTot)}` : `Vrijblijvend ${labelKlein}`, margin + 14, blokY + 23)
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
         .text(`Akkoord? U kunt dit ${labelKlein} digitaal ondertekenen via de link in de e-mail.`, margin + 14, blokY + 40)
    }

    tekenFooter()
  })
}
