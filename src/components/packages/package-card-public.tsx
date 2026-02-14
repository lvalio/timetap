import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

interface PackageCardPublicProps {
  package: {
    id: string
    name: string
    sessionCount: number
    priceInCents: number
    isFreeIntro: boolean
  }
  slug: string
}

export function PackageCardPublic({ package: pkg, slug }: PackageCardPublicProps) {
  const perSessionPrice =
    pkg.sessionCount > 1 && !pkg.isFreeIntro
      ? formatCurrency(Math.round(pkg.priceInCents / pkg.sessionCount))
      : null

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <h3 className="font-semibold text-tt-text-primary">{pkg.name}</h3>
          <p className="text-sm text-tt-text-secondary">
            {pkg.sessionCount} {pkg.sessionCount === 1 ? "session" : "sessions"}
          </p>
        </div>
        <div className="text-right">
          {pkg.isFreeIntro ? (
            <p className="font-semibold text-tt-success">Free</p>
          ) : (
            <>
              <p className="font-semibold text-tt-text-primary">
                {formatCurrency(pkg.priceInCents)}
              </p>
              {perSessionPrice && (
                <p className="text-xs text-tt-text-muted">
                  {perSessionPrice} per session
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
      <div className="px-4 pb-4">
        {pkg.isFreeIntro ? (
          <Button
            asChild
            className="w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white"
          >
            <Link href={`/${slug}/book?package=${pkg.id}`}>
              Book free session
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${slug}/buy?package=${pkg.id}`}>Buy package</Link>
          </Button>
        )}
      </div>
    </Card>
  )
}
