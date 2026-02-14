import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { WeeklyHoursGrid } from "./weekly-hours-grid"

describe("WeeklyHoursGrid", () => {
  it("renders 7 day columns", () => {
    render(<WeeklyHoursGrid />)

    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it("renders 12 time rows (8am to 7pm)", () => {
    render(<WeeklyHoursGrid />)

    expect(screen.getByText("8am")).toBeInTheDocument()
    expect(screen.getByText("12pm")).toBeInTheDocument()
    expect(screen.getByText("7pm")).toBeInTheDocument()
  })

  it("renders 84 grid cells (7 days x 12 hours)", () => {
    render(<WeeklyHoursGrid />)

    const cells = screen.getAllByRole("gridcell")
    expect(cells).toHaveLength(84)
  })

  it("pre-selects Mon-Fri 9-17 by default", () => {
    render(<WeeklyHoursGrid />)

    // Mon 9am should be selected (row 1, col 0 → "Mon 9am")
    const mon9am = screen.getByLabelText("Mon 9am")
    expect(mon9am).toHaveAttribute("aria-pressed", "true")

    // Sat 10am should NOT be selected
    const sat10am = screen.getByLabelText("Sat 10am")
    expect(sat10am).toHaveAttribute("aria-pressed", "false")

    // Mon 8am (outside default) should NOT be selected
    const mon8am = screen.getByLabelText("Mon 8am")
    expect(mon8am).toHaveAttribute("aria-pressed", "false")
  })

  it("toggles a cell on click and calls onChange", () => {
    const onChange = vi.fn()
    render(<WeeklyHoursGrid onChange={onChange} />)

    // Sat 10am is unselected by default, click to toggle ON
    const sat10am = screen.getByLabelText("Sat 10am")
    expect(sat10am).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(sat10am)

    expect(sat10am).toHaveAttribute("aria-pressed", "true")
    expect(onChange).toHaveBeenCalledTimes(1)

    // Verify the onChange data includes saturday
    const result = onChange.mock.calls[0][0]
    expect(result.saturday).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ start: "10:00", end: "11:00" }),
      ])
    )
  })

  it("toggles a selected cell OFF on click", () => {
    const onChange = vi.fn()
    render(<WeeklyHoursGrid onChange={onChange} />)

    // Mon 9am is selected by default, click to toggle OFF
    const mon9am = screen.getByLabelText("Mon 9am")
    expect(mon9am).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(mon9am)

    expect(mon9am).toHaveAttribute("aria-pressed", "false")
    expect(onChange).toHaveBeenCalled()
  })

  it("supports keyboard navigation with arrow keys", () => {
    render(<WeeklyHoursGrid />)

    const mon8am = screen.getByLabelText("Mon 8am")
    mon8am.focus()

    // ArrowRight moves to Tue 8am
    fireEvent.keyDown(mon8am, { key: "ArrowRight" })
    expect(document.activeElement).toBe(screen.getByLabelText("Tue 8am"))

    // ArrowDown moves to Tue 9am
    fireEvent.keyDown(screen.getByLabelText("Tue 8am"), { key: "ArrowDown" })
    expect(document.activeElement).toBe(screen.getByLabelText("Tue 9am"))
  })

  it("toggles cell with Space key", () => {
    const onChange = vi.fn()
    render(<WeeklyHoursGrid onChange={onChange} />)

    const sat8am = screen.getByLabelText("Sat 8am")
    expect(sat8am).toHaveAttribute("aria-pressed", "false")

    fireEvent.keyDown(sat8am, { key: " " })

    expect(sat8am).toHaveAttribute("aria-pressed", "true")
    expect(onChange).toHaveBeenCalled()
  })

  it("toggles cell with Enter key", () => {
    const onChange = vi.fn()
    render(<WeeklyHoursGrid onChange={onChange} />)

    const sat8am = screen.getByLabelText("Sat 8am")
    fireEvent.keyDown(sat8am, { key: "Enter" })

    expect(sat8am).toHaveAttribute("aria-pressed", "true")
  })

  it("uses role=grid for accessibility", () => {
    render(<WeeklyHoursGrid />)

    expect(screen.getByRole("grid")).toBeInTheDocument()
  })
})
