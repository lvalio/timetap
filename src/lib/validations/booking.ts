import { z } from "zod"

export const bookFreeSessionSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  packageId: z.string().uuid(),
  hostId: z.string().uuid(),
  startTime: z.string().datetime({ offset: true, local: true }),
})

export type BookFreeSessionInput = z.infer<typeof bookFreeSessionSchema>
