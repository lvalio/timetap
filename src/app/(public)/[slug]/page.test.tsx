import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

const mockFindBySlugPublic = vi.fn()
const mockFindActiveByHostId = vi.fn()
const mockNotFound = vi.fn()

vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound()
    throw new Error("NEXT_NOT_FOUND")
  },
}))

vi.mock("@/services/host.service", () => ({
  hostService: {
    findBySlugPublic: (...args: unknown[]) => mockFindBySlugPublic(...args),
  },
}))

vi.mock("@/services/package.service", () => ({
  packageService: {
    findActiveByHostId: (...args: unknown[]) =>
      mockFindActiveByHostId(...args),
  },
}))

import PublicHostPage, { generateMetadata } from "./page"

const mockHost = {
  id: "host-1",
  name: "Jane Coach",
  slug: "jane-coach",
  description: "Life coaching sessions",
  avatarUrl: "https://example.com/avatar.jpg",
}

const mockFreePackage = {
  id: "pkg-free",
  name: "Free Intro Call",
  sessionCount: 1,
  priceInCents: 0,
  isFreeIntro: true,
}

const mockPaidPackage = {
  id: "pkg-paid",
  name: "10 Sessions",
  sessionCount: 10,
  priceInCents: 80000,
  isFreeIntro: false,
}

function makeParams(slug: string) {
  return Promise.resolve({ slug })
}

describe("PublicHostPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders host name and description in hero", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindActiveByHostId.mockResolvedValue([mockFreePackage, mockPaidPackage])

    const jsx = await PublicHostPage({ params: makeParams("jane-coach") })
    render(jsx)

    expect(screen.getByText("Jane Coach")).toBeInTheDocument()
    expect(screen.getByText("Life coaching sessions")).toBeInTheDocument()
  })

  it("renders free intro package with 'Start here' label and 'Book free session' CTA", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindActiveByHostId.mockResolvedValue([mockFreePackage, mockPaidPackage])

    const jsx = await PublicHostPage({ params: makeParams("jane-coach") })
    render(jsx)

    expect(screen.getByText("Start here")).toBeInTheDocument()
    expect(screen.getByText("Free Intro Call")).toBeInTheDocument()
    const bookLink = screen.getByRole("link", { name: "Book free session" })
    expect(bookLink).toHaveAttribute(
      "href",
      "/jane-coach/book?package=pkg-free"
    )
  })

  it("renders paid packages with price and 'Buy package' CTA", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindActiveByHostId.mockResolvedValue([mockFreePackage, mockPaidPackage])

    const jsx = await PublicHostPage({ params: makeParams("jane-coach") })
    render(jsx)

    expect(screen.getByText("10 Sessions")).toBeInTheDocument()
    expect(screen.getByText("€800")).toBeInTheDocument()
    const buyLink = screen.getByRole("link", { name: "Buy package" })
    expect(buyLink).toHaveAttribute(
      "href",
      "/jane-coach/buy?package=pkg-paid"
    )
  })

  it("calls notFound() when slug doesn't exist", async () => {
    mockFindBySlugPublic.mockResolvedValue(null)

    await expect(
      PublicHostPage({ params: makeParams("nonexistent") })
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockNotFound).toHaveBeenCalled()
  })

  it("calls notFound() when host is not onboarded", async () => {
    mockFindBySlugPublic.mockResolvedValue(null)

    await expect(
      PublicHostPage({ params: makeParams("not-onboarded") })
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockNotFound).toHaveBeenCalled()
  })

  it("shows 'No packages available yet' when host has no active packages", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindActiveByHostId.mockResolvedValue([])

    const jsx = await PublicHostPage({ params: makeParams("jane-coach") })
    render(jsx)

    expect(screen.getByText("No packages available yet")).toBeInTheDocument()
  })

  it("renders 'Already a client?' link", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindActiveByHostId.mockResolvedValue([])

    const jsx = await PublicHostPage({ params: makeParams("jane-coach") })
    render(jsx)

    const link = screen.getByRole("link", { name: "Access your workspace" })
    expect(link).toHaveAttribute("href", "/auth/magic-link?host=jane-coach")
  })

  it("renders 'Powered by TimeTap' footer", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindActiveByHostId.mockResolvedValue([])

    const jsx = await PublicHostPage({ params: makeParams("jane-coach") })
    render(jsx)

    expect(screen.getByText("Powered by TimeTap")).toBeInTheDocument()
    const privacyLink = screen.getByRole("link", { name: "Privacy policy" })
    expect(privacyLink).toHaveAttribute("href", "/privacy")
  })
})

describe("generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generates correct metadata for existing host", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)

    const metadata = await generateMetadata({
      params: makeParams("jane-coach"),
    })

    expect(metadata.title).toBe("Jane Coach | TimeTap")
    expect(metadata.description).toBe("Life coaching sessions")
  })

  it("generates not-found metadata when host doesn't exist", async () => {
    mockFindBySlugPublic.mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: makeParams("nonexistent"),
    })

    expect(metadata.title).toBe("Not Found | TimeTap")
  })

  it("uses default description when host has no description", async () => {
    mockFindBySlugPublic.mockResolvedValue({ ...mockHost, description: null })

    const metadata = await generateMetadata({
      params: makeParams("jane-coach"),
    })

    expect(metadata.description).toBe(
      "Book sessions with Jane Coach on TimeTap"
    )
  })
})
