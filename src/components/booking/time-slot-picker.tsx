"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  AvailabilityResult,
  TimeSlot,
} from "@/types/availability"

interface TimeSlotPickerProps {
  slug: string
  onSlotSelected: (slot: TimeSlot, dayLabel: string) => void
  onSlotDeselected: () => void
}

function formatSlotTime(isoString: string) {
  return isoString.slice(11, 16)
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function TimeSlotPicker({
  slug,
  onSlotSelected,
  onSlotDeselected,
}: TimeSlotPickerProps) {
  const [availability, setAvailability] = useState<AvailabilityResult | null>(
    null
  )
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pillsRef = useRef<HTMLDivElement>(null)

  const fetchAvailability = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/${slug}/availability`)
      const data: AvailabilityResult = await res.json()
      setAvailability(data)
      const firstDayWithSlots = data.days.findIndex(
        (d) => d.slots.length > 0
      )
      setSelectedDay(firstDayWithSlots >= 0 ? firstDayWithSlots : 0)
    } catch {
      setError("Could not load available times. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const handleSlotClick = (slot: TimeSlot) => {
    if (selectedSlot?.start === slot.start) {
      setSelectedSlot(null)
      onSlotDeselected()
    } else {
      setSelectedSlot(slot)
      if (availability) {
        onSlotSelected(slot, availability.days[selectedDay].dayLabel)
      }
    }
  }

  const handleDayChange = (index: number) => {
    setSelectedDay(index)
    setSelectedSlot(null)
    onSlotDeselected()
  }

  const handlePillKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!availability) return
    if (e.key === "ArrowRight" && index < availability.days.length - 1) {
      e.preventDefault()
      handleDayChange(index + 1)
      const pills = pillsRef.current?.children
      if (pills?.[index + 1]) {
        ;(pills[index + 1] as HTMLElement).focus()
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      handleDayChange(index - 1)
      const pills = pillsRef.current?.children
      if (pills?.[index - 1]) {
        ;(pills[index - 1] as HTMLElement).focus()
      }
    }
  }

  // Expose refresh for parent to call after SLOT_TAKEN
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__refreshAvailability = () => {
      setSelectedSlot(null)
      onSlotDeselected()
      fetchAvailability()
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__refreshAvailability
    }
  }, [fetchAvailability, onSlotDeselected])

  if (loading) {
    return (
      <div className="space-y-4" data-testid="slot-picker-skeleton">
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[44px] w-[72px] rounded-full" />
          ))}
        </div>
        <div className="space-y-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[44px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-center text-tt-error py-8">{error}</p>
    )
  }

  if (!availability) return null

  const currentDay = availability.days[selectedDay]

  return (
    <div>
      {/* Day pills */}
      <div
        ref={pillsRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        role="tablist"
        aria-label="Available days"
      >
        {availability.days.map((day, index) => (
          <button
            key={day.date}
            role="tab"
            aria-selected={selectedDay === index}
            tabIndex={selectedDay === index ? 0 : -1}
            onClick={() => handleDayChange(index)}
            onKeyDown={(e) => handlePillKeyDown(e, index)}
            className={cn(
              "flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors min-h-[44px]",
              selectedDay === index
                ? "bg-tt-primary text-white"
                : "bg-tt-surface border border-tt-border text-tt-text-primary hover:bg-tt-bg-subtle"
            )}
          >
            {day.dayLabel}
          </button>
        ))}
      </div>

      {/* Slot list */}
      <div className="mt-4">
        {currentDay && currentDay.slots.length > 0 ? (
          <div
            role="radiogroup"
            aria-label="Available time slots"
            className="space-y-3.5"
          >
            {currentDay.slots.map((slot) => (
              <button
                key={slot.start}
                role="radio"
                aria-checked={selectedSlot?.start === slot.start}
                onClick={() => handleSlotClick(slot)}
                className={cn(
                  "w-full rounded-lg px-4 py-3 text-center font-medium transition-colors min-h-[44px]",
                  selectedSlot?.start === slot.start
                    ? "bg-tt-primary-light border-2 border-tt-primary text-tt-primary"
                    : "bg-tt-surface border border-tt-border text-tt-text-primary hover:bg-tt-bg-subtle"
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  {selectedSlot?.start === slot.start && (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  {formatSlotTime(slot.start)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-tt-text-muted py-8">
            No available times on this day. Try another day.
          </p>
        )}
      </div>
    </div>
  )
}

export { type TimeSlotPickerProps }
