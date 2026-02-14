import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { hostService } from "@/services/host.service"
import { packageService } from "@/services/package.service"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { PackageCardPublic } from "@/components/packages/package-card-public"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const host = await hostService.findBySlugPublic(slug)
  if (!host) {
    return { title: "Not Found | TimeTap" }
  }
  return {
    title: `${host.name} | TimeTap`,
    description: host.description || `Book sessions with ${host.name} on TimeTap`,
    openGraph: {
      title: `${host.name} | TimeTap`,
      description: host.description || `Book sessions with ${host.name} on TimeTap`,
      type: "profile",
    },
  }
}

export default async function PublicHostPage({ params }: PageProps) {
  const { slug } = await params
  const host = await hostService.findBySlugPublic(slug)
  if (!host) notFound()

  const packages = await packageService.findActiveByHostId(host.id)
  const freeIntroPackage = packages.find((p) => p.isFreeIntro) ?? null
  const paidPackages = packages.filter((p) => !p.isFreeIntro)

  const initials = host.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)

  return (
    <>
      <section className="bg-gradient-to-r from-[#4facfe] to-[#00f2fe] px-4 py-12">
        <div className="mx-auto max-w-[640px] text-center">
          <Avatar className="mx-auto h-20 w-20 border-4 border-white">
            {host.avatarUrl ? (
              <AvatarImage src={host.avatarUrl} alt={host.name} />
            ) : null}
            <AvatarFallback className="bg-white/20 text-2xl text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-4 text-2xl font-bold text-white">{host.name}</h1>
          {host.description && (
            <p className="mt-2 text-white/85">{host.description}</p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[640px] px-4 py-8">
        {freeIntroPackage && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-tt-text-muted">
              Start here
            </p>
            <PackageCardPublic package={freeIntroPackage} slug={slug} />
          </div>
        )}

        {paidPackages.length > 0 && (
          <div className="space-y-4">
            {paidPackages.map((pkg) => (
              <PackageCardPublic key={pkg.id} package={pkg} slug={slug} />
            ))}
          </div>
        )}

        {packages.length === 0 && (
          <p className="py-8 text-center text-tt-text-secondary">
            No packages available yet
          </p>
        )}
      </main>

      <footer className="mx-auto max-w-[640px] px-4 py-8 text-center">
        <p className="text-sm text-tt-text-muted">
          Already a client?{" "}
          <Link
            href={`/auth/magic-link?host=${slug}`}
            className="text-tt-primary underline hover:text-tt-primary-hover"
          >
            Access your workspace
          </Link>
        </p>
        <div className="mt-6 text-xs text-tt-text-muted">
          <p>Powered by TimeTap</p>
          <Link
            href="/privacy"
            className="underline hover:text-tt-text-secondary"
          >
            Privacy policy
          </Link>
        </div>
      </footer>
    </>
  )
}
