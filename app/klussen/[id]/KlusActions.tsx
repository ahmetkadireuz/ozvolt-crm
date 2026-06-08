'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

interface Props {
  klus: any
  statuses: string[]
  statusLabels: Record<string, string>
  klusId: number
  documenten?: { id: number; naam: string; url: string; aangemaakt_op: string }[]
}

export default function KlusActions({ klus, statuses, statusLabels, klusId, documenten: initialDocumenten = [] }: Props) {
  const router = useRouter()
  const [notities, setNotities] = useState(klus.notities ?? '')
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    type_werk: klus.type_werk ?? '',
    omschrijving: klus.omschrijving ?? '',
    product: klus.product ?? '',
    locatie: klus.klant_locatie ?? '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editOk, setEditOk] = useState(false)

  // Opleveringsrapport
  const [rapportOpen, setRapportOpen] = useState(false)
  const [rapportTitel, setRapportTitel] = useState('Opleveringsrapport')
  const [rapportNotities, setRapportNotities] = useState('')
  const [rapportFotos, setRapportFotos] = useState<{ url: string; caption?: string }[]>([])
  const [uploadBezig, setUploadBezig] = useState(false)
  const [rapportSaving, setRapportSaving] = useState(false)
  const [rapportId, setRapportId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Document upload (groenverklaring / KLIC / etc.)
  const docFileRef = useRef<HTMLInputElement>(null)
  const [docNaam, setDocNaam] = useState('')
  const [docUploading, setDocUploading] = useState(false)
  const [docOk, setDocOk] = useState(false)
  const [docFout, setDocFout] = useState('')

  // Klanten portaal
  const [portaalLink, setPortaalLink] = useState<string | null>(null)
  const [portaalLaden, setPortaalLaden] = useState(false)
  const [portaalGekopieerd, setPortaalGekopieerd] = useState(false)

  // Documenten
  const [docs, setDocs] = useState(initialDocumenten)
  const [docVerwijderenId, setDocVerwijderenId] = useState<number | null>(null)

  async function uploadFotos(files: FileList) {
    setUploadBezig(true)
    const nieuweUrls: { url: string }[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/opleveringsrapporten/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) nieuweUrls.push({ url: data.url })
    }
    setRapportFotos(prev => [...prev, ...nieuweUrls])
    setUploadBezig(false)
  }

  async function slaRapportOp() {
    setRapportSaving(true)
    const res = await fetch('/api/opleveringsrapporten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        klus_id: klusId,
        klant_id: klus.klant_id,
        titel: rapportTitel,
        notities: rapportNotities,
        fotos: rapportFotos,
      }),
    })
    const data = await res.json()
    setRapportSaving(false)
    if (data.id) {
      setRapportId(data.id)
      setRapportOpen(false)
      router.refresh()
    }
  }

  async function uploadDocument(file: File) {
    setDocUploading(true)
    setDocFout('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('klant_id', String(klus.klant_id))
    fd.append('naam', docNaam || file.name)
    const res = await fetch('/api/groenverklaring', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setDocOk(true)
      setDocNaam('')
      setTimeout(() => setDocOk(false), 3000)
      // Reload docs from server
      const docsRes = await fetch(`/api/groenverklaring?klant_id=${klus.klant_id}`)
      if (docsRes.ok) setDocs(await docsRes.json())
      router.refresh()
    } else {
      setDocFout(data.error ?? 'Upload mislukt')
    }
    setDocUploading(false)
  }

  async function updateStatus(status: string) {
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  async function saveNotities() {
    setSaving(true)
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notities }),
    })
    setSaving(false)
    router.refresh()
  }

  async function saveEdit() {
    setEditSaving(true)
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setEditSaving(false)
    setEditOk(true)
    setTimeout(() => setEditOk(false), 3000)
    router.refresh()
  }

  async function deleteKlus() {
    if (!confirm('Klus verwijderen? Dit kan niet ongedaan worden gemaakt.')) return
    await fetch(`/api/klussen/${klusId}`, { method: 'DELETE' })
    router.push('/klussen')
  }

  async function genereerPortaalLink() {
    setPortaalLaden(true)
    const res = await fetch('/api/klant/sessie-aanmaken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klantId: klus.klant_id }),
    })
    const data = await res.json()
    setPortaalLaden(false)
    if (data.link) setPortaalLink(data.link)
    return data.link as string | undefined
  }

  async function openPortaalDirectly() {
    setPortaalLaden(true)
    const res = await fetch('/api/klant/sessie-aanmaken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klantId: klus.klant_id }),
    })
    const data = await res.json()
    setPortaalLaden(false)
    if (data.link) window.open(data.link, '_blank', 'noopener')
  }

  async function verwijderDocument(id: number) {
    if (!confirm('Document verwijderen uit het klantportaal?')) return
    setDocVerwijderenId(id)
    await fetch('/api/groenverklaring', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDocs(prev => prev.filter(d => d.id !== id))
    setDocVerwijderenId(null)
  }

  async function kopieerLink() {
    if (!portaalLink) return
    await navigator.clipboard.writeText(portaalLink)
    setPortaalGekopieerd(true)
    setTimeout(() => setPortaalGekopieerd(false), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Klus bewerken */}
      <div className="card">
        <div className="section-label">Klus bewerken</div>
        {[
          { label: 'Type werk', key: 'type_werk' },
          { label: 'Product', key: 'product' },
        ].map(f => (
          <div key={f.key} className="form-group">
            <label className="form-label">{f.label}</label>
            <input
              className="form-ctrl"
              value={(editForm as any)[f.key]}
              onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="form-group">
          <label className="form-label">Omschrijving</label>
          <textarea
            className="form-ctrl"
            rows={3}
            value={editForm.omschrijving}
            onChange={e => setEditForm(p => ({ ...p, omschrijving: e.target.value }))}
            style={{ resize: 'vertical', fontSize: '.82rem' }}
          />
        </div>
        {editOk && <p style={{ color: '#16a34a', fontSize: 12, margin: '0 0 6px' }}>✓ Opgeslagen</p>}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={saveEdit}
          disabled={editSaving}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {editSaving ? 'Opslaan…' : 'Wijzigingen opslaan'}
        </button>
      </div>

      {/* Status */}
      <div className="card">
        <div className="section-label">Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {statuses.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(s)}
              className={`btn ${klus.status === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ justifyContent: 'space-between', width: '100%' }}
              disabled={klus.status === s}
            >
              {statusLabels[s]}
              {klus.status === s && <span className="nav-ico" style={{ fontSize: 16 }}>check</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Notities */}
      <div className="card">
        <div className="section-label">Interne notities</div>
        <textarea
          className="form-ctrl"
          rows={5}
          value={notities}
          onChange={e => setNotities(e.target.value)}
          placeholder="Notities voor intern gebruik…"
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={saveNotities}
          disabled={saving}
          style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
        >
          {saving ? 'Opslaan…' : 'Notities opslaan'}
        </button>
      </div>

      {/* Documenten voor klant (groenverklaring / KLIC / etc.) */}
      <div className="card">
        <div className="section-label">Documenten voor klant</div>
        {docs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12, color: '#0d1b3e', textDecoration: 'none', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.naam}
                </a>
                <button
                  type="button"
                  onClick={() => verwijderDocument(d.id)}
                  disabled={docVerwijderenId === d.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', fontSize: 14, lineHeight: 1, flexShrink: 0 }}
                  title="Verwijderen"
                >
                  {docVerwijderenId === d.id ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Documentnaam (optioneel)</label>
          <input
            className="form-ctrl"
            value={docNaam}
            onChange={e => setDocNaam(e.target.value)}
            placeholder="bijv. KLIC aanvraag 2025"
          />
        </div>
        <input
          ref={docFileRef}
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && uploadDocument(e.target.files[0])}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => docFileRef.current?.click()}
          disabled={docUploading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span className="nav-ico" style={{ fontSize: 16 }}>upload_file</span>
          {docUploading ? 'Uploaden…' : 'Document uploaden'}
        </button>
        {docOk && <p style={{ color: '#16a34a', fontSize: 12, margin: '6px 0 0' }}>✓ Document geüpload — zichtbaar in klantportaal</p>}
        {docFout && <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>{docFout}</p>}
      </div>

      {/* Opleveringsrapport */}
      <div className="card">
        <div className="section-label">Opleveringsrapport</div>
        {rapportId ? (
          <a
            href={`/klant/rapport/${rapportId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span className="nav-ico" style={{ fontSize: 16 }}>open_in_new</span>
            Rapport bekijken (klantportaal)
          </a>
        ) : !rapportOpen ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setRapportOpen(true)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span className="nav-ico" style={{ fontSize: 16 }}>add_photo_alternate</span>
            Opleveringsrapport aanmaken
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Titel</label>
              <input
                className="form-ctrl"
                value={rapportTitel}
                onChange={e => setRapportTitel(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notities</label>
              <textarea
                className="form-ctrl"
                rows={3}
                value={rapportNotities}
                onChange={e => setRapportNotities(e.target.value)}
                placeholder="Bijv. werkzaamheden uitgevoerd, opmerkingen…"
                style={{ resize: 'vertical', fontSize: '.82rem' }}
              />
            </div>
            <div>
              <label className="form-label">Foto&apos;s</label>
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
                className="btn btn-ghost btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploadBezig}
                style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }}
              >
                <span className="nav-ico" style={{ fontSize: 16 }}>upload</span>
                {uploadBezig ? 'Uploaden…' : "Foto's toevoegen"}
              </button>
              {rapportFotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                  {rapportFotos.map((f, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                      <button
                        type="button"
                        onClick={() => setRapportFotos(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', lineHeight: 1, padding: 0 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={slaRapportOp}
                disabled={rapportSaving || uploadBezig}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {rapportSaving ? 'Opslaan…' : 'Rapport opslaan'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRapportOpen(false)}
                style={{ justifyContent: 'center' }}
              >
                Annuleer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Klanten portaal */}
      <div className="card">
        <div className="section-label">Klanten portaal</div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
          Open het portaal als de klant of genereer een link om te versturen (geldig 24 uur).
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: portaalLink ? 8 : 0 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openPortaalDirectly}
            disabled={portaalLaden}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <span className="nav-ico" style={{ fontSize: 16 }}>open_in_new</span>
            {portaalLaden ? 'Laden…' : 'Open portaal'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={genereerPortaalLink}
            disabled={portaalLaden}
            style={{ justifyContent: 'center' }}
            title="Link genereren om te sturen"
          >
            <span className="nav-ico" style={{ fontSize: 16 }}>link</span>
          </button>
        </div>
        {portaalLink && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 10px', fontSize: '.72rem', color: '#374151', wordBreak: 'break-all', lineHeight: 1.5, fontFamily: 'monospace' }}>
              {portaalLink}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={kopieerLink}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <span className="nav-ico" style={{ fontSize: 16 }}>{portaalGekopieerd ? 'check' : 'content_copy'}</span>
                {portaalGekopieerd ? 'Gekopieerd!' : 'Kopieer link'}
              </button>
              {klus.klant_tel && (() => {
                const tel = (klus.klant_tel ?? '').replace(/[^0-9+]/g, '')
                const waNum = tel.startsWith('0') ? '31' + tel.slice(1) : tel.replace(/^\+/, '')
                const waMsg = `Goedendag ${klus.klant_naam?.split(' ')[0]}, hier is Ozvolt Elektrotechniek. Via deze link kunt u uw dossier bekijken: ${portaalLink}`
                return (
                  <a
                    href={`https://wa.me/${waNum}?text=${encodeURIComponent(waMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success btn-sm"
                    style={{ justifyContent: 'center' }}
                  >
                    <span className="nav-ico" style={{ fontSize: 16 }}>chat</span>
                    WA
                  </a>
                )
              })()}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPortaalLink(null)}
                style={{ justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verwijderen */}
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={deleteKlus}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        <span className="nav-ico" style={{ fontSize: 16 }}>delete</span>
        Klus verwijderen
      </button>
    </div>
  )
}
