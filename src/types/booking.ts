export interface BookingConfirmation {
  bookingId: string
  startTime: string // ISO 8601 UTC
  endTime: string // ISO 8601 UTC
  hostName: string
  hostTimezone: string
}
