import { describe, it, expect, vi, beforeEach } from "vitest"
import { bookingService, SlotTakenError } from "./booking.service"

const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockInvalidateCache = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((fn) =>
      fn({
        booking: {
          findFirst: (...args: unknown[]) => mockFindFirst(...args),
          create: (...args: unknown[]) => mockCreate(...args),
        },
      })
    ),
  },
}))

vi.mock("@/services/availability.service", () => ({
  availabilityService: {
    invalidateCache: (...args: unknown[]) => mockInvalidateCache(...args),
  },
}))

describe("bookingService", () => {
  const input = {
    hostId: "host-1",
    customerId: "cust-1",
    packageId: "pkg-1",
    startTime: new Date("2026-02-16T10:00:00Z"),
    endTime: new Date("2026-02-16T11:00:00Z"),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createFreeBooking", () => {
    it("creates booking successfully when slot is available", async () => {
      mockFindFirst.mockResolvedValue(null)
      const created = {
        id: "booking-1",
        startTime: input.startTime,
        endTime: input.endTime,
        status: "confirmed",
      }
      mockCreate.mockResolvedValue(created)

      const result = await bookingService.createFreeBooking(input)

      expect(result).toEqual(created)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          hostId: input.hostId,
          startTime: input.startTime,
          status: "confirmed",
        },
      })
      expect(mockCreate).toHaveBeenCalledWith({
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

    it("throws SlotTakenError when slot already has a confirmed booking", async () => {
      mockFindFirst.mockResolvedValue({ id: "existing-booking" })

      await expect(bookingService.createFreeBooking(input)).rejects.toThrow(
        SlotTakenError
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it("calls availabilityService.invalidateCache after successful booking", async () => {
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: "booking-1",
        startTime: input.startTime,
        endTime: input.endTime,
        status: "confirmed",
      })

      await bookingService.createFreeBooking(input)

      expect(mockInvalidateCache).toHaveBeenCalledWith(input.hostId)
    })

    it("does not invalidate cache when booking fails", async () => {
      mockFindFirst.mockResolvedValue({ id: "existing-booking" })

      await expect(bookingService.createFreeBooking(input)).rejects.toThrow()
      expect(mockInvalidateCache).not.toHaveBeenCalled()
    })

    it("uses transaction for atomicity", async () => {
      const { prisma } = await import("@/lib/prisma")
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: "booking-1",
        startTime: input.startTime,
        endTime: input.endTime,
        status: "confirmed",
      })

      await bookingService.createFreeBooking(input)

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("SlotTakenError", () => {
    it("has correct code and name", () => {
      const error = new SlotTakenError()
      expect(error.code).toBe("SLOT_TAKEN")
      expect(error.name).toBe("SlotTakenError")
      expect(error.message).toBe("This slot was just booked")
    })
  })
})
