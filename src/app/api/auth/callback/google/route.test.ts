import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockExchangeCodeForTokens = vi.fn()
const mockUpdateGoogleRefreshToken = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("@/lib/google/auth", () => ({
  exchangeCodeForTokens: (...args: unknown[]) =>
    mockExchangeCodeForTokens(...args),
}))

vi.mock("@/services/host.service", () => ({
  hostService: {
    updateGoogleRefreshToken: (...args: unknown[]) =>
      mockUpdateGoogleRefreshToken(...args),
  },
}))

import { GET } from "./route"

describe("GET /api/auth/callback/google", () => {
  const APP_URL = "http://localhost:3000"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = APP_URL
  })

  function makeRequest(
    params: Record<string, string>,
    cookieState?: string
  ) {
    const url = new URL(`${APP_URL}/api/auth/callback/google`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const headers = new Headers()
    if (cookieState) {
      headers.set("cookie", `google_oauth_state=${cookieState}`)
    }

    const { NextRequest } = require("next/server")
    return new NextRequest(url.toString(), { headers })
  }

  it("redirects with error when Google returns error param", async () => {
    const response = await GET(
      makeRequest({ error: "access_denied", state: "abc" }, "abc")
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/onboarding")
    expect(location.searchParams.get("error")).toBe("google_connect_failed")
  })

  it("redirects with error when no code param", async () => {
    const response = await GET(makeRequest({ state: "abc" }, "abc"))
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("google_connect_failed")
  })

  it("rejects mismatched state (CSRF protection)", async () => {
    const response = await GET(
      makeRequest(
        { code: "valid-code", state: "wrong-state" },
        "correct-state"
      )
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("google_connect_failed")
    expect(mockExchangeCodeForTokens).not.toHaveBeenCalled()
  })

  it("rejects when no state cookie present", async () => {
    const response = await GET(
      makeRequest({ code: "valid-code", state: "some-state" })
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("google_connect_failed")
  })

  it("redirects to login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(
      makeRequest({ code: "valid-code", state: "match" }, "match")
    )
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/auth/login"
    )
  })

  it("saves refresh token and redirects with google=connected on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "host-uuid-1" } },
    })
    mockExchangeCodeForTokens.mockResolvedValue("refresh-token-123")
    mockUpdateGoogleRefreshToken.mockResolvedValue({})

    const response = await GET(
      makeRequest({ code: "valid-code", state: "match" }, "match")
    )

    expect(mockExchangeCodeForTokens).toHaveBeenCalledWith("valid-code")
    expect(mockUpdateGoogleRefreshToken).toHaveBeenCalledWith(
      "host-uuid-1",
      "refresh-token-123"
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/onboarding")
    expect(location.searchParams.get("google")).toBe("connected")
  })

  it("redirects with error when token exchange throws (missing refresh_token)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "host-uuid-1" } },
    })
    mockExchangeCodeForTokens.mockRejectedValue(
      new Error("No refresh token received")
    )

    const response = await GET(
      makeRequest({ code: "bad-code", state: "match" }, "match")
    )

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("google_connect_failed")
  })
})
