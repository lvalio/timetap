"use server"

import { createClient } from "@/lib/supabase/server"
import {
  updateProfileSchema,
  bookableHoursSchema,
  activateTrialSchema,
  type BookableHoursInput,
} from "@/lib/validations/host"
import { createPackageSchema } from "@/lib/validations/package"
import { createTrialSubscription } from "@/lib/stripe/billing"
import { hostService } from "@/services/host.service"
import { packageService } from "@/services/package.service"
import type { ActionResult } from "@/types/actions"
import type { Host, Package } from "@/generated/prisma/client"

export async function checkSlugAvailability(
  slug: string,
  excludeHostId?: string
): Promise<ActionResult<{ available: boolean; suggestion?: string }>> {
  try {
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

    const available = await hostService.isSlugAvailable(
      slug,
      excludeHostId ?? user.id
    )
    if (available) {
      return { success: true, data: { available: true } }
    }

    const suggestion = hostService.suggestSlug(slug)
    return { success: true, data: { available: false, suggestion } }
  } catch (error) {
    console.error("checkSlugAvailability failed:", error)
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Could not check slug" },
    }
  }
}

export async function saveProfile(
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
    console.error("saveProfile failed:", error)
    // Handle unique constraint violation on slug
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
        message: "Could not save profile. Please try again.",
      },
    }
  }
}

export async function saveBookableHours(
  input: BookableHoursInput
): Promise<ActionResult<Host>> {
  const parsed = bookableHoursSchema.safeParse(input)
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
    const host = await hostService.updateBookableHours(user.id, parsed.data)
    return { success: true, data: host }
  } catch (error) {
    console.error("saveBookableHours failed:", error)
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not save bookable hours. Please try again.",
      },
    }
  }
}

export async function createPackage(
  input: { name: string; sessionCount: number; priceInCents: number }
): Promise<ActionResult<Package>> {
  const parsed = createPackageSchema.safeParse(input)
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
    const pkg = await packageService.create(user.id, parsed.data)
    return { success: true, data: pkg }
  } catch (error) {
    console.error("createPackage failed:", error)
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not create package. Please try again.",
      },
    }
  }
}

export async function activateTrial(
  input: { paymentMethodId: string }
): Promise<ActionResult<{ trialEndsAt: string; slug: string }>> {
  const parsed = activateTrialSchema.safeParse(input)
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
    const host = await hostService.findByAuthId(user.id)
    if (!host) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Host not found" },
      }
    }

    const { subscriptionId, trialEnd } = await createTrialSubscription({
      hostEmail: host.email,
      hostId: user.id,
      paymentMethodId: parsed.data.paymentMethodId,
    })

    await hostService.activateTrial(user.id, {
      subscriptionId,
      subscriptionStatus: "trialing",
      trialEndsAt: trialEnd,
    })

    await hostService.completeOnboarding(user.id)

    return {
      success: true,
      data: {
        trialEndsAt: trialEnd.toISOString(),
        slug: host.slug ?? "",
      },
    }
  } catch (error) {
    console.error("activateTrial failed:", error)
    return {
      success: false,
      error: {
        code: "PAYMENT_ERROR",
        message: "Card didn't go through. Try a different card?",
      },
    }
  }
}
