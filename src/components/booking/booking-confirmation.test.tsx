import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BookingConfirmation } from "./booking-confirmation"

describe("BookingConfirmation", () => {
  const defaultProps = {
    hostName: "Jane Coach",
    startTime: "2026-02-17T09:00:00.000Z",
    endTime: "2026-02-17T10:00:00.000Z",
    hostTimezone: "Europe/Rome",
    slug: "jane-coach",
  }

  it("renders 'Session booked!' heading", () => {
    render(<BookingConfirmation {...defaultProps} />)
    expect(screen.getByText("Session booked!")).toBeInTheDocument()
  })

  it("displays formatted date/time in host timezone", () => {
    render(<BookingConfirmation {...defaultProps} />)
    // Europe/Rome is UTC+1, so 09:00 UTC = 10:00 CET
    expect(screen.getByText(/Tuesday, February 17, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
  })

  it("shows host name", () => {
    render(<BookingConfirmation {...defaultProps} />)
    expect(screen.getByText("with Jane Coach")).toBeInTheDocument()
  })

  it("shows 'We sent a confirmation to your email' message", () => {
    render(<BookingConfirmation {...defaultProps} />)
    expect(
      screen.getByText("We sent a confirmation to your email")
    ).toBeInTheDocument()
  })

  it("shows meet link placeholder", () => {
    render(<BookingConfirmation {...defaultProps} />)
    expect(
      screen.getByText("Meet link will be sent via email")
    ).toBeInTheDocument()
  })

  it("shows back link to host page", () => {
    render(<BookingConfirmation {...defaultProps} />)
    const backLink = screen.getByRole("link", { name: "Back to Jane Coach" })
    expect(backLink).toHaveAttribute("href", "/jane-coach")
  })
})
