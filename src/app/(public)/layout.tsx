export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-tt-bg-page">{children}</div>
}
