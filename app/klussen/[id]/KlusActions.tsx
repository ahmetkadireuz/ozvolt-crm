'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAutosave } from '@/lib/use-autosave'

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

  // Document upload (klant-documenten / KLIC / etc.)
  const docFileRef = useRef<HTMLInputElement>(null)
  const [docNaam, setDocNaam] = useState('')
  const [docUploading, setDocUploading] = useState(false)
  const [docFout, setDocFout] = useState('')

  // Klanten portaal
  const [portaalLink, setPortaalLink] = useState<string | null>(null)
  const [portaalLaden, setPortaalLaden] = useState(false)
  const [portaalGekopieerd, setPortaalGekopieerd] = useState(false)

  // Documenten
  const [docs, setDocs] = useState(initialDocumenten)
  const [docVerwijderenId, setDocVerwijderenId] = useState<number | null>(null)

  // Auto-save notities
  const { saving: notitiesBezig, saved: notitiesSaved } = useAutosave(notities, async val => {
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notities: val }),
    })
    router.refresh()
  })

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
      setDocNaam('')
      const docsRes = await fetch(`/api/groenverklaring?klant_id=${klus.klant_id}`)
      if (docsRes.ok) setDocs(await docsRes.json())
      router.refresh()
    } else {
      setDocFout(data.error ?? 'Upload mislukt')
    }
    setDocUploading(false)
  }

  async function updateStatus(status: string) {
    if (klus.status === status) return
    await fetch(`/api/klussen/${klusId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
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

      {/* ── Status (horizontale pills) ── */}
      <div className="card">
        <div className="section-label">Status</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {statuses.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(s)}
              className={`status-pill ${klus.status === s ? 'active' : ''}`}
              disabled={klus.status === s}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Interne notities (auto-save) ── */}
      <div className="card">
        <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Interne notities</span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            {notitiesBezig ? 'Opslaan…' : notitiesSaved ? '✓ Opgeslagen' : ''}
          </span>
        </div>
        <textarea
          className="form-ctrl"
          rows={4}
          value={notities}
          onChange={e => setNotities(e.target.value)}
          placeholder="Notities voor intern gebruik…"
        />
      </div>

      {/* ── Klantenportaal ── */}
      <div className="card">
        <div className="section-label">Klantenportaal</div>
        <div style={{ display: 'flex', gap: 6 }}>
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
            title="Klant-link genereren om te delen"
          >
            <span className="nav-ico" style={{ fontSize: 16 }}>link</span>
          </button>
        </div>
        {portaalLink && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#374151', wordBreak: 'break-all', lineHeight: 1.5, fontFamily: 'monospace' }}>
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
                {portaalGekopieerd ? 'Gekopieerd!' : 'Kopieer'}
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
                    Stuur
                  </a>
                )
              })()}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPortaalLink(null)}
                title="Sluiten"
              >✕</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Documenten voor klantportaal ── */}
      <div className="card">
        <div className="section-label">Documenten voor klant</div>
        {docs.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, padding: '6px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
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
        <input
          className="form-ctrl"
          value={docNaam}
          onChange={e => setDocNaam(e.target.value)}
          placeholder="Naam (optioneel, bijv. KLIC aanvraag)"
          style={{ marginBottom: 6 }}
        />
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
        {docFout && <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>{docFout}</p>}
      </div>

      {/* ── Opleveringsrapport ── */}
      <div className="card">
        <div className="section-label">Oplevering</div>
        <a
          href={`/klussen/${klusId}/oplevering`}
          className="btn btn-primary btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span className="nav-ico" style={{ fontSize: 16 }}>task_alt</span>
          Opleveringsrapport
        </a>
      </div>
    </div>
  )
}
