'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon, { type IconName } from '@/components/Icon'

type Notif = {
  id: number
  type: string
  titel: string
  bericht: string | null
  link: string | null
  gelezen: boolean
  aangemaakt_op: string
}

const typeConfig: Record<string, { icon: IconName; color: string }> = {
  nieuw_klus:       { icon: 'construction',    color: '#3b82f6' },
  offerte_akkoord:  { icon: 'check-circle',    color: '#16a34a' },
  factuur_te_laat:  { icon: 'alert-triangle',  color: '#dc2626' },
  afspraak_morgen:  { icon: 'calendar',        color: '#8b5cf6' },
  klus_stilstand:   { icon: 'hourglass',       color: '#f59e0b' },
  offerte_verlopen: { icon: 'timer-off',       color: '#f97316' },
  info:             { icon: 'info',            color: '#6b7280' },
}

function timeAgo(dt: string) {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`
  if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`
  return `${Math.floor(diff / 86400)}d geleden`
}

export default function NotificatiesClient({ notifs }: { notifs: Notif[] }) {
  const [items, setItems] = useState<Notif[]>(notifs)
  const [filter, setFilter] = useState<'alles' | 'ongelezen'>('ongelezen')

  const ongelezen = items.filter(n => !n.gelezen).length
  const visible = filter === 'ongelezen' ? items.filter(n => !n.gelezen) : items

  async function markRead(id: number) {
    await fetch(`/api/notificaties/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gelezen: true }) })
    setItems(prev => prev.map(n => n.id === id ? { ...n, gelezen: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notificaties/alles-gelezen', { method: 'POST' })
    setItems(prev => prev.map(n => ({ ...n, gelezen: true })))
  }

  async function deleteNotif(id: number) {
    await fetch(`/api/notificaties/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">Notificaties</h1>
          {ongelezen > 0 && (
            <span style={{ background: '#dc2626', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '.75rem', fontWeight: 700 }}>
              {ongelezen} nieuw
            </span>
          )}
        </div>
        {ongelezen > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            <Icon name="done-all" size={16} />
            Alles gelezen
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['ongelezen', 'alles'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f === 'ongelezen' ? 'Ongelezen' : 'Alle meldingen'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Icon name="bell" size={48} style={{ color: '#8ba8c4', display: 'block', margin: '0 auto 12px' }} />
          <p style={{ color: '#8ba8c4', margin: 0 }}>
            {filter === 'ongelezen' ? 'Geen ongelezen meldingen.' : 'Geen meldingen.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(notif => {
            const cfg = typeConfig[notif.type] ?? typeConfig.info
            const Wrapper = notif.link ? Link : 'div'
            return (
              <div
                key={notif.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  background: notif.gelezen ? '#fff' : '#f0f4ff',
                  border: `1px solid ${notif.gelezen ? '#e2e8f0' : '#c7d2fe'}`,
                  borderRadius: 12, padding: '14px 16px',
                  transition: 'background .2s',
                }}
              >
                {/* Icoon */}
                <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={cfg.icon} size={20} style={{ color: cfg.color }} />
                </div>

                {/* Inhoud */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {notif.link ? (
                    <Link href={notif.link} style={{ textDecoration: 'none' }} onClick={() => markRead(notif.id)}>
                      <div style={{ fontWeight: notif.gelezen ? 600 : 800, color: '#0d1b3e', marginBottom: 2 }}>{notif.titel}</div>
                    </Link>
                  ) : (
                    <div style={{ fontWeight: notif.gelezen ? 600 : 800, color: '#0d1b3e', marginBottom: 2 }}>{notif.titel}</div>
                  )}
                  {notif.bericht && <div style={{ fontSize: '.82rem', color: '#5b7fa6', marginBottom: 4 }}>{notif.bericht}</div>}
                  <div style={{ fontSize: '.75rem', color: '#8ba8c4' }}>{timeAgo(notif.aangemaakt_op)}</div>
                </div>

                {/* Acties */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!notif.gelezen && (
                    <button className="btn btn-ghost btn-sm" title="Markeer als gelezen" onClick={() => markRead(notif.id)}>
                      <Icon name="check" size={16} />
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" title="Verwijderen" onClick={() => deleteNotif(notif.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
