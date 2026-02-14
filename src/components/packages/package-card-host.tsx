import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface PackageCardHostProps {
  id: string
  name: string
  sessionCount: number
  priceInCents: number
  isActive: boolean
}

function formatPrice(priceInCents: number): string {
  if (priceInCents === 0) return "Free"
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(priceInCents / 100)
}

export function PackageCardHost({
  id,
  name,
  sessionCount,
  priceInCents,
  isActive,
}: PackageCardHostProps) {
  const perSessionPrice =
    sessionCount > 1 && priceInCents > 0
      ? formatPrice(Math.round(priceInCents / sessionCount))
      : null

  return (
    <Link
      href={`/dashboard/packages/${id}`}
      className="block rounded-lg border border-tt-divider p-4 transition-colors hover:bg-tt-surface"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-medium text-tt-text-primary">{name}</h3>
          <p className="mt-1 text-sm text-tt-text-secondary">
            {sessionCount} session{sessionCount > 1 ? "s" : ""} ·{" "}
            <span className={priceInCents === 0 ? "text-tt-success" : ""}>
              {formatPrice(priceInCents)}
            </span>
          </p>
          {perSessionPrice && (
            <p className="mt-0.5 text-xs text-tt-text-muted">
              {perSessionPrice}/session
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={
            isActive
              ? "border-tt-success/30 bg-tt-success-light text-tt-success"
              : "border-tt-divider bg-tt-surface text-tt-text-muted"
          }
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </Link>
  )
}
