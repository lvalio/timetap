import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"
import { exchangeCodeForTokens } from "@/lib/google/auth"

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = new URL(request.url)

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Handle Google errors (e.g. user cancelled)
  if (error || !code) {
    return NextResponse.redirect(
      `${appUrl}/onboarding?step=3&error=google_connect_failed`
    )
  }

  // CSRF validation: compare state param against stored cookie
  const storedState = request.cookies.get("google_oauth_state")?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/onboarding?step=3&error=google_connect_failed`
    )
  }

  // Verify authenticated user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${appUrl}/auth/login`)
  }

  try {
    const refreshToken = await exchangeCodeForTokens(code)
    await hostService.updateGoogleRefreshToken(user.id, refreshToken)

    const response = NextResponse.redirect(
      `${appUrl}/onboarding?step=3&google=connected`
    )
    response.cookies.delete("google_oauth_state")
    return response
  } catch (err) {
    console.error("Google OAuth token exchange failed:", err)
    return NextResponse.redirect(
      `${appUrl}/onboarding?step=3&error=google_connect_failed`
    )
  }
}
