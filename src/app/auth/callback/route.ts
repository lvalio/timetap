import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  // Create or find host record
  let host = await hostService.findByAuthId(user.id)
  if (!host) {
    host = await hostService.createFromAuth(
      user.id,
      user.user_metadata.full_name || user.email!,
      user.email!
    )
  }

  // Redirect based on onboarding status
  const redirectPath = host.onboardingCompleted ? "/dashboard" : "/onboarding"
  return NextResponse.redirect(`${origin}${redirectPath}`)
}
