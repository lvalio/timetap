import { redirect } from "next/navigation"
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

  return (
    <div className="min-h-screen bg-tt-bg-page">
      <SidebarNav slug={host.slug} />
      <main className="pb-16 md:ml-[240px] md:pb-0">{children}</main>
      <BottomTabBar />
    </div>
  )
}
