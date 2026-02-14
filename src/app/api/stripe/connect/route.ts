import crypto from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"
import { getStripeConnectUrl } from "@/lib/stripe/connect"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  const host = await hostService.findByAuthId(user.id)
  const state = crypto.randomBytes(32).toString("hex")
  const authUrl = getStripeConnectUrl(state, host?.email ?? user.email)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set("stripe_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
  })

  return response
}
