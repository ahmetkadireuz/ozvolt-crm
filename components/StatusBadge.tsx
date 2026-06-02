export const STATUS_LABELS: Record<string, string> = {
  nieuw: 'Nieuw',
  in_behandeling: 'In behandeling',
  offerte_gestuurd: 'Offerte gestuurd',
  gepland: 'Gepland',
  afgerond: 'Afgerond',
  concept: 'Concept',
  gestuurd: 'Gestuurd',
  geaccepteerd: 'Geaccepteerd',
  verlopen: 'Verlopen',
  geweigerd: 'Geweigerd',
  verstuurd: 'Verstuurd',
  betaald: 'Betaald',
  te_laat: 'Te laat',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
