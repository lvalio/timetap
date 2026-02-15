import { prisma } from "@/lib/prisma"
import { availabilityService } from "@/services/availability.service"

export class SlotTakenError extends Error {
  code = "SLOT_TAKEN"
  constructor(message = "This slot was just booked") {
    super(message)
    this.name = "SlotTakenError"
  }
}

export const bookingService = {
  async createFreeBooking(input: {
    hostId: string
    customerId: string
    packageId: string
    startTime: Date
    endTime: Date
  }) {
    const booking = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({
        where: {
          hostId: input.hostId,
          startTime: input.startTime,
          status: "confirmed",
        },
      })
      if (existing) {
        throw new SlotTakenError()
      }

      return tx.booking.create({
        data: {
          hostId: input.hostId,
          customerId: input.customerId,
          packageId: input.packageId,
          startTime: input.startTime,
          endTime: input.endTime,
          status: "confirmed",
        },
        select: { id: true, startTime: true, endTime: true, status: true },
      })
    })

    availabilityService.invalidateCache(input.hostId)

    return booking
  },
}
