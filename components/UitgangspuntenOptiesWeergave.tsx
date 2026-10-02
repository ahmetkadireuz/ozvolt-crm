import { formatEuro } from '@/lib/utils'
import { meerprijsInclBtw, tekstBlokken, type UoItem } from '@/lib/uitgangspunten'

// Klantweergave van "Uitgangspunten & opties" in de stijl van het offertedocument
// (zelfde koppen, tabel en lijnen als de regeltabel). Eigen, met uo- geprefixte CSS,
// zodat het er op de publieke offertepagina en in het klantportaal hetzelfde uitziet.
// Opties staan direct onder de totalen, daarna de uitgangspunten. Leeg = niets tonen.

const CSS = `
  .uo-blok { margin-bottom: 32px; }
  .uo-sec { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #94a3b8; margin: 0 0 12px; }
  .uo-wrap { border: 1px solid #e8edf3; border-radius: 4px; background: #fff; overflow: hidden; }
  .uo-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .uo-tbl thead tr { background: #f8fafc; border-bottom: 1px solid #e8edf3; }
  .uo-tbl thead th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; white-space: nowrap; }
  .uo-tbl thead th.uo-r { text-align: right; }
  .uo-tbl tbody tr { border-bottom: 1px solid #f1f5f9; }
  .uo-tbl tbody tr:last-child { border-bottom: none; }
  .uo-tbl tbody td { padding: 14px 16px; vertical-align: top; }
  .uo-prijs { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; width: 1%; }
  .uo-prijs-excl { font-weight: 600; font-size: 13px; color: #0f172a; }
  .uo-prijs-klein { font-size: 12px; color: #64748b; margin-top: 3px; line-height: 1.5; }
  .uo-rij { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
  .uo-rij:last-child { border-bottom: none; }
  .uo-titel { font-weight: 600; font-size: 14px; color: #0f172a; }
  .uo-tekst { font-size: 13px; color: #64748b; line-height: 1.6; }
  .uo-titel + .uo-tekst { margin-top: 3px; }
  .uo-tekst p { margin: 0; white-space: pre-wrap; }
  .uo-tekst p + p, .uo-tekst p + ul, .uo-tekst ul + p, .uo-tekst ul + ul { margin-top: 6px; }
  .uo-tekst ul { list-style: none; margin: 0; padding: 0; }
  .uo-tekst li { position: relative; padding-left: 14px; line-height: 1.5; margin: 2px 0; }
  .uo-tekst li::before { content: ''; position: absolute; left: 2px; top: .62em; width: 5px; height: 5px; border-radius: 50%; background: #1d2f4c; }
  .uo-mobiel-prijs { display: none; }
  @media (max-width: 600px) {
    .uo-tbl thead th.uo-r, .uo-tbl td.uo-prijs { display: none; }
    .uo-mobiel-prijs { display: block; margin-top: 8px; font-variant-numeric: tabular-nums; }
  }
`

function Tekst({ tekst }: { tekst: string }) {
  const blokken = tekstBlokken(tekst)
  if (blokken.length === 0) return null
  return (
    <div className="uo-tekst">
      {blokken.map((b, j) =>
        b.type === 'lijst'
          ? <ul key={j}>{b.items.map((t, k) => <li key={k}>{t}</li>)}</ul>
          : <p key={j}>{b.regels.join('\n')}</p>
      )}
    </div>
  )
}

function Meerprijs({ item, btwPct }: { item: UoItem; btwPct: number }) {
  if (item.meerprijs === null) return <div className="uo-prijs-klein">Op aanvraag</div>
  return (
    <>
      <div className="uo-prijs-excl">{formatEuro(item.meerprijs)} excl. btw</div>
      <div className="uo-prijs-klein">{formatEuro(meerprijsInclBtw(item.meerprijs, btwPct))} incl. btw</div>
      <div className="uo-prijs-klein" style={{ marginTop: 0 }}>Niet in totaal</div>
    </>
  )
}

export default function UitgangspuntenOptiesWeergave({ items, btwPct }: {
  items: UoItem[]
  btwPct: number
}) {
  const opties = items.filter(i => i.soort === 'optie')
  const uitgangspunten = items.filter(i => i.soort !== 'optie')
  if (opties.length === 0 && uitgangspunten.length === 0) return null
  return (
    <>
      <style>{CSS}</style>

      {opties.length > 0 && (
        <div className="uo-blok">
          <div className="uo-sec">Opties</div>
          <div className="uo-wrap">
            <table className="uo-tbl">
              <thead>
                <tr>
                  <th>Optie</th>
                  <th className="uo-r">Meerprijs</th>
                </tr>
              </thead>
              <tbody>
                {opties.map((item, i) => (
                  <tr key={i}>
                    <td>
                      {item.titel && <div className="uo-titel">{item.titel}</div>}
                      <Tekst tekst={item.tekst} />
                      <div className="uo-mobiel-prijs"><Meerprijs item={item} btwPct={btwPct} /></div>
                    </td>
                    <td className="uo-prijs"><Meerprijs item={item} btwPct={btwPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {uitgangspunten.length > 0 && (
        <div className="uo-blok">
          <div className="uo-sec">Uitgangspunten</div>
          <div className="uo-wrap">
            {uitgangspunten.map((item, i) => (
              <div key={i} className="uo-rij">
                {item.titel && <div className="uo-titel">{item.titel}</div>}
                <Tekst tekst={item.tekst} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
