import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockToastSuccess = vi.fn()
vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args) },
}))

import { OnboardingComplete } from "./onboarding-complete"

describe("OnboardingComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "You\'re live!" heading', () => {
    render(<OnboardingComplete slug="test-host" />)

    expect(
      screen.getByRole("heading", { name: "You're live!" })
    ).toBeInTheDocument()
  })

  it("shows public link with slug", () => {
    render(<OnboardingComplete slug="test-host" />)

    expect(screen.getByText("timetap.it/test-host")).toBeInTheDocument()
  })

  it("copy button copies URL to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    render(<OnboardingComplete slug="test-host" />)

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "https://timetap.it/test-host"
      )
      expect(mockToastSuccess).toHaveBeenCalledWith("Link copied")
    })
  })

  it('"Go to dashboard" navigates to /dashboard', async () => {
    const user = userEvent.setup()
    render(<OnboardingComplete slug="test-host" />)

    await user.click(
      screen.getByRole("button", { name: "Go to dashboard" })
    )

    expect(mockPush).toHaveBeenCalledWith("/dashboard")
  })
})
