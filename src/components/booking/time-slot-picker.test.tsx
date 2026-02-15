import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TimeSlotPicker } from "./time-slot-picker"
import type { AvailabilityResult } from "@/types/availability"

const mockAvailability: AvailabilityResult = {
  hostTimezone: "Europe/Rome",
  gcalDegraded: false,
  days: [
    {
      date: "2026-02-16",
      dayLabel: "Mon 16",
      slots: [],
    },
    {
      date: "2026-02-17",
      dayLabel: "Tue 17",
      slots: [
        { start: "2026-02-17T09:00:00", end: "2026-02-17T10:00:00" },
        { start: "2026-02-17T10:00:00", end: "2026-02-17T11:00:00" },
        { start: "2026-02-17T14:00:00", end: "2026-02-17T15:00:00" },
      ],
    },
    {
      date: "2026-02-18",
      dayLabel: "Wed 18",
      slots: [
        { start: "2026-02-18T11:00:00", end: "2026-02-18T12:00:00" },
      ],
    },
  ],
}

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe("TimeSlotPicker", () => {
  const onSlotSelected = vi.fn()
  const onSlotDeselected = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockAvailability),
    })
  })

  it("renders day pills from availability data", async () => {
    render(
      <TimeSlotPicker
        slug="test-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Mon 16")).toBeInTheDocument()
      expect(screen.getByText("Tue 17")).toBeInTheDocument()
      expect(screen.getByText("Wed 18")).toBeInTheDocument()
    })
  })

  it("auto-selects first day with available slots", async () => {
    render(
      <TimeSlotPicker
        slug="test-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    await waitFor(() => {
      const tuePill = screen.getByText("Tue 17")
      expect(tuePill).toHaveAttribute("aria-selected", "true")
    })
  })

  it("shows slot list for selected day", async () => {
    render(
      <TimeSlotPicker
        slug="test-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument()
      expect(screen.getByText("10:00")).toBeInTheDocument()
      expect(screen.getByText("14:00")).toBeInTheDocument()
    })
  })

  it("shows selected state on slot click and calls onSlotSelected", async () => {
    const user = userEvent.setup()

    render(
      <TimeSlotPicker
        slug="test-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument()
    })

    await user.click(screen.getByText("09:00"))

    expect(onSlotSelected).toHaveBeenCalledWith(
      { start: "2026-02-17T09:00:00", end: "2026-02-17T10:00:00" },
      "Tue 17"
    )

    const slotButton = screen.getByRole("radio", { name: /09:00/ })
    expect(slotButton).toHaveAttribute("aria-checked", "true")
  })

  it("shows 'No available times' message for empty day", async () => {
    const user = userEvent.setup()

    render(
      <TimeSlotPicker
        slug="test-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Mon 16")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Mon 16"))

    expect(
      screen.getByText("No available times on this day. Try another day.")
    ).toBeInTheDocument()
  })

  it("shows skeleton loading state initially", () => {
    render(
      <TimeSlotPicker
        slug="test-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    expect(screen.getByTestId("slot-picker-skeleton")).toBeInTheDocument()
  })

  it("fetches availability from correct URL", async () => {
    render(
      <TimeSlotPicker
        slug="my-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/my-host/availability")
    })
  })

  it("deselects slot when clicking selected slot again", async () => {
    const user = userEvent.setup()

    render(
      <TimeSlotPicker
        slug="test-host"
        onSlotSelected={onSlotSelected}
        onSlotDeselected={onSlotDeselected}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument()
    })

    await user.click(screen.getByText("09:00"))
    await user.click(screen.getByText("09:00"))

    expect(onSlotDeselected).toHaveBeenCalled()
  })
})
