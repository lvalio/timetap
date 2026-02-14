import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react"
import { SlugInput } from "./slug-input"

// Mock the server action
vi.mock("@/app/(host)/onboarding/actions", () => ({
  checkSlugAvailability: vi.fn(),
}))

import { checkSlugAvailability } from "@/app/(host)/onboarding/actions"
const mockCheck = vi.mocked(checkSlugAvailability)

describe("SlugInput", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders prefix and input", () => {
    render(<SlugInput {...defaultProps} />)
    expect(screen.getByText("timetap.it/")).toBeInTheDocument()
    expect(screen.getByLabelText("Public URL slug")).toBeInTheDocument()
  })

  it("renders the current value", () => {
    render(<SlugInput {...defaultProps} value="my-slug" />)
    expect(screen.getByLabelText("Public URL slug")).toHaveValue("my-slug")
  })

  it("calls onChange with lowercased value", () => {
    const onChange = vi.fn()
    render(<SlugInput {...defaultProps} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText("Public URL slug"), {
      target: { value: "A" },
    })
    expect(onChange).toHaveBeenCalledWith("a")
  })

  it("shows available status after debounce", async () => {
    mockCheck.mockResolvedValue({
      success: true,
      data: { available: true },
    })

    render(<SlugInput {...defaultProps} value="my-slug" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    await waitFor(() => {
      expect(screen.getByText("Available!")).toBeInTheDocument()
    })
  })

  it("shows taken status with suggestion after debounce", async () => {
    mockCheck.mockResolvedValue({
      success: true,
      data: { available: false, suggestion: "my-slug-42" },
    })

    render(<SlugInput {...defaultProps} value="my-slug" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    await waitFor(() => {
      expect(screen.getByText("my-slug-42")).toBeInTheDocument()
    })
  })

  it("shows error message when provided", () => {
    render(<SlugInput {...defaultProps} error="Slug is required" />)
    expect(screen.getByText("Slug is required")).toBeInTheDocument()
  })

  it("does not check availability for slugs shorter than 3 chars", async () => {
    render(<SlugInput {...defaultProps} value="ab" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    expect(mockCheck).not.toHaveBeenCalled()
  })
})
