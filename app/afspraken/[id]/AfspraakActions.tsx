'use client'

import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'

export default function AfspraakActions({ afspraak, afspraakId, acceptUrl }: { afspraak: any; afspraakId: number; acceptUrl: string | null }) {
  const router = useRouter()

  async function updateStatus(status: string) {
    await fetch(`/api/afspraken/${afspraakId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  async function versturen() {
    if (!confirm('Werkafspraken per e-mail verzenden naar de klant?')) return
    const res = await fetch(`/api/afspraken/${afspraakId}/versturen`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) { alert('Verstuurd!'); router.refresh() }
    else alert('Versturen mislukt: ' + (data.error ?? 'Onbekende fout'))
  }

  async function deleteAfspraak() {
    if (!confirm('Werkafspraken verwijderen?')) return
    await fetch(`/api/afspraken/${afspraakId}`, { method: 'DELETE' })
    router.push('/afspraken')
  }

  const STATUSES = ['concept', 'gestuurd', 'geaccepteerd', 'verlopen']
  const STATUS_LABELS: Record<string, string> = { concept: 'Concept', gestuurd: 'Gestuurd', geaccepteerd: 'Geaccepteerd', verlopen: 'Verlopen' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div className="section-label">Verzenden</div>
        {!afspraak.klant_email && (
          <div className="alert alert-err" style={{ fontSize: '.78rem', padding: '8px 12px' }}>Klant heeft geen e-mailadres.</div>
        )}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
          onClick={versturen}
          disabled={!afspraak.klant_email}
        >
          <Icon name="send" size={16} />
          E-mail versturen
        </button>
        {acceptUrl && (
          <div>
            <div style={{ fontSize: '.72rem', color: '#8ba8c4', marginBottom: 4 }}>Bevestigingslink:</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-ctrl" value={acceptUrl} readOnly style={{ fontSize: '.72rem', padding: '6px 8px' }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(acceptUrl)}>
                <Icon name="copy" size={16} />
              </button>
            </div>
          </div>
        )}
        {afspraak.sent_at && (
          <div style={{ fontSize: '.75rem', color: '#8ba8c4', marginTop: 8 }}>
            Verzonden: {new Date(afspraak.sent_at).toLocaleString('nl-NL')}
          </div>
        )}
        {afspraak.accepted_at && (
          <div style={{ fontSize: '.75rem', color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
            ✓ Bevestigd door {afspraak.accepted_name}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-label">Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(s)}
              className={`btn btn-sm ${afspraak.status === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ justifyContent: 'space-between' }}
              disabled={afspraak.status === s}
            >
              {STATUS_LABELS[s]}
              {afspraak.status === s && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn-danger btn-sm" onClick={deleteAfspraak} style={{ width: '100%', justifyContent: 'center' }}>
        <Icon name="trash" size={16} />
        Verwijderen
      </button>
    </div>
  )
}
