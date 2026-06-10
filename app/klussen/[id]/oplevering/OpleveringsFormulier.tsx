'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from '@/components/SignatureCanvas'

type Foto = { url: string; caption?: string }

interface Props {
  klusId: number
  klantId: number
  klantNaam: string
  typeWerk: string | null
  bestaandRapport: {
    id: number
    titel: string
    notities: string | null
    inhoud: { items?: string[]; aanvullend?: string } | null
    fotos: Foto[] | null
    handtekening_monteur: string | null
    handtekening_klant: string | null
    getekend_op: string | null
  } | null
}

export default function OpleveringsFormulier({ klusId, klantId, klantNaam, typeWerk, bestaandRapport }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<string[]>(
    bestaandRapport?.inhoud?.items?.length ? bestaandRapport.inhoud.items : ['']
  )
  const [aanvullend, setAanvullend] = useState(bestaandRapport?.inhoud?.aanvullend ?? bestaandRapport?.notities ?? '')
  const [fotos, setFotos] = useState<Foto[]>(bestaandRapport?.fotos ?? [])
  const [sigMonteur, setSigMonteur] = useState(bestaandRapport?.handtekening_monteur ?? '')
  const [sigKlant, setSigKlant] = useState('')
  const [rapportId, setRapportId] = useState<number | null>(bestaandRapport?.id ?? null)
  const [uploadBezig, setUploadBezig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function uploadFotos(files: FileList) {
    setUploadBezig(true)
    const nieuw: Foto[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/opleveringsrapporten/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) nieuw.push({ url: data.url })
    }
    setFotos(prev => [...prev, ...nieuw])
    setUploadBezig(false)
  }

  async function opslaan() {
    setSaving(true)
    setMsg('')
    const schoneItems = items.map(i => i.trim()).filter(Boolean)
    const inhoud = { items: schoneItems, aanvullend: aanvullend.trim() }
    const titel = `Opleveringsrapport${typeWerk ? ` ${typeWerk}` : ''} — ${klantNaam}`

    try {
      if (rapportId) {
        const res = await fetch(`/api/opleveringsrapporten/${rapportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titel, inhoud, fotos,
            handtekening_monteur: sigMonteur || null,
            ...(sigKlant ? { handtekening_klant: sigKlant } : {}),
          }),
        })
        if (!res.ok) throw new Error()
        setMsg('Rapport bijgewerkt.')
      } else {
        const res = await fetch('/api/opleveringsrapporten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            klus_id: klusId, klant_id: klantId, titel, type: 'werkzaamheden',
            inhoud, fotos,
            handtekening_monteur: sigMonteur || null,
            handtekening_klant: sigKlant || null,
          }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setRapportId(data.id)
        setMsg('Rapport opgeslagen.')
      }
      router.refresh()
    } catch {
      setMsg('Opslaan mislukt — probeer opnieuw.')
    }
    setSaving(false)
  }

  // Patch een tussentijdse aanpassing op fotos (bv. caption of verwijderen) ook op de server
  async function patchFotos(nieuw: Foto[]) {
    setFotos(nieuw)
    if (rapportId) {
      fetch(`/api/opleveringsrapporten/${rapportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotos: nieuw }),
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>

      {/* Topbar acties */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, color: '#0d1b3e' }}>{typeWerk || 'Werkzaamheden'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {rapportId && (
            <a href={`/rapporten/${rapportId}/print`} target="_blank" className="btn btn-ghost btn-sm">
              <span className="nav-ico" style={{ fontSize: 15 }}>print</span> Afdrukken / PDF
            </a>
          )}
          <button className="btn btn-primary btn-sm" onClick={opslaan} disabled={saving}>
            {saving ? 'Opslaan…' : rapportId ? 'Wijzigingen opslaan' : 'Rapport opslaan'}
          </button>
        </div>
      </div>

      {msg && <div className={`alert ${msg.includes('mislukt') ? 'alert-err' : 'alert-ok'}`}>{msg}</div>}

      {/* Uitgevoerde werkzaamheden — simpele lijst */}
      <div className="card">
        <div className="section-label">Uitgevoerde werkzaamheden</div>
        <p style={{ fontSize: '.78rem', color: '#8ba8c4', margin: '0 0 12px' }}>
          Eén regel per uitgevoerd item — bijv. <em>Zaptec Go 2 22kW geplaatst</em>, <em>5 meter YMVK 5×2,5 gebruikt</em>.
        </p>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#0d1b3e', fontWeight: 700, fontSize: 16, width: 14, textAlign: 'center', flexShrink: 0 }}>•</span>
            <input
              className="form-ctrl"
              value={item}
              onChange={e => setItems(prev => prev.map((it, j) => (j === i ? e.target.value : it)))}
              placeholder="Bijv. Zaptec Go 2 22kW geplaatst"
              style={{ flex: 1, fontSize: 14 }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  setItems(prev => {
                    const nieuw = [...prev]
                    nieuw.splice(i + 1, 0, '')
                    return nieuw
                  })
                  setTimeout(() => {
                    const inputs = document.querySelectorAll('.werk-items input')
                    ;(inputs[i + 1] as HTMLInputElement | undefined)?.focus()
                  }, 0)
                }
              }}
            />
            <button
              type="button"
              onClick={() => setItems(prev => prev.length === 1 ? [''] : prev.filter((_, j) => j !== i))}
              title="Regel verwijderen"
              style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 18, flexShrink: 0, padding: '0 4px' }}
            >✕</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems(prev => [...prev, ''])}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 4 }}
        >
          <span className="nav-ico" style={{ fontSize: 15 }}>add</span>
          Regel toevoegen
        </button>
      </div>

      {/* Foto's */}
      <div className="card">
        <div className="section-label">Foto&apos;s</div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && uploadFotos(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadBezig}
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span className="nav-ico" style={{ fontSize: 16 }}>upload</span>
          {uploadBezig ? 'Uploaden…' : "Foto's toevoegen"}
        </button>
        {fotos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
            {fotos.map((f, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, display: 'block', border: '1px solid #e2e8f0' }} />
                <input
                  value={f.caption ?? ''}
                  onChange={e => {
                    const nieuw = fotos.map((x, j) => j === i ? { ...x, caption: e.target.value } : x)
                    setFotos(nieuw)
                  }}
                  onBlur={() => patchFotos(fotos)}
                  placeholder="Bijschrift…"
                  style={{ width: '100%', marginTop: 4, fontSize: 11, padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit' }}
                />
                <button
                  type="button"
                  onClick={() => patchFotos(fotos.filter((_, j) => j !== i))}
                  title="Verwijderen"
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(220,38,38,.92)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer', lineHeight: 1, padding: 0 }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aanvullende opmerkingen */}
      <div className="card">
        <div className="section-label">Aanvullende opmerkingen (optioneel)</div>
        <textarea
          value={aanvullend}
          onChange={e => setAanvullend(e.target.value)}
          rows={3}
          placeholder="Bijv. afspraken, vervolgwerk, bijzonderheden…"
          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      {/* Handtekeningen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="section-label">Handtekening monteur</div>
          <SignatureCanvas initial={bestaandRapport?.handtekening_monteur} onChange={setSigMonteur} />
          <p style={{ fontSize: 11, color: '#8ba8c4', margin: '8px 0 0' }}>Ozvolt Elektrotechniek — {new Date().toLocaleDateString('nl-NL')}</p>
        </div>
        <div className="card">
          <div className="section-label">Handtekening klant</div>
          {bestaandRapport?.handtekening_klant ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bestaandRapport.handtekening_klant} alt="Handtekening klant" style={{ maxHeight: 100, border: '1px solid #e2e8f0', borderRadius: 8 }} />
              <p style={{ fontSize: 11, color: '#15803d', margin: '8px 0 0', fontWeight: 700 }}>
                ✓ Getekend door klant{bestaandRapport.getekend_op ? ` op ${new Date(bestaandRapport.getekend_op).toLocaleDateString('nl-NL')}` : ''}
              </p>
            </>
          ) : (
            <>
              <SignatureCanvas onChange={setSigKlant} />
              <p style={{ fontSize: 11, color: '#8ba8c4', margin: '8px 0 0' }}>
                {klantNaam} kan ook digitaal tekenen via het klantportaal.
              </p>
            </>
          )}
        </div>
      </div>

      <button className="btn btn-primary" onClick={opslaan} disabled={saving} style={{ justifyContent: 'center' }}>
        {saving ? 'Opslaan…' : rapportId ? 'Wijzigingen opslaan' : 'Rapport opslaan'}
      </button>
    </div>
  )
}
