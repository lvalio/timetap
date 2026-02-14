import { z } from "zod"

export const createPackageSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  sessionCount: z
    .number()
    .int("Session count must be a whole number")
    .min(1, "At least 1 session required")
    .max(100, "Maximum 100 sessions"),
  priceInCents: z
    .number()
    .int("Price must be a whole number of cents")
    .min(0, "Price cannot be negative"),
})

export type CreatePackageInput = z.infer<typeof createPackageSchema>

export const updatePackageSchema = createPackageSchema.extend({
  isActive: z.boolean().optional(),
})

export type UpdatePackageInput = z.infer<typeof updatePackageSchema>
