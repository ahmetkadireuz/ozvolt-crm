// Publieke layout — geen sidebar, geen auth check
export default function PubliekLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
