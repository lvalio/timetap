import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import LoginPage from "./page"

// Mock the auth actions
const mockSignInWithGoogle = vi.fn()
vi.mock("../actions", () => ({
  signInWithGoogle: () => mockSignInWithGoogle(),
}))

// Mock useSearchParams
const mockGet = vi.fn()
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
}))

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  it("renders the Continue with Google button", () => {
    render(<LoginPage />)
    const buttons = screen.getAllByRole("button", { name: /continue with google/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders the TimeTap brand", () => {
    render(<LoginPage />)
    const headings = screen.getAllByText(/timetap/i)
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it("does not show error message by default", () => {
    render(<LoginPage />)
    expect(
      screen.queryByText(/something went wrong/i)
    ).not.toBeInTheDocument()
  })

  it("shows error message when ?error=auth_failed is in URL", () => {
    mockGet.mockImplementation((key: string) =>
      key === "error" ? "auth_failed" : null
    )
    render(<LoginPage />)
    const errorMessages = screen.getAllByText(/something went wrong with google/i)
    expect(errorMessages.length).toBeGreaterThanOrEqual(1)
  })

  it("calls signInWithGoogle and redirects on button click", async () => {
    const mockUrl = "https://accounts.google.com/o/oauth2/auth?test"
    mockSignInWithGoogle.mockResolvedValue({
      success: true,
      data: { url: mockUrl },
    })

    const originalLocation = window.location
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    })

    render(<LoginPage />)
    const buttons = screen.getAllByRole("button", { name: /continue with google/i })
    fireEvent.click(buttons[0])

    await vi.waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledOnce()
    })

    await vi.waitFor(() => {
      expect(window.location.href).toBe(mockUrl)
    })

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    })
  })
})
