'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

interface Props {
  klus: any
  statuses: string[]
  statusLabels: Record<string, string>
  belLabels: Record<string, string>
  klusId: number
}

export default function KlusActions({ klus, statuses, statusLabels, belLabels, klusId }: Props) {
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

  async function updateStatus(status: string) {
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  async function updateBelStatus(gebeld_status: string) {
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gebeld_status }),
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

  const [portaalLink, setPortaalLink] = useState<string | null>(null)
  const [portaalLaden, setPortaalLaden] = useState(false)
  const [portaalGekopieerd, setPortaalGekopieerd] = useState(false)

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
  }

  async function kopieerLink() {
    if (!portaalLink) return
    await navigator.clipboard.writeText(portaalLink)
    setPortaalGekopieerd(true)
    setTimeout(() => setPortaalGekopieerd(false), 2500)
  }

  const BEL_COLORS: Record<string, string> = {
    niet_gebeld: '#8ba8c4', opgenomen: '#16a34a', niet_opgenomen: '#ea580c', voicemail: '#7c3aed',
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

      {/* Belstatus */}
      <div className="card">
        <div className="section-label">Belstatus</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(belLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => updateBelStatus(key)}
              className={`btn ${klus.gebeld_status === key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ justifyContent: 'space-between', width: '100%' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: BEL_COLORS[key], display: 'inline-block' }} />
                {label}
              </span>
              {klus.gebeld_status === key && <span className="nav-ico" style={{ fontSize: 16 }}>check</span>}
            </button>
          ))}
        </div>
        {klus.gebeld_op && (
          <div style={{ fontSize: '.75rem', color: '#8ba8c4', marginTop: 8 }}>
            Laatst gebeld: {new Date(klus.gebeld_op).toLocaleString('nl-NL')}
          </div>
        )}
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
                {uploadBezig ? 'Uploaden…' : 'Foto\'s toevoegen'}
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

      {/* Klanten portaal link */}
      <div className="card">
        <div className="section-label">Klanten portaal</div>
        {!portaalLink ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={genereerPortaalLink}
            disabled={portaalLaden}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span className="nav-ico" style={{ fontSize: 16 }}>link</span>
            {portaalLaden ? 'Link aanmaken…' : 'Genereer portaal link'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 10px', fontSize: '.75rem', color: '#374151', wordBreak: 'break-all', lineHeight: 1.5 }}>
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
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPortaalLink(null)}
                style={{ justifyContent: 'center' }}
              >
                Nieuw
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
