'use client'

export default function PrintKnoppen({ klusId }: { klusId: number }) {
  return (
    <div className="actionbar" style={{ position: 'fixed', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
      <a
        href={`/klussen/${klusId}`}
        style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, borderRadius: 8, padding: '10px 14px', background: '#fff', color: '#0d1b3e', border: '1px solid rgba(16,32,51,.18)', fontWeight: 800, fontSize: 13, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
      >
        Terug
      </a>
      <button
        onClick={() => window.print()}
        style={{ display: 'inline-flex', alignItems: 'center', minHeight: 40, border: 0, borderRadius: 8, padding: '10px 14px', background: '#0d1b3e', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 10px 30px rgba(16,32,51,.18)', fontFamily: 'Inter, sans-serif' }}
      >
        Afdrukken / PDF opslaan
      </button>
    </div>
  )
}
