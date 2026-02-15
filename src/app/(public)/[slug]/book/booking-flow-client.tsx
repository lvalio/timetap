"use client"

import { useState, useCallback } from "react"
import { TimeSlotPicker } from "@/components/booking/time-slot-picker"
import { BookingConfirmation } from "@/components/booking/booking-confirmation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { bookFreeSession } from "./actions"
import { toast } from "sonner"
import type { TimeSlot } from "@/types/availability"
import type { BookingConfirmation as BookingConfirmationType } from "@/types/booking"

interface BookingFlowClientProps {
  slug: string
  hostId: string
  hostName: string
  packageId: string
  packageName: string
}

function formatSlotTime(isoString: string) {
  return isoString.slice(11, 16)
}

export function BookingFlowClient({
  slug,
  hostId,
  hostName,
  packageId,
}: BookingFlowClientProps) {
  const [step, setStep] = useState<"select-slot" | "confirmation">(
    "select-slot"
  )
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedDayLabel, setSelectedDayLabel] = useState("")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmationData, setConfirmationData] =
    useState<BookingConfirmationType | null>(null)

  const handleSlotSelected = useCallback(
    (slot: TimeSlot, dayLabel: string) => {
      setSelectedSlot(slot)
      setSelectedDayLabel(dayLabel)
    },
    []
  )

  const handleSlotDeselected = useCallback(() => {
    setSelectedSlot(null)
    setSelectedDayLabel("")
  }, [])

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !email) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    setEmailError(null)

    const result = await bookFreeSession({
      email,
      packageId,
      hostId,
      startTime: selectedSlot.start,
    })

    setIsSubmitting(false)

    if (result.success) {
      setConfirmationData(result.data)
      setStep("confirmation")
    } else if (result.error.code === "SLOT_TAKEN") {
      toast.error(result.error.message)
      setSelectedSlot(null)
      setSelectedDayLabel("")
      // Trigger availability refresh
      const refresh = (window as Record<string, unknown>)
        .__refreshAvailability as (() => void) | undefined
      refresh?.()
    } else if (result.error.code === "VALIDATION_ERROR") {
      setEmailError(result.error.message)
    } else {
      toast.error(result.error.message)
    }
  }

  if (step === "confirmation" && confirmationData) {
    return (
      <div className="mx-auto max-w-[640px] px-4">
        <BookingConfirmation
          hostName={confirmationData.hostName}
          startTime={confirmationData.startTime}
          endTime={confirmationData.endTime}
          hostTimezone={confirmationData.hostTimezone}
          slug={slug}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[640px] px-4 py-8 pb-72">
      {/* Page header */}
      <h1 className="text-2xl font-bold text-tt-text-primary">{hostName}</h1>
      <p className="text-sm text-tt-text-secondary mt-1 mb-6">
        Book free session
      </p>

      {/* Time slot picker */}
      <TimeSlotPicker
        slug={slug}
        onSlotSelected={handleSlotSelected}
        onSlotDeselected={handleSlotDeselected}
      />

      {/* Sticky confirm bar */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 bg-tt-surface border-t border-tt-border p-4 shadow-lg z-10">
          <div className="mx-auto max-w-[640px]">
            <p className="text-sm font-medium text-tt-text-primary mb-3">
              Confirm booking — {selectedDayLabel},{" "}
              {formatSlotTime(selectedSlot.start)}
            </p>
            <div className="mb-3">
              <label
                htmlFor="email"
                className="text-sm text-tt-text-secondary mb-1 block"
              >
                Your email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError(null)
                }}
                placeholder="you@example.com"
                className={emailError ? "border-tt-error" : ""}
              />
              {emailError && (
                <p className="text-sm text-tt-error mt-1">{emailError}</p>
              )}
            </div>
            <Button
              onClick={handleConfirmBooking}
              disabled={!email || isSubmitting}
              className="w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white"
            >
              {isSubmitting ? "Booking..." : "Confirm booking"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
