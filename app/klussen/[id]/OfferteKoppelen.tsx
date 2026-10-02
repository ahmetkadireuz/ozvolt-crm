'use client'

import { DocumentAanProject, ProjectAanDocument } from './Koppelen'

type Props =
  | { klusId: number; offertes: { id: number; offertenummer: number }[] }
  | { offerteId: number; klantId: number; klantNaam: string; projecten: { id: number; type_werk: string | null; omschrijving: string | null; status: string }[] }

/** Op het project: losse offerte koppelen. Op de offerte: offerte aan een project koppelen. */
export default function OfferteKoppelen(props: Props) {
  if ('offerteId' in props) {
    return <ProjectAanDocument soort="offerte" documentId={props.offerteId} klantId={props.klantId} klantNaam={props.klantNaam} projecten={props.projecten} />
  }
  return (
    <DocumentAanProject
      soort="offerte"
      klusId={props.klusId}
      opties={props.offertes.map(o => ({ id: o.id, label: `OZVT-${String(o.offertenummer).padStart(4, '0')}` }))}
    />
  )
}
