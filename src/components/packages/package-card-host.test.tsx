import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PackageCardHost } from "./package-card-host"

describe("PackageCardHost", () => {
  it("renders package name", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="5 Coaching Sessions"
        sessionCount={5}
        priceInCents={40000}
        isActive={true}
      />
    )

    expect(screen.getByText("5 Coaching Sessions")).toBeInTheDocument()
  })

  it("shows 'Free' for free packages", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="Free Intro Call"
        sessionCount={1}
        priceInCents={0}
        isActive={true}
      />
    )

    expect(screen.getByText("Free")).toBeInTheDocument()
  })

  it("formats price as euros", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="Test"
        sessionCount={1}
        priceInCents={8000}
        isActive={true}
      />
    )

    expect(screen.getByText(/€80\.00/)).toBeInTheDocument()
  })

  it("shows Active badge for active packages", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="Test"
        sessionCount={1}
        priceInCents={0}
        isActive={true}
      />
    )

    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("shows Inactive badge for inactive packages", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="Test"
        sessionCount={1}
        priceInCents={0}
        isActive={false}
      />
    )

    expect(screen.getByText("Inactive")).toBeInTheDocument()
  })

  it("shows per-session price for multi-session packages", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="5 Sessions"
        sessionCount={5}
        priceInCents={40000}
        isActive={true}
      />
    )

    expect(screen.getByText(/€80\.00\/session/)).toBeInTheDocument()
  })

  it("does not show per-session price for single-session packages", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="Single Session"
        sessionCount={1}
        priceInCents={8000}
        isActive={true}
      />
    )

    expect(screen.queryByText(/\/session/)).not.toBeInTheDocument()
  })

  it("links to package edit page", () => {
    render(
      <PackageCardHost
        id="pkg-1"
        name="Test"
        sessionCount={1}
        priceInCents={0}
        isActive={true}
      />
    )

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/dashboard/packages/pkg-1")
  })
})
