import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { StripeConnectStep } from "./stripe-connect-step"

// Mock window.location
const mockLocationAssign = vi.fn()
Object.defineProperty(window, "location", {
  value: { href: "", assign: mockLocationAssign },
  writable: true,
})

describe("StripeConnectStep", () => {
  it("renders the Connect Stripe button", () => {
    render(<StripeConnectStep />)

    expect(screen.getByRole("button", { name: /connect stripe/i })).toBeInTheDocument()
  })

  it("shows explanation text", () => {
    render(<StripeConnectStep />)

    expect(
      screen.getByText(/payments go directly to your Stripe account/i)
    ).toBeInTheDocument()
  })

  it("redirects to /api/stripe/connect on click", () => {
    render(<StripeConnectStep />)

    fireEvent.click(screen.getByRole("button", { name: /connect stripe/i }))

    expect(window.location.href).toBe("/api/stripe/connect")
  })

  it("shows loading state after click", () => {
    render(<StripeConnectStep />)

    fireEvent.click(screen.getByRole("button", { name: /connect stripe/i }))

    expect(screen.getByRole("button", { name: /redirecting to stripe/i })).toBeDisabled()
  })

  it("shows error message when error prop is provided", () => {
    render(<StripeConnectStep error="stripe_connect_failed" />)

    expect(
      screen.getByText(/Stripe connection didn't go through/i)
    ).toBeInTheDocument()
  })

  it("does not show error when error prop is null", () => {
    render(<StripeConnectStep error={null} />)

    expect(
      screen.queryByText(/Stripe connection didn't go through/i)
    ).not.toBeInTheDocument()
  })
})
