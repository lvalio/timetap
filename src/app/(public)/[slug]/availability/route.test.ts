import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"
import { NextRequest } from "next/server"

vi.mock("@/services/host.service", () => ({
  hostService: {
    findBySlugPublic: vi.fn(),
  },
}))

vi.mock("@/services/availability.service", () => ({
  availabilityService: {
    getAvailableSlots: vi.fn(),
  },
}))

import { hostService } from "@/services/host.service"
import { availabilityService } from "@/services/availability.service"

const mockFindBySlug = hostService.findBySlugPublic as ReturnType<typeof vi.fn>
const mockGetSlots = availabilityService.getAvailableSlots as ReturnType<typeof vi.fn>

function createRequest(slug: string, searchParams?: Record<string, string>) {
  const url = new URL(`http://localhost:3000/${slug}/availability`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value)
    }
  }
  return new NextRequest(url)
}

const MOCK_AVAILABILITY = {
  hostTimezone: "Europe/Rome",
  days: [
    {
      date: "2026-03-02",
      dayLabel: "Mon 2",
      slots: [
        { start: "2026-03-02T09:00:00", end: "2026-03-02T10:00:00" },
      ],
    },
  ],
  gcalDegraded: false,
}

describe("GET /[slug]/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns availability JSON for valid host", async () => {
    mockFindBySlug.mockResolvedValue({
      id: "host-1",
      name: "Jane",
      slug: "jane-coach",
      description: null,
      avatarUrl: null,
    })
    mockGetSlots.mockResolvedValue(MOCK_AVAILABILITY)

    const request = createRequest("jane-coach")
    const response = await GET(request, {
      params: Promise.resolve({ slug: "jane-coach" }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.hostTimezone).toBe("Europe/Rome")
    expect(body.days).toHaveLength(1)
    expect(body.gcalDegraded).toBe(false)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it("returns 404 for unknown slug", async () => {
    mockFindBySlug.mockResolvedValue(null)

    const request = createRequest("nonexistent")
    const response = await GET(request, {
      params: Promise.resolve({ slug: "nonexistent" }),
    })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe("Host not found")
    expect(mockGetSlots).not.toHaveBeenCalled()
  })

  it("uses default date range when no params provided", async () => {
    mockFindBySlug.mockResolvedValue({ id: "host-1" })
    mockGetSlots.mockResolvedValue(MOCK_AVAILABILITY)

    const request = createRequest("jane-coach")
    await GET(request, {
      params: Promise.resolve({ slug: "jane-coach" }),
    })

    expect(mockGetSlots).toHaveBeenCalledWith("host-1", {
      from: expect.any(Date),
      to: expect.any(Date),
    })

    const call = mockGetSlots.mock.calls[0]
    const from = call[1].from as Date
    const to = call[1].to as Date
    // Default range: tomorrow to 14 days from tomorrow
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(13) // 14 days total (from + 13 = 14 day range)
  })

  it("uses provided date params", async () => {
    mockFindBySlug.mockResolvedValue({ id: "host-1" })
    mockGetSlots.mockResolvedValue(MOCK_AVAILABILITY)

    const request = createRequest("jane-coach", {
      from: "2026-03-02",
      to: "2026-03-09",
    })
    await GET(request, {
      params: Promise.resolve({ slug: "jane-coach" }),
    })

    expect(mockGetSlots).toHaveBeenCalledWith("host-1", {
      from: expect.any(Date),
      to: expect.any(Date),
    })
  })
})
