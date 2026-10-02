import { formatEuro } from '@/lib/utils'
import { meerprijsInclBtw, tekstBlokken, type UoItem } from '@/lib/uitgangspunten'

// Klantweergave van "Uitgangspunten & opties" (portaal). Inline stijlen, zodat het in
// zowel de publieke offertepagina als het klantportaal past. Leeg = niets tonen.
export default function UitgangspuntenOptiesWeergave({ items, btwPct, titelStijl }: {
  items: UoItem[]
  btwPct: number
  titelStijl?: React.CSSProperties
}) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={titelStijl}>Uitgangspunten &amp; opties</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => {
          const optie = item.soort === 'optie'
          return (
            <div key={i} style={{ border: '1px solid #e8edf3', borderLeft: `3px solid ${optie ? '#d97706' : '#1d2f4c'}`, borderRadius: 4, padding: '14px 16px', background: optie ? '#fffbeb' : '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: item.tekst.trim() || optie ? 6 : 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap', background: optie ? '#fef3c7' : '#e8edf5', color: optie ? '#b45309' : '#1d2f4c' }}>
                  {optie ? 'Optie' : 'Uitgangspunt'}
                </span>
                {item.titel && <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{item.titel}</span>}
              </div>
              {tekstBlokken(item.tekst).map((b, j) =>
                b.type === 'lijst' ? (
                  <ul key={j} style={{ margin: '4px 0 6px', paddingLeft: 20, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>
                    {b.items.map((t, k) => <li key={k}>{t}</li>)}
                  </ul>
                ) : (
                  <p key={j} style={{ margin: '4px 0 6px', fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{b.regels.join('\n')}</p>
                )
              )}
              {optie && item.meerprijs !== null && (
                <div style={{ fontSize: 13, color: '#0f172a', marginTop: 6 }}>
                  <strong>Meerprijs {formatEuro(item.meerprijs)} excl. btw / {formatEuro(meerprijsInclBtw(item.meerprijs, btwPct))} incl. btw</strong>
                  <span style={{ color: '#64748b' }}> — alleen bij keuze, niet in het totaal inbegrepen</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
