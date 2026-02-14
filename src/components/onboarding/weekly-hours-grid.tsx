"use client"

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import type { BookableHoursInput } from "@/lib/validations/host"

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8) // 8am to 7pm (block 8 = 8:00-9:00)

function formatHour(hour: number): string {
  if (hour === 0 || hour === 12) return `12${hour === 0 ? "am" : "pm"}`
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
}

function hoursToGrid(hours: BookableHoursInput): boolean[][] {
  // grid[row(hour-8)][col(day)]
  const grid = Array.from({ length: 12 }, () => Array(7).fill(false) as boolean[])

  DAYS.forEach((day, col) => {
    const ranges = hours[day]
    for (const range of ranges) {
      const startHour = parseInt(range.start.split(":")[0], 10)
      const endHour = parseInt(range.end.split(":")[0], 10)
      for (let h = startHour; h < endHour; h++) {
        const row = h - 8
        if (row >= 0 && row < 12) {
          grid[row][col] = true
        }
      }
    }
  })

  return grid
}

function gridToHours(grid: boolean[][]): BookableHoursInput {
  const result: BookableHoursInput = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  }

  DAYS.forEach((day, col) => {
    const ranges: { start: string; end: string }[] = []
    let rangeStart: number | null = null

    for (let row = 0; row < 12; row++) {
      if (grid[row][col] && rangeStart === null) {
        rangeStart = row + 8
      } else if (!grid[row][col] && rangeStart !== null) {
        ranges.push({
          start: `${String(rangeStart).padStart(2, "0")}:00`,
          end: `${String(row + 8).padStart(2, "0")}:00`,
        })
        rangeStart = null
      }
    }

    // Close any open range at end of day
    if (rangeStart !== null) {
      ranges.push({
        start: `${String(rangeStart).padStart(2, "0")}:00`,
        end: "20:00",
      })
    }

    result[day] = ranges
  })

  return result
}

const DEFAULT_HOURS: BookableHoursInput = {
  monday: [{ start: "09:00", end: "17:00" }],
  tuesday: [{ start: "09:00", end: "17:00" }],
  wednesday: [{ start: "09:00", end: "17:00" }],
  thursday: [{ start: "09:00", end: "17:00" }],
  friday: [{ start: "09:00", end: "17:00" }],
  saturday: [],
  sunday: [],
}

interface WeeklyHoursGridProps {
  defaultValue?: BookableHoursInput
  onChange?: (hours: BookableHoursInput) => void
}

export function WeeklyHoursGrid({
  defaultValue,
  onChange,
}: WeeklyHoursGridProps) {
  const [grid, setGrid] = useState(() =>
    hoursToGrid(defaultValue ?? DEFAULT_HOURS)
  )
  const [focusRow, setFocusRow] = useState(0)
  const [focusCol, setFocusCol] = useState(0)
  const cellRefs = useRef<(HTMLButtonElement | null)[][]>(
    Array.from({ length: 12 }, () => Array(7).fill(null))
  )

  const toggle = useCallback(
    (row: number, col: number) => {
      setGrid((prev) => {
        const next = prev.map((r) => [...r])
        next[row][col] = !next[row][col]
        return next
      })
    },
    []
  )

  // Notify parent of grid changes outside the render phase
  const gridRef = useRef(grid)
  gridRef.current = grid
  const prevGridRef = useRef(grid)

  useEffect(() => {
    if (prevGridRef.current !== grid) {
      prevGridRef.current = grid
      onChange?.(gridToHours(grid))
    }
  }, [grid, onChange])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, row: number, col: number) => {
      let nextRow = row
      let nextCol = col

      switch (e.key) {
        case "ArrowUp":
          nextRow = Math.max(0, row - 1)
          break
        case "ArrowDown":
          nextRow = Math.min(11, row + 1)
          break
        case "ArrowLeft":
          nextCol = Math.max(0, col - 1)
          break
        case "ArrowRight":
          nextCol = Math.min(6, col + 1)
          break
        case " ":
        case "Enter":
          e.preventDefault()
          toggle(row, col)
          return
        default:
          return
      }

      e.preventDefault()
      setFocusRow(nextRow)
      setFocusCol(nextCol)
      cellRefs.current[nextRow]?.[nextCol]?.focus()
    },
    [toggle]
  )

  return (
    <div className="overflow-x-auto">
      <div role="grid" aria-label="Weekly bookable hours" className="min-w-[400px]">
        {/* Day headers */}
        <div role="row" className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              role="columnheader"
              className="text-center text-xs font-medium text-tt-text-muted py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Hour rows */}
        {HOURS.map((hour, row) => (
          <div
            key={hour}
            role="row"
            className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1"
          >
            <div className="text-xs text-tt-text-muted flex items-center justify-end pr-2">
              {formatHour(hour)}
            </div>
            {DAYS.map((_, col) => {
              const selected = grid[row][col]
              const isFocused = row === focusRow && col === focusCol
              return (
                <button
                  key={`${row}-${col}`}
                  ref={(el) => {
                    cellRefs.current[row][col] = el
                  }}
                  role="gridcell"
                  aria-pressed={selected}
                  aria-label={`${DAY_LABELS[col]} ${formatHour(hour)}`}
                  tabIndex={isFocused ? 0 : -1}
                  onClick={() => toggle(row, col)}
                  onKeyDown={(e) => handleKeyDown(e, row, col)}
                  className={cn(
                    "h-8 rounded border-2 transition-colors cursor-pointer",
                    selected
                      ? "bg-tt-primary-light border-tt-primary"
                      : "bg-tt-surface border-tt-divider",
                    "focus:outline-none focus:ring-2 focus:ring-tt-primary focus:ring-offset-1"
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export { DEFAULT_HOURS, gridToHours }
