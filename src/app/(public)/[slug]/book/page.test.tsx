import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

const mockFindBySlugPublic = vi.fn()
const mockFindById = vi.fn()
const mockRedirect = vi.fn()

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error("NEXT_REDIRECT")
  },
}))

vi.mock("@/services/host.service", () => ({
  hostService: {
    findBySlugPublic: (...args: unknown[]) => mockFindBySlugPublic(...args),
  },
}))

vi.mock("@/services/package.service", () => ({
  packageService: {
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}))

vi.mock("./booking-flow-client", () => ({
  BookingFlowClient: ({
    hostName,
    packageName,
  }: {
    hostName: string
    packageName: string
  }) => (
    <div data-testid="booking-flow">
      {hostName} - {packageName}
    </div>
  ),
}))

import BookingPage from "./page"

const mockHost = {
  id: "host-1",
  name: "Jane Coach",
  slug: "jane-coach",
  description: "Life coaching",
  avatarUrl: null,
}

const mockPackage = {
  id: "pkg-free",
  name: "Free Intro Call",
  sessionCount: 1,
  priceInCents: 0,
  isFreeIntro: true,
  isActive: true,
  hostId: "host-1",
}

function makeParams(slug: string) {
  return Promise.resolve({ slug })
}

function makeSearchParams(params: Record<string, string>) {
  return Promise.resolve(params)
}

describe("BookingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects when no package param provided", async () => {
    await expect(
      BookingPage({
        params: makeParams("jane-coach"),
        searchParams: makeSearchParams({}),
      })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/jane-coach")
  })

  it("redirects when host slug is invalid", async () => {
    mockFindBySlugPublic.mockResolvedValue(null)

    await expect(
      BookingPage({
        params: makeParams("nonexistent"),
        searchParams: makeSearchParams({ package: "pkg-free" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/nonexistent")
  })

  it("redirects when package is not found", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindById.mockResolvedValue(null)

    await expect(
      BookingPage({
        params: makeParams("jane-coach"),
        searchParams: makeSearchParams({ package: "invalid-pkg" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/jane-coach")
  })

  it("redirects when package is not free intro", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindById.mockResolvedValue({ ...mockPackage, isFreeIntro: false })

    await expect(
      BookingPage({
        params: makeParams("jane-coach"),
        searchParams: makeSearchParams({ package: "pkg-paid" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/jane-coach")
  })

  it("redirects when package is inactive", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindById.mockResolvedValue({ ...mockPackage, isActive: false })

    await expect(
      BookingPage({
        params: makeParams("jane-coach"),
        searchParams: makeSearchParams({ package: "pkg-free" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/jane-coach")
  })

  it("renders booking flow for valid free intro package", async () => {
    mockFindBySlugPublic.mockResolvedValue(mockHost)
    mockFindById.mockResolvedValue(mockPackage)

    const jsx = await BookingPage({
      params: makeParams("jane-coach"),
      searchParams: makeSearchParams({ package: "pkg-free" }),
    })
    render(jsx)

    expect(screen.getByTestId("booking-flow")).toBeInTheDocument()
    expect(
      screen.getByText("Jane Coach - Free Intro Call")
    ).toBeInTheDocument()
  })
})
