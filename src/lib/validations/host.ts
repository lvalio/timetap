import { z } from "zod"

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(30, "Slug must be at most 30 characters")
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    "Only lowercase letters, numbers, and hyphens (no leading/trailing hyphens)"
  )

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .default(""),
  slug: slugSchema,
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
