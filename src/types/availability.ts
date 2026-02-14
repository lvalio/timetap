export interface TimeSlot {
  start: string // ISO 8601 datetime in host timezone (e.g., "2026-02-16T09:00:00")
  end: string // ISO 8601 datetime in host timezone (e.g., "2026-02-16T10:00:00")
}

export interface DayAvailability {
  date: string // ISO date (e.g., "2026-02-16")
  dayLabel: string // Short label (e.g., "Mon 16")
  slots: TimeSlot[] // Available slots for this day (empty if none)
}

export interface AvailabilityResult {
  hostTimezone: string // IANA timezone (e.g., "Europe/Rome")
  days: DayAvailability[] // One entry per day in range
  gcalDegraded: boolean // true if Google Calendar was unavailable
}
