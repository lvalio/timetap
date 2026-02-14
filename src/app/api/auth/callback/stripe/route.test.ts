import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockExchangeCodeForAccount = vi.fn()
const mockUpdateStripeAccountId = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("@/lib/stripe/connect", () => ({
  exchangeCodeForAccount: (...args: unknown[]) =>
    mockExchangeCodeForAccount(...args),
}))

vi.mock("@/services/host.service", () => ({
  hostService: {
    updateStripeAccountId: (...args: unknown[]) =>
      mockUpdateStripeAccountId(...args),
  },
}))

import { GET } from "./route"

describe("GET /api/auth/callback/stripe", () => {
  const APP_URL = "http://localhost:3000"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = APP_URL
  })

  function makeRequest(
    params: Record<string, string>,
    cookieState?: string
  ) {
    const url = new URL(`${APP_URL}/api/auth/callback/stripe`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const headers = new Headers()
    if (cookieState) {
      headers.set("cookie", `stripe_oauth_state=${cookieState}`)
    }

    // Use NextRequest for cookie support
    const { NextRequest } = require("next/server")
    return new NextRequest(url.toString(), { headers })
  }

  it("redirects with error when Stripe returns error param", async () => {
    const response = await GET(
      makeRequest({ error: "access_denied", state: "abc" }, "abc")
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/onboarding")
    expect(location.searchParams.get("error")).toBe("stripe_connect_failed")
  })

  it("redirects with error when no code param", async () => {
    const response = await GET(makeRequest({ state: "abc" }, "abc"))
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("stripe_connect_failed")
  })

  it("rejects mismatched state (CSRF protection)", async () => {
    const response = await GET(
      makeRequest({ code: "valid-code", state: "wrong-state" }, "correct-state")
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("stripe_connect_failed")
    expect(mockExchangeCodeForAccount).not.toHaveBeenCalled()
  })

  it("rejects when no state cookie present", async () => {
    const response = await GET(
      makeRequest({ code: "valid-code", state: "some-state" })
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("stripe_connect_failed")
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

  it("saves stripeAccountId and redirects on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "host-uuid-1" } },
    })
    mockExchangeCodeForAccount.mockResolvedValue("acct_1ABC")
    mockUpdateStripeAccountId.mockResolvedValue({})

    const response = await GET(
      makeRequest({ code: "valid-code", state: "match" }, "match")
    )

    expect(mockExchangeCodeForAccount).toHaveBeenCalledWith("valid-code")
    expect(mockUpdateStripeAccountId).toHaveBeenCalledWith(
      "host-uuid-1",
      "acct_1ABC"
    )
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/onboarding")
    expect(location.searchParams.get("stripe")).toBe("connected")
  })

  it("redirects with error when token exchange throws", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "host-uuid-1" } },
    })
    mockExchangeCodeForAccount.mockRejectedValue(new Error("Stripe error"))

    const response = await GET(
      makeRequest({ code: "bad-code", state: "match" }, "match")
    )

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location")!)
    expect(location.searchParams.get("error")).toBe("stripe_connect_failed")
  })
})
