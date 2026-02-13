import { describe, it, expect, vi, beforeEach } from "vitest"

const mockExchangeCodeForSession = vi.fn()
const mockGetUser = vi.fn()
const mockFindByAuthId = vi.fn()
const mockCreateFromAuth = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("@/services/host.service", () => ({
  hostService: {
    findByAuthId: (...args: unknown[]) => mockFindByAuthId(...args),
    createFromAuth: (...args: unknown[]) => mockCreateFromAuth(...args),
  },
}))

import { GET } from "./route"

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeRequest(params: Record<string, string>) {
    const url = new URL("http://localhost:3000/auth/callback")
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    return new Request(url.toString())
  }

  it("redirects to login on error param", async () => {
    const response = await GET(makeRequest({ error: "access_denied" }))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
  })

  it("redirects to login when no code param", async () => {
    const response = await GET(makeRequest({}))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed")
  })

  it("redirects to login when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } })

    const response = await GET(makeRequest({ code: "valid-code" }))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed")
  })

  it("creates host record for new user and redirects to onboarding", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "uuid-123",
          email: "test@example.com",
          user_metadata: { full_name: "Test User" },
        },
      },
    })
    mockFindByAuthId.mockResolvedValue(null)
    mockCreateFromAuth.mockResolvedValue({
      id: "uuid-123",
      onboardingCompleted: false,
    })

    const response = await GET(makeRequest({ code: "valid-code" }))

    expect(mockFindByAuthId).toHaveBeenCalledWith("uuid-123")
    expect(mockCreateFromAuth).toHaveBeenCalledWith("uuid-123", "Test User", "test@example.com")
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/onboarding")
  })

  it("skips host creation for returning user and redirects to dashboard", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "uuid-456",
          email: "returning@example.com",
          user_metadata: { full_name: "Returning User" },
        },
      },
    })
    mockFindByAuthId.mockResolvedValue({
      id: "uuid-456",
      onboardingCompleted: true,
    })

    const response = await GET(makeRequest({ code: "valid-code" }))

    expect(mockFindByAuthId).toHaveBeenCalledWith("uuid-456")
    expect(mockCreateFromAuth).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard")
  })

  it("redirects to login when getUser returns no user", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(makeRequest({ code: "valid-code" }))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed")
  })
})
