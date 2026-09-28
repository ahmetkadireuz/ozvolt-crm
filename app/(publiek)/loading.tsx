// Neutraal laadscherm (geen CRM-skelet in klant- en publieke pagina's)
export default function Laden() {
  return (
    <div aria-busy="true" aria-label="Laden" style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div className="skel" style={{ width: '45%', height: 22 }} />
      <div className="skel" style={{ width: '100%', height: 160, marginTop: 16, borderRadius: 14 }} />
    </div>
  )
}
