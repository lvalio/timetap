import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import OnboardingPage from "./page"

// Mock useSearchParams
const mockSearchParams = new URLSearchParams()
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}))

// Mock fetch for /api/host/me
const mockHostData = {
  id: "host-1",
  name: "Sofia",
  description: "Life coach",
  slug: "sofia",
  stripeAccountId: null,
  googleRefreshToken: null,
  bookableHours: null,
}

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockHostData),
  })
)

// Mock server actions
vi.mock("./actions", () => ({
  saveProfile: vi.fn(),
  checkSlugAvailability: vi.fn(),
  saveBookableHours: vi.fn(),
  createPackage: vi.fn(),
  activateTrial: vi.fn(),
}))

// Mock Stripe Elements
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({
    createPaymentMethod: vi.fn(),
  }),
  useElements: () => ({
    getElement: vi.fn(),
  }),
}))

vi.mock("@/lib/stripe/elements", () => ({
  getStripe: () => Promise.resolve({}),
}))

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset search params
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key)
    }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHostData),
    } as Response)
  })

  it("renders step 1 with stepper and title", async () => {
    render(<OnboardingPage />)

    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument()
    expect(screen.getByText("Set up your profile")).toBeInTheDocument()
  })

  it("loads host data and shows profile form", async () => {
    render(<OnboardingPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Sofia")).toBeInTheDocument()
    })
  })

  it("shows step description", () => {
    render(<OnboardingPage />)
    expect(
      screen.getByText(
        "Tell your clients who you are and choose your unique URL."
      )
    ).toBeInTheDocument()
  })

  it("shows step 2 with Stripe connect when step=2 in query", async () => {
    mockSearchParams.set("step", "2")
    render(<OnboardingPage />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Connect Stripe" })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /connect stripe/i })
      ).toBeInTheDocument()
    })
  })

  it("shows error message on step 2 when error=stripe_connect_failed", async () => {
    mockSearchParams.set("step", "2")
    mockSearchParams.set("error", "stripe_connect_failed")
    render(<OnboardingPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Stripe connection didn't go through/i)
      ).toBeInTheDocument()
    })
  })

  it("auto-advances to step 3 when stripe=connected and host has stripeAccountId", async () => {
    mockSearchParams.set("step", "2")
    mockSearchParams.set("stripe", "connected")

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockHostData, stripeAccountId: "acct_1ABC" }),
    } as Response)

    render(<OnboardingPage />)

    await waitFor(() => {
      expect(
        screen.getByText("Google Calendar & Bookable Hours")
      ).toBeInTheDocument()
    })
  })

  it("shows step 3 with Google Calendar connect when step=3 in query", async () => {
    mockSearchParams.set("step", "3")
    render(<OnboardingPage />)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Google Calendar & Bookable Hours" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /connect calendar/i })
      ).toBeInTheDocument()
    })
  })

  it("shows calendar connected and bookable hours when google=connected", async () => {
    mockSearchParams.set("step", "3")
    mockSearchParams.set("google", "connected")

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ...mockHostData,
          stripeAccountId: "acct_1ABC",
          googleRefreshToken: "refresh-token",
        }),
    } as Response)

    render(<OnboardingPage />)

    await waitFor(() => {
      expect(screen.getByText("Calendar connected!")).toBeInTheDocument()
      expect(screen.getByText("Set your bookable hours")).toBeInTheDocument()
    })
  })

  it("shows error on step 3 when error=google_connect_failed", async () => {
    mockSearchParams.set("step", "3")
    mockSearchParams.set("error", "google_connect_failed")
    render(<OnboardingPage />)

    await waitFor(() => {
      expect(
        screen.getByText(
          /Google Calendar connection didn't go through/i
        )
      ).toBeInTheDocument()
    })
  })

  it("shows step 3 description", async () => {
    mockSearchParams.set("step", "3")
    render(<OnboardingPage />)

    await waitFor(() => {
      expect(
        screen.getByText(
          "Connect your Google Calendar and set when you're available."
        )
      ).toBeInTheDocument()
    })
  })

  it("shows step 5 description text correctly", () => {
    render(<OnboardingPage />)

    // Step 5 description should have been updated from "Coming in Story 2.5"
    expect(
      screen.queryByText("Coming in Story 2.5")
    ).not.toBeInTheDocument()
  })
})
