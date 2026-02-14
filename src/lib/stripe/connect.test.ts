import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuthorizeUrl = vi.fn()
const mockToken = vi.fn()

vi.mock("./client", () => ({
  stripe: {
    oauth: {
      authorizeUrl: (...args: unknown[]) => mockAuthorizeUrl(...args),
      token: (...args: unknown[]) => mockToken(...args),
    },
  },
}))

import { getStripeConnectUrl, exchangeCodeForAccount } from "./connect"

describe("stripe connect helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_CLIENT_ID = "ca_test123"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  })

  describe("getStripeConnectUrl", () => {
    it("returns the OAuth authorization URL with all required params", () => {
      mockAuthorizeUrl.mockReturnValue("https://connect.stripe.com/oauth/authorize?test=1")

      const result = getStripeConnectUrl("state-abc", "host@example.com")

      expect(mockAuthorizeUrl).toHaveBeenCalledWith({
        client_id: "ca_test123",
        response_type: "code",
        scope: "read_write",
        redirect_uri: "http://localhost:3000/api/auth/callback/stripe",
        state: "state-abc",
        stripe_user: { email: "host@example.com" },
      })
      expect(result).toBe("https://connect.stripe.com/oauth/authorize?test=1")
    })

    it("omits stripe_user when no email provided", () => {
      mockAuthorizeUrl.mockReturnValue("https://connect.stripe.com/oauth/authorize")

      getStripeConnectUrl("state-xyz")

      expect(mockAuthorizeUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_user: undefined,
        })
      )
    })
  })

  describe("exchangeCodeForAccount", () => {
    it("exchanges code and returns stripe_user_id", async () => {
      mockToken.mockResolvedValue({
        stripe_user_id: "acct_1ABC",
        access_token: "sk_test_token",
      })

      const result = await exchangeCodeForAccount("auth_code_123")

      expect(mockToken).toHaveBeenCalledWith({
        grant_type: "authorization_code",
        code: "auth_code_123",
      })
      expect(result).toBe("acct_1ABC")
    })
  })
})
