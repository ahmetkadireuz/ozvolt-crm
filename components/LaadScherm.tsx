// Direct zichtbaar laadscherm tijdens navigeren (server haalt gegevens op)
export default function LaadScherm() {
  return (
    <div aria-busy="true" aria-label="Laden">
      <div className="topbar">
        <div>
          <div className="skel" style={{ width: 180, height: 24 }} />
          <div className="skel" style={{ width: 120, height: 12, marginTop: 8 }} />
        </div>
        <div className="skel" style={{ width: 130, height: 38, borderRadius: 10 }} />
      </div>
      <div className="stat-grid">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="stat-card">
            <div className="skel" style={{ width: '50%', height: 10 }} />
            <div className="skel" style={{ width: '70%', height: 22, marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="card">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--line-soft)' : 'none' }}>
            <div className="skel" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skel" style={{ width: '40%', height: 12 }} />
              <div className="skel" style={{ width: '65%', height: 10, marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
