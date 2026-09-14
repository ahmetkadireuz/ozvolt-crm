import PDFDocument from 'pdfkit'

// Gedeelde basis voor de PDF-documenten (factuur en offerte), zodat de
// paginering, de footer en de huisstijl op één plek staan.

export const NAVY = '#1d2f4c'
export const BLUE = '#4c7191'
export const GREEN = '#15803d'
export const MUTED = '#64748b'
export const LIGHT = '#f0f4f8'

export const W = 595.28        // A4-breedte in punten
export const H = 841.89        // A4-hoogte in punten
export const MARGE = 50
export const FOOTER_TOP = 810
export const CONTENT_BODEM = FOOTER_TOP - 20

export function euro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export type Kolom = {
  titel: string
  x: number                    // afstand vanaf de linkermarge
  breedte?: number
  align?: 'left' | 'right'
}

export function maakPdf(teken: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    try {
      teken(doc)
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

export function documentHulp(doc: PDFKit.PDFDocument, documentnummer: string) {
  function tekenFooter() {
    doc.rect(0, FOOTER_TOP, W, H - FOOTER_TOP).fill(LIGHT)
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.5)
       .text('Ozvolt Elektrotechniek', MARGE, FOOTER_TOP + 7)
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
       .text('KVK 99837366  ·  BTW NL005413208B33  ·  financien@ozvoltelektro.nl', MARGE, FOOTER_TOP + 18)
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
       .text(documentnummer, W - MARGE - 80, FOOTER_TOP + 12, { width: 80, align: 'right' })
  }

  // pdfkit breekt zelf geen pagina's af bij vaste coördinaten, dus dat doen we
  // hier. Zonder dit loopt een lange regellijst over de footer heen en maakt
  // pdfkit per overlopende tekstregel een losse lege pagina.
  function nieuwePagina() {
    tekenFooter()
    doc.addPage()
    return 60
  }

  function tekenTabelkop(ty: number, kolommen: Kolom[]) {
    doc.rect(MARGE, ty, W - 2 * MARGE, 22).fill(NAVY)
    doc.fillColor('rgba(255,255,255,0.65)').font('Helvetica-Bold').fontSize(8)
    for (const k of kolommen) {
      doc.text(k.titel, MARGE + k.x, ty + 7, k.breedte ? { width: k.breedte, align: k.align ?? 'left' } : undefined)
    }
    return ty + 22
  }

  return { tekenFooter, nieuwePagina, tekenTabelkop }
}

// Kolomindeling die factuur en offerte delen.
export const REGEL_KOLOMMEN = (prijsLabel: string): Kolom[] => [
  { titel: 'OMSCHRIJVING', x: 10 },
  { titel: 'AANTAL', x: 285, breedte: 50, align: 'right' },
  { titel: prijsLabel, x: 340, breedte: 60, align: 'right' },
  { titel: 'BTW', x: 405, breedte: 30, align: 'right' },
  { titel: 'TOTAAL', x: 440, breedte: 55, align: 'right' },
]
