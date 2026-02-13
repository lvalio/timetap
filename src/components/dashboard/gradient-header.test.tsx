import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { GradientHeader } from "./gradient-header"

describe("GradientHeader", () => {
  it("renders the host name in greeting", () => {
    render(<GradientHeader name="Luca" />)
    expect(screen.getByText(/Luca/)).toBeInTheDocument()
  })

  it("renders stat pills with zero values", () => {
    render(<GradientHeader name="Luca" />)
    expect(screen.getAllByText("0")).toHaveLength(3)
    expect(screen.getByText("Sessions today")).toBeInTheDocument()
    expect(screen.getByText("Active clients")).toBeInTheDocument()
    expect(screen.getByText("New bookings")).toBeInTheDocument()
  })

  it("has role=status for screen readers", () => {
    render(<GradientHeader name="Luca" />)
    expect(screen.getByRole("status")).toBeInTheDocument()
  })
})
