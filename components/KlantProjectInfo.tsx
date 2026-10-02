import Link from 'next/link'
import { projectTitel } from '@/lib/project-opties'

/* Klant en project van een offerte/factuur als vaste info. De klant komt van het project
   en is hier niet los te kiezen; wijzig hem op het project. */
export default function KlantProjectInfo({ document: d }: {
  document: { klant_id: number; klant_naam?: string; klus_id?: number | null; klus_type_werk?: string | null; klus_omschrijving?: string | null }
}) {
  const vak = (label: string, inhoud: React.ReactNode) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <div className="zoeker-keuze" style={{ padding: '8px 12px', minHeight: 40 }}>{inhoud}</div>
    </div>
  )
  return (
    <>
      {vak('Klant', <Link href={`/klanten/${d.klant_id}`} style={{ color: 'var(--text)', fontWeight: 600, fontSize: '.86rem' }}>{d.klant_naam ?? `Klant #${d.klant_id}`}</Link>)}
      {vak('Project', d.klus_id
        ? <Link href={`/klussen/${d.klus_id}`} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '.86rem' }}>
            {projectTitel({ id: d.klus_id, type_werk: d.klus_type_werk, omschrijving: d.klus_omschrijving })} →
          </Link>
        : <span style={{ color: 'var(--tint-amber)', fontSize: '.84rem' }}>Niet gekoppeld</span>)}
    </>
  )
}
