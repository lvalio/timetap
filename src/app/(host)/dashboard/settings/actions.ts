"use server"

import { createClient } from "@/lib/supabase/server"
import { updateProfileSchema } from "@/lib/validations/host"
import { hostService } from "@/services/host.service"
import type { ActionResult } from "@/types/actions"
import type { Host } from "@/generated/prisma/client"

export async function updateHostProfile(
  input: { name: string; description?: string; slug: string }
): Promise<ActionResult<Host>> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0].message,
      },
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Not authenticated" },
    }
  }

  try {
    const host = await hostService.updateProfile(user.id, parsed.data)
    return { success: true, data: host }
  } catch (error) {
    console.error("updateHostProfile failed:", error)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: {
          code: "SLUG_TAKEN",
          message: "This slug is already taken. Please choose another.",
        },
      }
    }
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not update profile. Please try again.",
      },
    }
  }
}
