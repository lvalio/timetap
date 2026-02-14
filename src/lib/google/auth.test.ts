import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGenerateAuthUrl = vi.fn()
const mockGetToken = vi.fn()

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class MockOAuth2 {
        generateAuthUrl(...args: unknown[]) {
          return mockGenerateAuthUrl(...args)
        }
        getToken(...args: unknown[]) {
          return mockGetToken(...args)
        }
      },
    },
  },
}))

import {
  getGoogleCalendarAuthUrl,
  exchangeCodeForTokens,
} from "./auth"

describe("google auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  })

  describe("getGoogleCalendarAuthUrl", () => {
    it("returns URL with correct scopes, state, access_type=offline, prompt=consent", () => {
      mockGenerateAuthUrl.mockReturnValue(
        "https://accounts.google.com/o/oauth2/auth?test=1"
      )

      const result = getGoogleCalendarAuthUrl("state-abc")

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.readonly",
        ],
        state: "state-abc",
      })
      expect(result).toBe(
        "https://accounts.google.com/o/oauth2/auth?test=1"
      )
    })
  })

  describe("exchangeCodeForTokens", () => {
    it("calls oauth2Client.getToken and returns refresh_token", async () => {
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token-123",
        },
      })

      const result = await exchangeCodeForTokens("auth-code")

      expect(mockGetToken).toHaveBeenCalledWith("auth-code")
      expect(result).toBe("refresh-token-123")
    })

    it("throws when no refresh_token is returned", async () => {
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: "access-token",
          refresh_token: null,
        },
      })

      await expect(exchangeCodeForTokens("auth-code")).rejects.toThrow(
        "No refresh token received"
      )
    })

    it("throws when getToken fails", async () => {
      mockGetToken.mockRejectedValue(new Error("Google API error"))

      await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow(
        "Google API error"
      )
    })
  })
})
