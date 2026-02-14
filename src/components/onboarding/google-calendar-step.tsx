"use client"

import { useState, useTransition } from "react"
import { Calendar, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  WeeklyHoursGrid,
  DEFAULT_HOURS,
  gridToHours,
} from "@/components/onboarding/weekly-hours-grid"
import { saveBookableHours } from "@/app/(host)/onboarding/actions"
import type { BookableHoursInput } from "@/lib/validations/host"

interface GoogleCalendarStepProps {
  calendarConnected: boolean
  error?: string | null
  onComplete: () => void
}

export function GoogleCalendarStep({
  calendarConnected,
  error,
  onComplete,
}: GoogleCalendarStepProps) {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hours, setHours] = useState<BookableHoursInput>(DEFAULT_HOURS)

  const handleConnect = () => {
    setIsRedirecting(true)
    window.location.href = "/api/google/connect"
  }

  const handleSaveHours = () => {
    setSaveError(null)
    startTransition(async () => {
      const result = await saveBookableHours(hours)
      if (result.success) {
        onComplete()
      } else {
        setSaveError(result.error.message)
      }
    })
  }

  return (
    <div className="flex flex-col">
      {/* Section A: Calendar Connect */}
      <div className="text-center">
        <p className="text-base text-tt-text-secondary">
          We&apos;ll check your Google Calendar to avoid double bookings. Your
          clients will only see times when you&apos;re genuinely free.
        </p>

        {error && (
          <div className="mt-4 w-full rounded-md bg-tt-error-light px-4 py-3 text-sm text-tt-error">
            Google Calendar connection didn&apos;t go through. Let&apos;s try
            again.
          </div>
        )}

        {calendarConnected ? (
          <div className="mt-4 flex items-center justify-center gap-2 text-tt-success">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">Calendar connected!</span>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isRedirecting}
            className="mt-6 w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {isRedirecting ? "Redirecting to Google…" : "Connect Calendar"}
          </Button>
        )}
      </div>

      {/* Section B: Bookable Hours (only when calendar is connected) */}
      {calendarConnected && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-tt-text-primary">
            Set your bookable hours
          </h2>
          <p className="mt-1 text-sm text-tt-text-secondary">
            Select the hours when clients can book sessions with you.
          </p>

          <div className="mt-4">
            <WeeklyHoursGrid onChange={setHours} />
          </div>

          {saveError && (
            <div className="mt-4 rounded-md bg-tt-error-light px-4 py-3 text-sm text-tt-error">
              {saveError}
            </div>
          )}

          <Button
            onClick={handleSaveHours}
            disabled={isPending}
            className="mt-6 w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90"
          >
            {isPending ? "Saving…" : "Continue"}
          </Button>
        </div>
      )}
    </div>
  )
}
