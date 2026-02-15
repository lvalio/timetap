interface BookingConfirmationProps {
  hostName: string
  startTime: string // ISO 8601 UTC
  endTime: string // ISO 8601 UTC
  hostTimezone: string
  slug: string
}

function SuccessIcon() {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
      <svg
        className="h-8 w-8 text-green-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

function formatConfirmationDateTime(isoUtc: string, timezone: string) {
  const date = new Date(isoUtc)
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    hour12: false,
  }).format(date)
}

export function BookingConfirmation({
  hostName,
  startTime,
  hostTimezone,
  slug,
}: BookingConfirmationProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <SuccessIcon />

      <h1 className="mt-6 text-2xl font-bold text-tt-text-primary">
        Session booked!
      </h1>

      <p className="mt-3 text-lg text-tt-text-secondary">
        {formatConfirmationDateTime(startTime, hostTimezone)}
      </p>

      <p className="mt-1 text-sm text-tt-text-muted">
        with {hostName}
      </p>

      <p className="mt-6 text-sm text-tt-text-secondary">
        We sent a confirmation to your email
      </p>

      <p className="mt-2 text-xs text-tt-text-muted">
        Meet link will be sent via email
      </p>

      <a
        href={`/${slug}`}
        className="mt-8 text-sm font-medium text-tt-primary hover:underline"
      >
        Back to {hostName}
      </a>
    </div>
  )
}
