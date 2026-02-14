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
    .max(500, "Description must be at most 500 characters"),
  slug: slugSchema,
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const timeRangeSchema = z
  .object({
    start: z.string().regex(/^(0[89]|1[0-9]|20):00$/, "Time must be HH:00 format between 08:00 and 20:00"),
    end: z.string().regex(/^(0[89]|1[0-9]|20):00$/, "Time must be HH:00 format between 08:00 and 20:00"),
  })
  .refine((range) => range.start < range.end, {
    message: "Start time must be before end time",
  })

export const bookableHoursSchema = z.object(
  Object.fromEntries(
    VALID_DAYS.map((day) => [day, z.array(timeRangeSchema)])
  ) as Record<(typeof VALID_DAYS)[number], z.ZodArray<typeof timeRangeSchema>>
)

export type BookableHoursInput = z.infer<typeof bookableHoursSchema>

export const activateTrialSchema = z.object({
  paymentMethodId: z.string().min(1, "Payment method is required"),
})

export type ActivateTrialInput = z.infer<typeof activateTrialSchema>
