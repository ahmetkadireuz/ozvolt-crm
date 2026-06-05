export default function GeenToegang() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 64 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h1 style={{ color: '#0d1b3e', marginTop: 16 }}>Link verlopen of ongeldig</h1>
      <p style={{ color: '#64748b', maxWidth: 400, margin: '12px auto 0' }}>
        Deze toegangslink is niet meer geldig. Neem contact op met Ozvolt Elektrotechniek voor een nieuwe link.
      </p>
      <a href="mailto:info@ozvoltelektro.nl" style={{
        display: 'inline-block', marginTop: 24,
        background: '#0d1b3e', color: '#fff',
        padding: '10px 24px', borderRadius: 8,
        textDecoration: 'none', fontSize: 14, fontWeight: 600,
      }}>
        Contact opnemen
      </a>
    </div>
  )
}
