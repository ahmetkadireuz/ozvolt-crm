/** Keuzes voor "type werk" bij een project (gedeeld door server- en clientcomponenten). */
export const TYPE_WERK_OPTIES = [
  'Groepenkast vervangen',
  'Laadpaal installeren',
  'Elektra renoveren',
  'Nieuwbouw elektra',
  'Verduurzaming',
  'Storing oplossen',
  'Overig',
]

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  nieuw: 'Nieuw', in_behandeling: 'In behandeling',
  offerte_gestuurd: 'Offerte gestuurd', gepland: 'Gepland', afgerond: 'Afgerond',
}

export function projectTitel(p: { id: number; type_werk?: string | null; omschrijving?: string | null }): string {
  const oms = String(p.omschrijving ?? '').trim()
  return p.type_werk || (oms ? (oms.length > 60 ? oms.slice(0, 57) + '…' : oms) : `Project #${p.id}`)
}
