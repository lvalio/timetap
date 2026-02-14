import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const host = await hostService.findByAuthId(user.id)
  if (!host) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: host.id,
    name: host.name,
    description: host.description,
    slug: host.slug,
    googleRefreshToken: host.googleRefreshToken,
    bookableHours: host.bookableHours,
    stripeAccountId: host.stripeAccountId,
    onboardingCompleted: host.onboardingCompleted,
  })
}
