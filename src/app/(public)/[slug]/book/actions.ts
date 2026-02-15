"use server"

import { bookFreeSessionSchema } from "@/lib/validations/booking"
import { customerService } from "@/services/customer.service"
import { bookingService, SlotTakenError } from "@/services/booking.service"
import { packageService } from "@/services/package.service"
import { hostService } from "@/services/host.service"
import type { ActionResult } from "@/types/actions"
import type { BookingConfirmation } from "@/types/booking"
import type { BookFreeSessionInput } from "@/lib/validations/booking"

export async function bookFreeSession(
  input: BookFreeSessionInput
): Promise<ActionResult<BookingConfirmation>> {
  // 1. Validate input
  const parsed = bookFreeSessionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0].message,
      },
    }
  }

  // 2. NO AUTH CHECK — public action

  // 3. Verify package is free intro, active, and belongs to host
  const pkg = await packageService.findById(
    parsed.data.packageId,
    parsed.data.hostId
  )
  if (!pkg || !pkg.isFreeIntro || !pkg.isActive) {
    return {
      success: false,
      error: {
        code: "INVALID_PACKAGE",
        message: "This package is not available.",
      },
    }
  }

  // 4. Get host info for confirmation
  const host = await hostService.findByAuthId(parsed.data.hostId)

  // 5. Find or create customer
  const customer = await customerService.findOrCreate(
    parsed.data.hostId,
    parsed.data.email
  )

  // 6. Create booking with optimistic locking
  const startTime = new Date(parsed.data.startTime)
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour

  try {
    const booking = await bookingService.createFreeBooking({
      hostId: parsed.data.hostId,
      customerId: customer.id,
      packageId: parsed.data.packageId,
      startTime,
      endTime,
    })

    return {
      success: true,
      data: {
        bookingId: booking.id,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        hostName: host?.name ?? "",
        hostTimezone: host?.timezone ?? "UTC",
      },
    }
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return {
        success: false,
        error: {
          code: "SLOT_TAKEN",
          message:
            "That slot was just booked by someone else — here are other times that work.",
        },
      }
    }
    console.error("bookFreeSession failed:", error)
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not complete your booking. Please try again.",
      },
    }
  }
}
