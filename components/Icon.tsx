type Props = {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
  style?: React.CSSProperties
}

export type IconName =
  | 'dashboard'
  | 'briefcase'
  | 'calendar'
  | 'users'
  | 'file-text'
  | 'receipt'
  | 'chat'
  | 'bell'
  | 'payments'
  | 'cart'
  | 'bolt'
  | 'book'
  | 'sparkles'
  | 'logout'
  | 'menu'
  | 'arrow-left'
  | 'arrow-right'
  | 'plus'
  | 'phone'
  | 'search'
  | 'trash'
  | 'more'
  | 'check'
  | 'clock'
  | 'mail'
  | 'whatsapp'
  | 'pin'
  | 'edit'
  | 'eye'
  | 'download'
  | 'chevron-right'

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.7-3.4 3.4-5 6.5-5s5.8 1.6 6.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.5c2.6.1 5 1.5 6 4.5" />
    </>
  ),
  'file-text': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3z" />
      <path d="M8 9h8M8 13h6" />
    </>
  ),
  chat: (
    <path d="M21 12a8 8 0 0 1-11.8 7l-4.7 1.3 1.3-4.4A8 8 0 1 1 21 12z" />
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 8H4c0-2 2-3 2-8z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  payments: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9v.01M17 15v.01" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 3h2l2.5 12.5a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5L21 7H6" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5a2.5 2.5 0 0 0 0 5H20" />
      <path d="M4 4.5V22" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m5.5 5.5 2.5 2.5M16 16l2.5 2.5M5.5 18.5 8 16M16 8l2.5-2.5" />
    </>
  ),
  logout: (
    <>
      <path d="M15 12H4M11 8l-4 4 4 4" />
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  'arrow-left': <path d="M20 12H4M10 6l-6 6 6 6" />,
  'arrow-right': <path d="M4 12h16M14 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  phone: (
    <path d="M5 3h3.5l1.5 5-2.5 1.5a13 13 0 0 0 6 6L15 13l5 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </>
  ),
  check: <path d="m5 12 5 5 9-11" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </>
  ),
  whatsapp: (
    <path d="M3 21l1.5-5A8.5 8.5 0 1 1 8 19.5L3 21zm6.5-5.5 1 .5a6 6 0 1 0-2.5-2.5l.5 1-.5 1.5 1.5-.5zM9 9c0 0 .3-1.5 1.5-1s.5 1 .8 1.8c.2.5-.4.6-.7 1 .4 1.4 1.5 2.5 2.9 2.9.4-.3.5-.9 1-.7.8.3.8.2 1.8.8s-.5 1.5-1 1.5c-3-.1-6-3.1-6.1-6.1z" />
  ),
  pin: (
    <>
      <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16v4z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 11l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  'chevron-right': <path d="m9 6 6 6-6 6" />,
}

export default function Icon({ name, size = 18, className, strokeWidth = 1.6, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
