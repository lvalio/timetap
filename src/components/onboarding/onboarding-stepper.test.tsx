import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { OnboardingStepper } from "./onboarding-stepper"

describe("OnboardingStepper", () => {
  it("renders 5 progress segments by default", () => {
    render(<OnboardingStepper currentStep={1} />)
    const segments = screen.getAllByRole("progressbar")
    expect(segments).toHaveLength(5)
  })

  it("displays correct step label", () => {
    render(<OnboardingStepper currentStep={3} />)
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument()
  })

  it("applies gradient to completed and current segments", () => {
    render(<OnboardingStepper currentStep={3} />)
    const segments = screen.getAllByRole("progressbar")

    // Steps 1 and 2 (completed) and step 3 (current) should have gradient
    expect(segments[0].className).toContain("bg-gradient-to-r")
    expect(segments[1].className).toContain("bg-gradient-to-r")
    expect(segments[2].className).toContain("bg-gradient-to-r")

    // Steps 4 and 5 (future) should have divider color
    expect(segments[3].className).toContain("bg-tt-divider")
    expect(segments[4].className).toContain("bg-tt-divider")
  })

  it("renders correct aria labels for each segment", () => {
    render(<OnboardingStepper currentStep={2} />)
    const segments = screen.getAllByRole("progressbar")
    expect(segments[0]).toHaveAttribute("aria-label", "Step 1 of 5")
    expect(segments[1]).toHaveAttribute("aria-label", "Step 2 of 5")
  })

  it("supports custom total steps", () => {
    render(<OnboardingStepper currentStep={1} totalSteps={3} />)
    const segments = screen.getAllByRole("progressbar")
    expect(segments).toHaveLength(3)
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
  })
})
