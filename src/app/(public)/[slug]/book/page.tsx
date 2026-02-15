import { redirect } from "next/navigation"
import { hostService } from "@/services/host.service"
import { packageService } from "@/services/package.service"
import { BookingFlowClient } from "./booking-flow-client"

interface BookingPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ package?: string }>
}

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { slug } = await params
  const { package: packageId } = await searchParams

  if (!packageId) {
    redirect(`/${slug}`)
  }

  const host = await hostService.findBySlugPublic(slug)
  if (!host) {
    redirect(`/${slug}`)
  }

  const pkg = await packageService.findById(packageId, host.id)
  if (!pkg || !pkg.isFreeIntro || !pkg.isActive) {
    redirect(`/${slug}`)
  }

  return (
    <BookingFlowClient
      slug={slug}
      hostId={host.id}
      hostName={host.name}
      packageId={pkg.id}
      packageName={pkg.name}
    />
  )
}
