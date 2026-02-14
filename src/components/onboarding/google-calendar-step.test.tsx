import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { GoogleCalendarStep } from "./google-calendar-step"

// Mock window.location
Object.defineProperty(window, "location", {
  value: { href: "" },
  writable: true,
})

// Mock server action
vi.mock("@/app/(host)/onboarding/actions", () => ({
  saveBookableHours: vi.fn(),
}))

describe("GoogleCalendarStep", () => {
  const defaultProps = {
    calendarConnected: false,
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ""
  })

  it("renders connect button when not connected", () => {
    render(<GoogleCalendarStep {...defaultProps} />)

    expect(
      screen.getByRole("button", { name: /connect calendar/i })
    ).toBeInTheDocument()
  })

  it("shows explanation text", () => {
    render(<GoogleCalendarStep {...defaultProps} />)

    expect(
      screen.getByText(/check your Google Calendar to avoid double bookings/i)
    ).toBeInTheDocument()
  })

  it("redirects to /api/google/connect on click", () => {
    render(<GoogleCalendarStep {...defaultProps} />)

    fireEvent.click(
      screen.getByRole("button", { name: /connect calendar/i })
    )

    expect(window.location.href).toBe("/api/google/connect")
  })

  it("shows loading state after clicking connect", () => {
    render(<GoogleCalendarStep {...defaultProps} />)

    fireEvent.click(
      screen.getByRole("button", { name: /connect calendar/i })
    )

    expect(
      screen.getByRole("button", { name: /redirecting to google/i })
    ).toBeDisabled()
  })

  it("shows 'Calendar connected!' when calendarConnected is true", () => {
    render(
      <GoogleCalendarStep {...defaultProps} calendarConnected={true} />
    )

    expect(screen.getByText("Calendar connected!")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /connect calendar/i })
    ).not.toBeInTheDocument()
  })

  it("shows bookable hours grid when connected", () => {
    render(
      <GoogleCalendarStep {...defaultProps} calendarConnected={true} />
    )

    expect(
      screen.getByText("Set your bookable hours")
    ).toBeInTheDocument()
    expect(screen.getByRole("grid")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeInTheDocument()
  })

  it("does not show bookable hours when not connected", () => {
    render(<GoogleCalendarStep {...defaultProps} />)

    expect(
      screen.queryByText("Set your bookable hours")
    ).not.toBeInTheDocument()
  })

  it("shows error message when error prop is provided", () => {
    render(
      <GoogleCalendarStep
        {...defaultProps}
        error="google_connect_failed"
      />
    )

    expect(
      screen.getByText(
        /Google Calendar connection didn't go through/i
      )
    ).toBeInTheDocument()
  })

  it("does not show error when error prop is null", () => {
    render(<GoogleCalendarStep {...defaultProps} error={null} />)

    expect(
      screen.queryByText(
        /Google Calendar connection didn't go through/i
      )
    ).not.toBeInTheDocument()
  })
})
