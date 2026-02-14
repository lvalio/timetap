import crypto from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGoogleCalendarAuthUrl } from "@/lib/google/auth"

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

  const state = crypto.randomBytes(32).toString("hex")
  const authUrl = getGoogleCalendarAuthUrl(state)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
  })

  return response
}
