import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"
import { SidebarNav } from "@/components/shared/sidebar-nav"
import { BottomTabBar } from "@/components/shared/bottom-tab-bar"

export default async function HostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const host = await hostService.findByAuthId(user.id)
  if (!host) {
    redirect("/auth/login")
  }

  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""
  const isOnboarding = pathname.startsWith("/onboarding")

  // Redirect to onboarding if not completed and not already on onboarding
  if (!host.onboardingCompleted && !isOnboarding) {
    redirect("/onboarding")
  }

  // Don't render sidebar/tab bar for onboarding route
  if (isOnboarding) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-tt-bg-page">
      <SidebarNav slug={host.slug} />
      <main className="pb-16 md:ml-[240px] md:pb-0">{children}</main>
      <BottomTabBar />
    </div>
  )
}
