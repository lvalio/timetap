import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { availabilityService } from "./availability.service"

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    host: { findUniqueOrThrow: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}))

// Mock Google Calendar
vi.mock("@/lib/google/calendar", () => ({
  getCalendarBusyTimes: vi.fn(),
}))

// Use real cache implementation
// (we test cache behavior through the service)

import { prisma } from "@/lib/prisma"
import { getCalendarBusyTimes } from "@/lib/google/calendar"

const mockHost = prisma.host.findUniqueOrThrow as ReturnType<typeof vi.fn>
const mockBookings = prisma.booking.findMany as ReturnType<typeof vi.fn>
const mockGcal = getCalendarBusyTimes as ReturnType<typeof vi.fn>

const DEFAULT_HOST = {
  bookableHours: {
    sunday: [],
    monday: [{ start: "09:00", end: "17:00" }],
    tuesday: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }],
    wednesday: [],
    thursday: [{ start: "10:00", end: "16:00" }],
    friday: [{ start: "09:00", end: "15:00" }],
    saturday: [{ start: "09:00", end: "12:00" }],
  },
  timezone: "Europe/Rome",
  googleRefreshToken: "test-refresh-token",
}

// Use a fixed "now" far enough in the past that all test dates are >24h away
// Tests use dates in March 2026, so set "now" to Feb 14 2026
const FIXED_NOW = new Date("2026-02-14T00:00:00Z")

describe("availabilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    // Invalidate cache between tests
    availabilityService.invalidateCache("host-1")
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setupMocks(overrides?: {
    host?: Partial<typeof DEFAULT_HOST>
    bookings?: { startTime: Date; endTime: Date }[]
    gcalBusy?: { start: Date; end: Date }[]
  }) {
    mockHost.mockResolvedValue({ ...DEFAULT_HOST, ...overrides?.host })
    mockBookings.mockResolvedValue(overrides?.bookings ?? [])
    mockGcal.mockResolvedValue(overrides?.gcalBusy ?? [])
  }

  it("returns slots from bookable hours when no conflicts exist", async () => {
    setupMocks()

    // Monday March 2, 2026
    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    expect(result.hostTimezone).toBe("Europe/Rome")
    expect(result.gcalDegraded).toBe(false)
    expect(result.days).toHaveLength(1)

    // Monday: 09:00-17:00 = 8 slots
    const monday = result.days[0]
    expect(monday.slots).toHaveLength(8)
    expect(monday.slots[0].start).toContain("T09:00:00")
    expect(monday.slots[0].end).toContain("T10:00:00")
    expect(monday.slots[7].start).toContain("T16:00:00")
    expect(monday.slots[7].end).toContain("T17:00:00")
  })

  it("subtracts Google Calendar busy times correctly", async () => {
    // Monday March 2, 2026: 09:00-17:00 Rome = 08:00-16:00 UTC (CET = UTC+1)
    setupMocks({
      gcalBusy: [
        {
          start: new Date("2026-03-02T09:00:00Z"), // 10:00 Rome
          end: new Date("2026-03-02T10:00:00Z"),   // 11:00 Rome
        },
      ],
    })

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    // Should have 7 slots instead of 8 (10:00-11:00 Rome slot removed)
    const monday = result.days[0]
    expect(monday.slots).toHaveLength(7)
    const starts = monday.slots.map((s) => s.start)
    expect(starts).not.toContain(expect.stringContaining("T10:00:00"))
  })

  it("subtracts existing confirmed bookings correctly", async () => {
    // Monday March 2, 2026: booking at 14:00-15:00 Rome = 13:00-14:00 UTC
    setupMocks({
      bookings: [
        {
          startTime: new Date("2026-03-02T13:00:00Z"), // 14:00 Rome
          endTime: new Date("2026-03-02T14:00:00Z"),   // 15:00 Rome
        },
      ],
    })

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    const monday = result.days[0]
    expect(monday.slots).toHaveLength(7)
    const starts = monday.slots.map((s) => s.start)
    expect(starts).not.toContain(expect.stringContaining("T14:00:00"))
  })

  it("enforces 24-hour minimum booking window", async () => {
    setupMocks()

    // Set "now" to Monday March 2 at 11:00 Rome (10:00 UTC)
    vi.setSystemTime(new Date("2026-03-02T10:00:00Z"))

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-04T00:00:00Z") // Mon + Tue

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    // Monday: all slots should be within 24h window, so filtered out
    // Tuesday slots before 11:00 Rome (within 24h) should also be filtered
    const monday = result.days[0]
    // All Monday slots (09:00-17:00) are within 24h of "now" (March 2 11:00)
    // 24h from now = March 3 11:00 Rome
    // So Monday is completely filtered out
    expect(monday.slots).toHaveLength(0)

    // Tuesday: 09:00 and 10:00 Rome are within 24h window, rest should be available
    const tuesday = result.days[1]
    // Tuesday bookable: 09:00-12:00 (3 slots) + 14:00-18:00 (4 slots) = 7 total
    // Within 24h: 09:00, 10:00 (before 11:00 March 3) = 2 filtered
    // Available: 11:00 + 14:00, 15:00, 16:00, 17:00 = 5 slots
    expect(tuesday.slots).toHaveLength(5)
    expect(tuesday.slots[0].start).toContain("T11:00:00")
  })

  it("slots start from tomorrow, never today", async () => {
    setupMocks()

    // Set "now" to Monday March 2 at 06:00 UTC (07:00 Rome, before bookable hours)
    vi.setSystemTime(new Date("2026-03-02T06:00:00Z"))

    // Request from today
    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-04T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    // Monday (today): all slots within 24h from 07:00 Rome -> filtered until March 3 07:00 Rome
    const monday = result.days[0]
    // All Monday slots 09:00-17:00 are within 24h, so all filtered
    expect(monday.slots).toHaveLength(0)
  })

  it("returns empty slots array for days with no bookable hours", async () => {
    setupMocks()

    // Wednesday and Sunday have no bookable hours
    // Wednesday March 4, 2026
    const from = new Date("2026-03-04T00:00:00Z")
    const to = new Date("2026-03-05T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    expect(result.days).toHaveLength(1)
    expect(result.days[0].slots).toHaveLength(0)
  })

  it("gracefully degrades when Google Calendar API fails", async () => {
    mockHost.mockResolvedValue({ ...DEFAULT_HOST })
    mockBookings.mockResolvedValue([])
    mockGcal.mockRejectedValue(new Error("API unavailable"))

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    expect(result.gcalDegraded).toBe(true)
    // Should still return slots (just without GCal filtering)
    expect(result.days[0].slots.length).toBeGreaterThan(0)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[availability] Google Calendar unavailable")
    )
    warnSpy.mockRestore()
  })

  it("handles host with no Google refresh token", async () => {
    setupMocks({
      host: { googleRefreshToken: null },
    })

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    expect(result.gcalDegraded).toBe(false)
    expect(mockGcal).not.toHaveBeenCalled()
    expect(result.days[0].slots.length).toBeGreaterThan(0)
  })

  it("returns correct day labels in host timezone", async () => {
    setupMocks()

    // Monday March 2 to Wednesday March 4
    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-05T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    expect(result.days).toHaveLength(3)
    expect(result.days[0].dayLabel).toMatch(/Mon.*2/)
    expect(result.days[1].dayLabel).toMatch(/Tue.*3/)
    expect(result.days[2].dayLabel).toMatch(/Wed.*4/)
  })

  it("handles overlapping busy times (partial and full slot overlap)", async () => {
    setupMocks({
      gcalBusy: [
        {
          // Partial overlap with 09:00-10:00 Rome slot (starts at 08:30 Rome = 07:30 UTC)
          start: new Date("2026-03-02T07:30:00Z"),
          end: new Date("2026-03-02T08:30:00Z"),
        },
        {
          // Full overlap spanning 11:00-13:00 Rome (covers 11:00 and 12:00 slots)
          start: new Date("2026-03-02T10:00:00Z"),
          end: new Date("2026-03-02T12:00:00Z"),
        },
      ],
    })

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    const result = await availabilityService.getAvailableSlots("host-1", { from, to })

    const monday = result.days[0]
    // Monday: 8 slots originally, minus 09:00 (partial), 11:00, 12:00 (full span) = 5
    expect(monday.slots).toHaveLength(5)
    const starts = monday.slots.map((s) => s.start)
    expect(starts).not.toContain(expect.stringContaining("T09:00:00"))
    expect(starts).not.toContain(expect.stringContaining("T11:00:00"))
    expect(starts).not.toContain(expect.stringContaining("T12:00:00"))
  })

  it("caches Google Calendar results (second call uses cache)", async () => {
    setupMocks()

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    await availabilityService.getAvailableSlots("host-1", { from, to })
    await availabilityService.getAvailableSlots("host-1", { from, to })

    // GCal should only be called once (second call uses cache)
    expect(mockGcal).toHaveBeenCalledTimes(1)
  })

  it("invalidateCache causes fresh Google Calendar fetch", async () => {
    setupMocks()

    const from = new Date("2026-03-02T00:00:00Z")
    const to = new Date("2026-03-03T00:00:00Z")

    await availabilityService.getAvailableSlots("host-1", { from, to })
    expect(mockGcal).toHaveBeenCalledTimes(1)

    availabilityService.invalidateCache("host-1")

    await availabilityService.getAvailableSlots("host-1", { from, to })
    expect(mockGcal).toHaveBeenCalledTimes(2)
  })
})
