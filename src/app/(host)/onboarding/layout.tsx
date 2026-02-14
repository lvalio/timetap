import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"

export default async function OnboardingLayout({
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

  if (host.onboardingCompleted) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-tt-bg-page px-4 py-8">
      <div className="w-full max-w-[480px]">{children}</div>
    </div>
  )
}
