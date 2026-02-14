import Link from "next/link"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { packageService } from "@/services/package.service"
import { PackageCardHost } from "@/components/packages/package-card-host"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function PackagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  const packages = await packageService.listByHostId(user.id)

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-tt-text-primary">
          Packages
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/packages/new">
            <Plus className="mr-1 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <p className="text-sm text-tt-text-muted">
            No packages yet. Create your first package to start receiving
            bookings.
          </p>
          <Button asChild className="mt-4 bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90">
            <Link href="/dashboard/packages/new">Create package</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {packages.map((pkg) => (
            <PackageCardHost
              key={pkg.id}
              id={pkg.id}
              name={pkg.name}
              sessionCount={pkg.sessionCount}
              priceInCents={pkg.priceInCents}
              isActive={pkg.isActive}
            />
          ))}
        </div>
      )}
    </div>
  )
}
