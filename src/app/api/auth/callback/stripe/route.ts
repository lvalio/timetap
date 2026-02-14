import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"
import { exchangeCodeForAccount } from "@/lib/stripe/connect"

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = new URL(request.url)

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Handle Stripe errors (e.g. user cancelled)
  if (error || !code) {
    return NextResponse.redirect(
      `${appUrl}/onboarding?step=2&error=stripe_connect_failed`
    )
  }

  // CSRF validation: compare state param against stored cookie
  const storedState = request.cookies.get("stripe_oauth_state")?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/onboarding?step=2&error=stripe_connect_failed`
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
    // Exchange the authorization code for the connected account ID
    const stripeAccountId = await exchangeCodeForAccount(code)

    // Save the connected account ID to the host record
    await hostService.updateStripeAccountId(user.id, stripeAccountId)

    // Clear the state cookie and redirect with success
    const response = NextResponse.redirect(
      `${appUrl}/onboarding?step=2&stripe=connected`
    )
    response.cookies.delete("stripe_oauth_state")
    return response
  } catch {
    return NextResponse.redirect(
      `${appUrl}/onboarding?step=2&error=stripe_connect_failed`
    )
  }
}
