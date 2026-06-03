'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

  async function deleteKlus() {
    if (!confirm('Klus verwijderen? Dit kan niet ongedaan worden gemaakt.')) return
    await fetch(`/api/klussen/${klusId}`, { method: 'DELETE' })
    router.push('/klussen')
  }

  const BEL_COLORS: Record<string, string> = {
    niet_gebeld: '#8ba8c4', opgenomen: '#16a34a', niet_opgenomen: '#ea580c', voicemail: '#7c3aed',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
