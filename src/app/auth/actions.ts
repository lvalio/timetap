"use server"

import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/types/actions"

export async function signInWithGoogle(): Promise<
  ActionResult<{ url: string }>
> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })
  if (error) {
    return { success: false, error: { code: "AUTH_ERROR", message: error.message } }
  }
  return { success: true, data: { url: data.url } }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const { redirect } = await import("next/navigation")
  redirect("/auth/login")
}
