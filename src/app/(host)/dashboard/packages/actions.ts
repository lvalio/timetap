"use server"

import { createClient } from "@/lib/supabase/server"
import {
  createPackageSchema,
  updatePackageSchema,
} from "@/lib/validations/package"
import { packageService } from "@/services/package.service"
import type { ActionResult } from "@/types/actions"
import type { Package } from "@/generated/prisma/client"

export async function createPackageAction(
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
    console.error("createPackageAction failed:", error)
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not create package. Please try again.",
      },
    }
  }
}

export async function updatePackageAction(
  id: string,
  input: { name: string; sessionCount: number; priceInCents: number; isActive?: boolean }
): Promise<ActionResult<Package>> {
  const parsed = updatePackageSchema.safeParse(input)
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
    const pkg = await packageService.update(id, user.id, parsed.data)
    return { success: true, data: pkg }
  } catch (error) {
    console.error("updatePackageAction failed:", error)
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not update package. Please try again.",
      },
    }
  }
}

export async function deactivatePackageAction(
  id: string
): Promise<ActionResult<Package>> {
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
    const pkg = await packageService.deactivate(id, user.id)
    return { success: true, data: pkg }
  } catch (error) {
    console.error("deactivatePackageAction failed:", error)
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not deactivate package. Please try again.",
      },
    }
  }
}

export async function listPackagesAction(): Promise<ActionResult<Package[]>> {
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
    const packages = await packageService.listByHostId(user.id)
    return { success: true, data: packages }
  } catch (error) {
    console.error("listPackagesAction failed:", error)
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not load packages. Please try again.",
      },
    }
  }
}
