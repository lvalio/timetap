import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import OnboardingPage from "./page"

// Mock fetch for /api/host/me
const mockHostData = {
  id: "host-1",
  name: "Sofia",
  description: "Life coach",
  slug: "sofia",
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
}))

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
