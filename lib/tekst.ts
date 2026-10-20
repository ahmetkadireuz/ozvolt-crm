// Vrije tekst met regeleinden en opsommingen (bv. toelichting bij werkafspraken). Puur, dus bruikbaar in client en server.

export type TekstBlok = { type: 'lijst'; items: string[] } | { type: 'alinea'; regels: string[] }

/** Regels die met -, * of • beginnen worden een opsomming; overige regels alinea's (regelafbrekingen behouden). */
export function tekstBlokken(tekst: string | null | undefined): TekstBlok[] {
  const blokken: TekstBlok[] = []
  for (const ruw of String(tekst ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const regel = ruw.trimEnd()
    const m = regel.match(/^\s*[*•-]\s*(.*)$/)
    const laatste = blokken[blokken.length - 1]
    if (m) {
      if (laatste?.type === 'lijst') laatste.items.push(m[1])
      else blokken.push({ type: 'lijst', items: [m[1]] })
    } else if (!regel.trim()) {
      blokken.push({ type: 'alinea', regels: [] }) // lege regel sluit het blok af
    } else if (laatste?.type === 'alinea' && laatste.regels.length > 0) {
      laatste.regels.push(regel)
    } else {
      blokken.push({ type: 'alinea', regels: [regel] })
    }
  }
  return blokken.filter(b => (b.type === 'lijst' ? b.items.length > 0 : b.regels.length > 0))
}

/** True als de tekst meer is dan één gewone regel (meerdere regels of een opsomming). */
export function isMeerregelig(tekst: string | null | undefined): boolean {
  const blokken = tekstBlokken(tekst)
  return blokken.length > 1 || blokken.some(b => b.type === 'lijst' || b.regels.length > 1)
}

export function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

/** Tekst → veilige HTML (voor PDF's en mails). Eén gewone regel blijft platte tekst; lijsten worden <ul>. */
export function tekstHtml(tekst: string | null | undefined, ulStyle = 'margin:2px 0 0;padding-left:16px;'): string {
  return tekstBlokken(tekst).map(b => b.type === 'lijst'
    ? `<ul style="${ulStyle}">${b.items.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
    : `<div>${b.regels.map(escapeHtml).join('<br>')}</div>`).join('')
}
