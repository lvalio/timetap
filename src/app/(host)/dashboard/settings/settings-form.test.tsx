import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SettingsForm } from "./settings-form"

// Mock server actions
vi.mock("./actions", () => ({
  updateHostProfile: vi.fn(),
}))

// Mock the slug availability check
vi.mock("@/app/(host)/onboarding/actions", () => ({
  checkSlugAvailability: vi.fn(),
}))

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe("SettingsForm", () => {
  const defaultHost = {
    id: "host-1",
    name: "Sofia",
    description: "Life coach",
    slug: "sofia",
  }

  it("renders profile form with host data", () => {
    render(<SettingsForm host={defaultHost} />)

    expect(screen.getByDisplayValue("Sofia")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Life coach")).toBeInTheDocument()
    expect(screen.getByDisplayValue("sofia")).toBeInTheDocument()
  })

  it("renders save changes button", () => {
    render(<SettingsForm host={defaultHost} />)
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument()
  })
})
