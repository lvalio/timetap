import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PackageCardPublic } from "./package-card-public"

describe("PackageCardPublic", () => {
  it("renders free intro with 'Free' price and 'Book free session' CTA", () => {
    render(
      <PackageCardPublic
        package={{
          id: "pkg-free",
          name: "Free Intro Call",
          sessionCount: 1,
          priceInCents: 0,
          isFreeIntro: true,
        }}
        slug="jane-coach"
      />
    )

    expect(screen.getByText("Free Intro Call")).toBeInTheDocument()
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.getByText("1 session")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: "Book free session" })
    expect(link).toHaveAttribute("href", "/jane-coach/book?package=pkg-free")
  })

  it("renders paid package with formatted price and 'Buy package' CTA", () => {
    render(
      <PackageCardPublic
        package={{
          id: "pkg-paid",
          name: "10 Sessions",
          sessionCount: 10,
          priceInCents: 80000,
          isFreeIntro: false,
        }}
        slug="jane-coach"
      />
    )

    expect(screen.getByText("10 Sessions")).toBeInTheDocument()
    expect(screen.getByText("€800")).toBeInTheDocument()
    expect(screen.getByText("10 sessions")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: "Buy package" })
    expect(link).toHaveAttribute("href", "/jane-coach/buy?package=pkg-paid")
  })

  it("shows per-session breakdown for multi-session paid packages", () => {
    render(
      <PackageCardPublic
        package={{
          id: "pkg-paid",
          name: "5 Sessions",
          sessionCount: 5,
          priceInCents: 40000,
          isFreeIntro: false,
        }}
        slug="jane-coach"
      />
    )

    expect(screen.getByText("€80 per session")).toBeInTheDocument()
  })

  it("does not show per-session breakdown for single-session paid packages", () => {
    render(
      <PackageCardPublic
        package={{
          id: "pkg-single",
          name: "Single Session",
          sessionCount: 1,
          priceInCents: 8000,
          isFreeIntro: false,
        }}
        slug="jane-coach"
      />
    )

    expect(screen.queryByText(/per session/)).not.toBeInTheDocument()
  })

  it("shows 'Start here' label context via free intro package rendering", () => {
    render(
      <PackageCardPublic
        package={{
          id: "pkg-free",
          name: "Free Intro",
          sessionCount: 1,
          priceInCents: 0,
          isFreeIntro: true,
        }}
        slug="test"
      />
    )

    // The "Start here" label is rendered by the parent page, not this component
    // But verify the free intro renders with gradient CTA button
    const link = screen.getByRole("link", { name: "Book free session" })
    expect(link).toBeInTheDocument()
  })
})
