// Overgenomen uit ozvolt-website (components/Logo.tsx), huisstijl 2026.
// Ozvolt-logo (eindontwerp 1c): drie verspringende balken + "Ozvolt" + "Elektrotechniek".
// Alle maten volgen uit u = 0,14 x lettergrootte (balkdikte = letterdikte).

type Variant = 'pos' | 'neg' | 'mono-navy' | 'mono-white'

const ACCENT = '#3E8EDE'

const PALETTES: Record<Variant, [string, string, string, string, string]> = {
  //          Oz         volt + sub   balk 1     balk 2     balk 3
  pos:          ['#1C2A44', '#5B7A99', '#1C2A44', '#5B7A99', ACCENT],
  neg:          ['#FFFFFF', '#9DB8D3', '#FFFFFF', '#9DB8D3', ACCENT],
  'mono-navy':  ['#1C2A44', '#1C2A44', '#1C2A44', '#1C2A44', '#1C2A44'],
  'mono-white': ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'],
}

export function LogoIcon({
  size = 32,
  variant = 'pos',
  className,
}: {
  size?: number
  variant?: Variant
  className?: string
}) {
  const [, , b1, b2, b3] = PALETTES[variant]
  return (
    <svg
      viewBox="0 0 46 50"
      width={(size * 46) / 50}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <rect x="10" y="0" width="36" height="10" rx="5" fill={b1} />
      <rect x="0" y="20" width="46" height="10" rx="5" fill={b2} />
      <rect x="20" y="40" width="26" height="10" rx="5" fill={b3} />
    </svg>
  )
}

/** De drie balken als decoratie, met vaste verspringing (1u en 2u). */
export function Bars({
  variant = 'pos',
  className = '',
  thickness = 8,
  gap = 6,
}: {
  variant?: Variant
  className?: string
  thickness?: number
  gap?: number
}) {
  const [, , b1, b2, b3] = PALETTES[variant]
  const bar = (bg: string, ml: string) => (
    <div style={{ height: thickness, marginLeft: ml, borderRadius: thickness / 2, background: bg }} />
  )
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }} aria-hidden="true">
      {bar(b1, '22%')}
      {bar(b2, '0')}
      {bar(b3, '44%')}
    </div>
  )
}

export default function Logo({
  size = 40,
  variant = 'pos',
  sub = true,
  collapsed = false,
  className = '',
}: {
  /** lettergrootte van "Ozvolt" in px */
  size?: number
  variant?: Variant
  sub?: boolean
  /** verbergt "Elektrotechniek" met een vloeiende overgang (header bij scrollen) */
  collapsed?: boolean
  className?: string
}) {
  const [c1, c2] = PALETTES[variant]
  const s = size
  const u = s * 0.14
  const iconH = s * 0.7
  const px = (n: number) => `${Math.round(n * 10) / 10}px`

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: px(u), fontFamily: "var(--font-outfit), 'Outfit', sans-serif" }}
      role="img"
      aria-label="Ozvolt Elektrotechniek"
    >
      <LogoIcon size={iconH} variant={variant} />
      <span style={{ display: 'flex', flexDirection: 'column' }} aria-hidden="true">
        <span
          style={{
            fontWeight: 700,
            fontSize: px(s),
            lineHeight: px(s * 0.7),
            height: px(s * 0.7),
            letterSpacing: px(-0.02 * s),
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: c1 }}>Oz</span>
          <span style={{ color: c2, marginLeft: px(-0.025 * s) }}>volt</span>
        </span>
        {sub && (
          <span
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: collapsed ? 0 : px(u),
              maxHeight: collapsed ? 0 : px(s * 0.2),
              opacity: collapsed ? 0 : 1,
              overflow: 'hidden',
              transition: 'max-height 250ms ease, margin-top 250ms ease, opacity 200ms ease',
              padding: `0 ${px(s * 0.02)}`,
              fontWeight: 600,
              fontSize: px(s * 0.16),
              lineHeight: 0.75,
              color: c2,
            }}
          >
            {'ELEKTROTECHNIEK'.split('').map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </span>
        )}
      </span>
    </span>
  )
}
