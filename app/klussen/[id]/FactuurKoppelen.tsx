'use client'

import { DocumentAanProject, ProjectAanDocument } from './Koppelen'

type Props =
  | { klusId: number; facturen: { id: number; factuurnummer: string }[] }
  | { factuurId: number; klantId: number; klantNaam: string; projecten: { id: number; type_werk: string | null; omschrijving: string | null; status: string }[] }

/** Op het project: losse factuur koppelen. Op de factuur: factuur aan een project koppelen. */
export default function FactuurKoppelen(props: Props) {
  if ('factuurId' in props) {
    return <ProjectAanDocument soort="factuur" documentId={props.factuurId} klantId={props.klantId} klantNaam={props.klantNaam} projecten={props.projecten} />
  }
  return (
    <DocumentAanProject
      soort="factuur"
      klusId={props.klusId}
      opties={props.facturen.map(f => ({ id: f.id, label: f.factuurnummer }))}
    />
  )
}
