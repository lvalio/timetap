import { prisma } from "@/lib/prisma"
import { getCalendarBusyTimes } from "@/lib/google/calendar"
import { TTLCache, GCAL_CACHE_TTL_MS } from "@/lib/cache"
import type {
  AvailabilityResult,
  DayAvailability,
  TimeSlot,
} from "@/types/availability"

const gcalCache = new TTLCache<{ start: Date; end: Date }[]>()

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

type DayName = (typeof DAY_NAMES)[number]

type BookableHours = Record<DayName, { start: string; end: string }[]>

function formatDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone }) // en-CA gives YYYY-MM-DD
}

function getDayLabel(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
  })
  const parts = formatter.formatToParts(date)
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? ""
  const day = parts.find((p) => p.type === "day")?.value ?? ""
  return `${weekday} ${day}`
}

function generateSlotsForDay(
  date: Date,
  bookableHours: BookableHours,
  timezone: string
): TimeSlot[] {
  const dateStr = formatDateInTimezone(date, timezone)
  const [y, m, d] = dateStr.split("-").map(Number)
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  const dayName = DAY_NAMES[dayOfWeek]
  const ranges = bookableHours[dayName] ?? []

  const slots: TimeSlot[] = []
  for (const range of ranges) {
    const startHour = parseInt(range.start.split(":")[0], 10)
    const endHour = parseInt(range.end.split(":")[0], 10)

    for (let hour = startHour; hour < endHour; hour++) {
      const hh = hour.toString().padStart(2, "0")
      const nextHh = (hour + 1).toString().padStart(2, "0")
      slots.push({
        start: `${dateStr}T${hh}:00:00`,
        end: `${dateStr}T${nextHh}:00:00`,
      })
    }
  }

  return slots
}

function slotToUtcRange(
  slot: TimeSlot,
  timezone: string
): { start: Date; end: Date } {
  return {
    start: zonedToUtc(slot.start, timezone),
    end: zonedToUtc(slot.end, timezone),
  }
}

function zonedToUtc(localDatetime: string, timezone: string): Date {
  // Parse components from the local datetime string directly
  const [datePart, timePart] = localDatetime.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute, second] = (timePart || "00:00:00").split(":").map(Number)

  // Create a UTC date with the same numeric values as a starting point
  const asUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0))

  // Find timezone offset by comparing how this instant renders in UTC vs target timezone
  // Both parsed as system-local, so system timezone cancels out
  const utcRepr = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }))
  const tzRepr = new Date(asUtc.toLocaleString("en-US", { timeZone: timezone }))
  const offsetMs = tzRepr.getTime() - utcRepr.getTime()

  return new Date(asUtc.getTime() - offsetMs)
}

function hasOverlap(
  slotStart: Date,
  slotEnd: Date,
  busyStart: Date,
  busyEnd: Date
): boolean {
  return busyStart < slotEnd && busyEnd > slotStart
}

export const availabilityService = {
  async getAvailableSlots(
    hostId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<AvailabilityResult> {
    // 1. Fetch host
    const host = await prisma.host.findUniqueOrThrow({
      where: { id: hostId },
      select: {
        bookableHours: true,
        timezone: true,
        googleRefreshToken: true,
      },
    })

    const timezone = host.timezone ?? "UTC"
    const bookableHours = (host.bookableHours ?? {}) as BookableHours

    // 2. Fetch Google Calendar busy times (cached, graceful degradation)
    let gcalBusyTimes: { start: Date; end: Date }[] = []
    let gcalDegraded = false

    if (host.googleRefreshToken) {
      const cached = gcalCache.get(hostId)
      if (cached) {
        gcalBusyTimes = cached
      } else {
        try {
          gcalBusyTimes = await getCalendarBusyTimes(
            host.googleRefreshToken,
            dateRange.from,
            dateRange.to
          )
          gcalCache.set(hostId, gcalBusyTimes, GCAL_CACHE_TTL_MS)
        } catch (error) {
          console.warn(
            `[availability] Google Calendar unavailable for host ${hostId}: ${(error as Error).message}`
          )
          gcalDegraded = true
        }
      }
    }

    // 3. Fetch confirmed bookings
    const bookings = await prisma.booking.findMany({
      where: {
        hostId,
        status: "confirmed",
        startTime: { gte: dateRange.from },
        endTime: { lte: dateRange.to },
      },
      select: { startTime: true, endTime: true },
    })

    // 4. Compute slots per day
    const now = new Date()
    const minBookingTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const days: DayAvailability[] = []
    const current = new Date(dateRange.from)

    while (current < dateRange.to) {
      const dateStr = formatDateInTimezone(current, timezone)
      const dayLabel = getDayLabel(current, timezone)

      const allSlots = generateSlotsForDay(current, bookableHours, timezone)

      // Filter slots
      const availableSlots = allSlots.filter((slot) => {
        const { start: slotStartUtc, end: slotEndUtc } = slotToUtcRange(
          slot,
          timezone
        )

        // Filter out slots within 24h minimum booking window
        if (slotStartUtc < minBookingTime) return false

        // Filter out slots that overlap with Google Calendar busy times
        for (const busy of gcalBusyTimes) {
          if (hasOverlap(slotStartUtc, slotEndUtc, busy.start, busy.end)) {
            return false
          }
        }

        // Filter out slots that overlap with confirmed bookings
        for (const booking of bookings) {
          if (
            hasOverlap(
              slotStartUtc,
              slotEndUtc,
              booking.startTime,
              booking.endTime
            )
          ) {
            return false
          }
        }

        return true
      })

      days.push({
        date: dateStr,
        dayLabel,
        slots: availableSlots,
      })

      current.setDate(current.getDate() + 1)
    }

    return {
      hostTimezone: timezone,
      days,
      gcalDegraded,
    }
  },

  invalidateCache(hostId: string): void {
    gcalCache.invalidate(hostId)
  },
}
