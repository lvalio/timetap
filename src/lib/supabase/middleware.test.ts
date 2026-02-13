import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockGetUser = vi.fn()

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: { setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } }) => {
    // Simulate cookie syncing when setAll is called
    return {
      auth: {
        getUser: () => mockGetUser(),
      },
    }
  }),
}))

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"))
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
  })

  it("allows public routes through without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("allows public slug routes through without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/john-doe"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("redirects unauthenticated /dashboard/* to /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/dashboard"))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
  })

  it("redirects unauthenticated /dashboard/settings to /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/dashboard/settings"))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
  })

  it("redirects unauthenticated /workspace/* to /auth/magic-link", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/workspace/bookings"))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/magic-link")
  })

  it("allows authenticated users to access /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "host@example.com" } },
    })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/dashboard"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("allows authenticated users to access /workspace", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "customer@example.com" } },
    })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/workspace/bookings"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("redirects unauthenticated /onboarding to /auth/login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/onboarding"))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
  })

  it("allows /auth/* routes without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/auth/login"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("allows /api/* routes without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSession } = await import("./middleware")
    const response = await updateSession(createRequest("/api/webhooks/stripe"))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })
})
