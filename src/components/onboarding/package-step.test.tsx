import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PackageStep } from "./package-step"

const mockCreatePackage = vi.fn()

vi.mock("@/app/(host)/onboarding/actions", () => ({
  saveProfile: vi.fn(),
  checkSlugAvailability: vi.fn(),
  saveBookableHours: vi.fn(),
  createPackage: (...args: unknown[]) => mockCreatePackage(...args),
}))

describe("PackageStep", () => {
  const defaultProps = {
    onComplete: vi.fn(),
    hostId: "host-1",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Free Intro Call button", () => {
    render(<PackageStep {...defaultProps} />)

    expect(
      screen.getByRole("button", { name: /free intro call/i })
    ).toBeInTheDocument()
  })

  it("renders paid package form", () => {
    render(<PackageStep {...defaultProps} />)

    expect(screen.getByLabelText(/package name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sessions/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
  })

  it("creates free intro call on button click", async () => {
    mockCreatePackage.mockResolvedValue({
      success: true,
      data: {
        id: "pkg-1",
        name: "Free Intro Call",
        sessionCount: 1,
        priceInCents: 0,
        isFreeIntro: true,
      },
    })

    render(<PackageStep {...defaultProps} />)

    fireEvent.click(screen.getByRole("button", { name: /free intro call/i }))

    await waitFor(() => {
      expect(mockCreatePackage).toHaveBeenCalledWith({
        name: "Free Intro Call",
        sessionCount: 1,
        priceInCents: 0,
      })
    })

    await waitFor(() => {
      expect(screen.getByText("Free Intro Call created!")).toBeInTheDocument()
    })
  })

  it("shows package in list after creation", async () => {
    mockCreatePackage.mockResolvedValue({
      success: true,
      data: {
        id: "pkg-1",
        name: "Free Intro Call",
        sessionCount: 1,
        priceInCents: 0,
        isFreeIntro: true,
      },
    })

    render(<PackageStep {...defaultProps} />)

    fireEvent.click(screen.getByRole("button", { name: /free intro call/i }))

    await waitFor(() => {
      expect(screen.getByText("Your packages")).toBeInTheDocument()
      expect(screen.getByLabelText("Remove Free Intro Call")).toBeInTheDocument()
    })
  })

  it("Continue button disabled when no packages", () => {
    render(<PackageStep {...defaultProps} />)

    const continueBtn = screen.getByRole("button", { name: /continue/i })
    expect(continueBtn).toBeDisabled()
  })

  it("Continue button enabled when package exists", async () => {
    mockCreatePackage.mockResolvedValue({
      success: true,
      data: {
        id: "pkg-1",
        name: "Free Intro Call",
        sessionCount: 1,
        priceInCents: 0,
        isFreeIntro: true,
      },
    })

    render(<PackageStep {...defaultProps} />)

    fireEvent.click(screen.getByRole("button", { name: /free intro call/i }))

    await waitFor(() => {
      const continueBtn = screen.getByRole("button", { name: /^continue$/i })
      expect(continueBtn).not.toBeDisabled()
    })
  })

  it("calls onComplete when Continue is clicked", async () => {
    mockCreatePackage.mockResolvedValue({
      success: true,
      data: {
        id: "pkg-1",
        name: "Free Intro Call",
        sessionCount: 1,
        priceInCents: 0,
        isFreeIntro: true,
      },
    })

    render(<PackageStep {...defaultProps} />)

    fireEvent.click(screen.getByRole("button", { name: /free intro call/i }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^continue$/i })
      ).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }))

    expect(defaultProps.onComplete).toHaveBeenCalled()
  })

  it("shows error on failed package creation", async () => {
    mockCreatePackage.mockResolvedValue({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    })

    render(<PackageStep {...defaultProps} />)

    fireEvent.click(screen.getByRole("button", { name: /free intro call/i }))

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    })
  })
})
