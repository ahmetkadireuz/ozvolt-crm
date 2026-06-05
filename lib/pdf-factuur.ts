import PDFDocument from 'pdfkit'

const NAVY = '#1d2f4c'
const BLUE = '#4c7191'
const GREEN = '#15803d'
const MUTED = '#64748b'
const LIGHT = '#f0f4f8'

function euro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function hex(color: string): [number, number, number] {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return [r, g, b]
}

export async function genereerFactuurPDF(params: {
  factuurnummer: string
  klantNaam: string
  klantEmail?: string | null
  klantAdres?: string | null
  klantTelefoon?: string | null
  factuurdatum: string
  betalingstermijn: number
  regels: Array<{ omschrijving: string; beschrijving?: string; aantal: number; prijs: number; btw?: number }>
  btwPct: number
  notities?: string | null
  status: string
  betaalUrl?: string | null
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = 595.28
    const margin = 50

    // ── Header achtergrond ────────────────────────────────────────────────
    doc.rect(0, 0, W, 120).fill(NAVY)
    doc.rect(0, 120, W, 4).fill(BLUE)

    // Bedrijfsnaam in header
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16)
       .text('Ozvolt Elektrotechniek', margin, 28)
    doc.fillColor('rgba(255,255,255,0.55)').font('Helvetica').fontSize(9)
       .text('KVK 99837366  ·  BTW NL005413208B33  ·  06 449 98 789', margin, 50)
    doc.fillColor('rgba(255,255,255,0.55)').fontSize(9)
       .text('info@ozvoltelektro.nl  ·  ozvoltelektro.nl', margin, 64)

    // Betaalnota label + nummer rechts
    doc.fillColor('rgba(255,255,255,0.45)').font('Helvetica').fontSize(8)
       .text('DOCUMENT', W - 180, 28, { width: 130, align: 'right' })
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
       .text('Betaalnota', W - 180, 40, { width: 130, align: 'right' })
    doc.fillColor('rgba(255,255,255,0.6)').font('Helvetica').fontSize(10)
       .text(params.factuurnummer, W - 180, 66, { width: 130, align: 'right' })

    // Status badge
    const statusColor = params.status === 'betaald' ? '#166534' : '#1e3a5f'
    const statusText = params.status === 'betaald' ? '✓ Betaald' : params.status === 'te_laat' ? '⚠ Vervallen' : 'Openstaand'
    doc.roundedRect(W - 120, 88, 72, 20, 4).fill(statusColor)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
       .text(statusText, W - 120, 94, { width: 72, align: 'center' })

    // ── Info blokken ──────────────────────────────────────────────────────
    let y = 140

    // Factuur aan (links)
    doc.rect(margin, y, 230, 100).fill(LIGHT)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
       .text('FACTUUR AAN', margin + 14, y + 12)
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12)
       .text(params.klantNaam, margin + 14, y + 25, { width: 200 })
    let adresY = y + 43
    if (params.klantAdres) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9)
         .text(params.klantAdres, margin + 14, adresY, { width: 200 })
      adresY += (params.klantAdres.split('\n').length * 13)
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

    // Factuurgegevens (rechts)
    const rx = margin + 255
    doc.rect(rx, y, 240, 100).fill(LIGHT)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
       .text('FACTUURGEGEVENS', rx + 14, y + 12)

    const vervalDatum = new Date(params.factuurdatum)
    vervalDatum.setDate(vervalDatum.getDate() + params.betalingstermijn)
    const teLaat = params.status !== 'betaald' && vervalDatum < new Date()

    const infoRows = [
      ['Factuurnummer', params.factuurnummer],
      ['Factuurdatum', new Date(params.factuurdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })],
      ['Vervaldatum', vervalDatum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })],
      ['Betalingstermijn', `${params.betalingstermijn} dagen`],
    ]
    infoRows.forEach(([k, v], i) => {
      const ry = y + 26 + i * 17
      doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(k, rx + 14, ry)
      const vColor = (k === 'Vervaldatum' && teLaat) ? '#dc2626' : NAVY
      doc.fillColor(vColor).font('Helvetica-Bold').fontSize(9).text(v, rx + 120, ry, { width: 110, align: 'right' })
    })

    // ── Regels tabel ──────────────────────────────────────────────────────
    y = 260
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
       .text('GEFACTUREERDE WERKZAAMHEDEN', margin, y)
    doc.moveTo(margin, y + 12).lineTo(W - margin, y + 12).strokeColor('#d0dce8').lineWidth(1).stroke()

    y += 18
    // Tabel header
    doc.rect(margin, y, W - 2 * margin, 22).fill(NAVY)
    doc.fillColor('rgba(255,255,255,0.65)').font('Helvetica-Bold').fontSize(8)
    doc.text('OMSCHRIJVING', margin + 10, y + 7)
    doc.text('AANTAL', margin + 285, y + 7, { width: 50, align: 'right' })
    doc.text('PRIJS', margin + 340, y + 7, { width: 60, align: 'right' })
    doc.text('BTW', margin + 405, y + 7, { width: 30, align: 'right' })
    doc.text('TOTAAL', margin + 440, y + 7, { width: 55, align: 'right' })

    y += 22

    params.regels.forEach((r, i) => {
      const rowH = r.beschrijving ? 32 : 22
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
    const subtotaal = params.regels.reduce((s, r) => s + Number(r.aantal) * Number(r.prijs), 0)
    const btwBedrag = subtotaal * (params.btwPct / 100)
    const inclBtw = subtotaal + btwBedrag

    const totWidth = 240
    const totX = W - margin - totWidth

    const totRows = [
      [`Subtotaal (excl. BTW)`, euro(subtotaal), false],
      [`BTW ${params.btwPct}%`, euro(btwBedrag), false],
    ]
    totRows.forEach(([l, v]) => {
      doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(l as string, totX, y, { width: totWidth / 2 })
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(v as string, totX + totWidth / 2, y, { width: totWidth / 2, align: 'right' })
      doc.moveTo(totX, y + 16).lineTo(totX + totWidth, y + 16).strokeColor('#e4e9f0').lineWidth(0.5).stroke()
      y += 20
    })

    // Eindtotaal
    doc.rect(totX, y, totWidth, 32).fill(NAVY)
    doc.fillColor('rgba(255,255,255,0.65)').font('Helvetica').fontSize(9).text('Te betalen incl. BTW', totX + 10, y + 9, { width: totWidth / 2 })
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(15).text(euro(inclBtw), totX + totWidth / 2, y + 7, { width: totWidth / 2 - 10, align: 'right' })

    y += 42

    // ── Betaalgegevens ────────────────────────────────────────────────────
    doc.rect(margin, y, W - 2 * margin, 52).fill(LIGHT)
    doc.rect(margin, y, 4, 52).fill(NAVY)
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5).text('BETAALGEGEVENS', margin + 14, y + 10)
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12).text('NL04 ABNA 0154 5811 43', margin + 14, y + 24)
    doc.fillColor(MUTED).font('Helvetica').fontSize(9)
       .text(`t.n.v. Ozvolt Elektrotechniek  ·  o.v.v. ${params.factuurnummer}`, margin + 14, y + 40)

    if (params.betaalUrl) {
      y += 62
      doc.rect(margin, y, W - 2 * margin, 36).fill('#f0fdf4')
      doc.rect(margin, y, 4, 36).fill(GREEN)
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8).text('ONLINE BETALEN', margin + 14, y + 8)
      doc.fillColor('#166534').font('Helvetica').fontSize(8.5)
         .text(params.betaalUrl, margin + 14, y + 21, { width: W - 2 * margin - 28 })
      y += 36
    }

    if (params.notities) {
      y += 14
      doc.rect(margin, y, W - 2 * margin, 50).fill(LIGHT)
      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5).text('OPMERKINGEN', margin + 14, y + 10)
      doc.fillColor(NAVY).font('Helvetica').fontSize(9).text(params.notities, margin + 14, y + 24, { width: W - 2 * margin - 28 })
    }

    // ── Footer ────────────────────────────────────────────────────────────
    doc.rect(0, 810, W, 32).fill(LIGHT)
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.5)
       .text('Ozvolt Elektrotechniek', margin, 819)
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
       .text('KVK 99837366  ·  info@ozvoltelektro.nl  ·  06 449 98 789', margin, 819 + 11)
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
       .text(params.factuurnummer, W - margin - 80, 822, { width: 80, align: 'right' })

    doc.end()
  })
}
