import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockGetGoogleCalendarAuthUrl = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("@/lib/google/auth", () => ({
  getGoogleCalendarAuthUrl: (...args: unknown[]) =>
    mockGetGoogleCalendarAuthUrl(...args),
}))

import { GET } from "./route"

describe("GET /api/google/connect", () => {
  const APP_URL = "http://localhost:3000"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = APP_URL
  })

  it("redirects to login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET()

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/auth/login"
    )
  })

  it("redirects to Google OAuth URL with state cookie when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "host-1" } },
    })
    mockGetGoogleCalendarAuthUrl.mockReturnValue(
      "https://accounts.google.com/o/oauth2/auth?test=1"
    )

    const response = await GET()

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/auth?test=1"
    )
    expect(mockGetGoogleCalendarAuthUrl).toHaveBeenCalledWith(
      expect.any(String)
    )

    // Verify state cookie is set
    const setCookie = response.headers.get("set-cookie")
    expect(setCookie).toContain("google_oauth_state=")
    expect(setCookie).toContain("HttpOnly")
  })
})
