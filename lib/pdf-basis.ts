import PDFDocument from 'pdfkit'
import fs from 'node:fs'
import path from 'node:path'

// Gedeelde basis voor de PDF-documenten (factuur en offerte), zodat de
// paginering, de footer en de huisstijl op één plek staan.

export const NAVY = '#1d2f4c'
export const BLUE = '#4c7191'
export const GREEN = '#15803d'
export const MUTED = '#64748b'
export const LIGHT = '#f0f4f8'

// pdfkit begrijpt geen rgba(), die tekent dan in de laatst gebruikte kleur.
// Op een navy vlak werd dat navy op navy en dus onzichtbaar. Daarom staan
// hier de doorgerekende vaste kleuren voor tekst op de donkere balken.
export const ZACHT_OP_NAVY = '#9aa5b5'
export const TABELKOP_OP_NAVY = '#c5cdd8'

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
    doc.fillColor(TABELKOP_OP_NAVY).font('Helvetica-Bold').fontSize(8)
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

// ── Logo ────────────────────────────────────────────────────────────────────
// Het logo staat in public/. Lukt inlezen niet, dan valt de kop terug op de
// bedrijfsnaam in tekst, zodat een PDF nooit stukloopt op een ontbrekend
// bestand.
let logoCache: Buffer | null | undefined

export function logoBuffer(): Buffer | null {
  if (logoCache !== undefined) return logoCache
  try {
    logoCache = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-wit-site.png'))
  } catch {
    logoCache = null
  }
  return logoCache
}

// ── Documentkop ─────────────────────────────────────────────────────────────
// Gedeeld door factuur en offerte, zodat beide documenten er hetzelfde
// uitzien. Alleen het woord rechtsboven en het nummer verschillen.
export function tekenKop(doc: PDFKit.PDFDocument, opties: {
  titel: string
  nummer: string
  badge?: { tekst: string; kleur: string } | null
}) {
  doc.rect(0, 0, W, 120).fill(NAVY)
  doc.rect(0, 120, W, 4).fill(BLUE)

  const logo = logoBuffer()
  if (logo) {
    doc.image(logo, MARGE, 30, { height: 30 })
  } else {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16)
       .text('Ozvolt Elektrotechniek', MARGE, 32)
  }
  doc.fillColor(ZACHT_OP_NAVY).font('Helvetica').fontSize(9)
     .text('KVK 99837366  ·  BTW NL005413208B33', MARGE, 72)

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
     .text(opties.titel, W - 200, 40, { width: 150, align: 'right' })
  doc.fillColor(ZACHT_OP_NAVY).font('Helvetica').fontSize(10)
     .text(opties.nummer, W - 200, 66, { width: 150, align: 'right' })

  if (opties.badge) {
    doc.roundedRect(W - 120, 88, 72, 20, 4).fill(opties.badge.kleur)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
       .text(opties.badge.tekst, W - 120, 94, { width: 72, align: 'center' })
  }
}
