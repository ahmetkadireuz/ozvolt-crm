import { tekstBlokken } from '@/lib/tekst'

/** Toont een toelichting met behouden regeleinden; regels met -, * of • worden opsommingspunten. */
export default function ToelichtingTekst({ tekst }: { tekst: string | null | undefined }) {
  const blokken = tekstBlokken(tekst)
  if (blokken.length === 0) return null
  return (
    <>
      {blokken.map((b, j) =>
        b.type === 'lijst'
          ? <ul key={j} style={{ margin: '2px 0 0', paddingLeft: 18 }}>{b.items.map((t, k) => <li key={k}>{t}</li>)}</ul>
          : <div key={j}>{b.regels.map((r, k) => <span key={k}>{k > 0 && <br />}{r}</span>)}</div>
      )}
    </>
  )
}
