import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSignInWithOAuth = vi.fn()
const mockSignOut = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signOut: () => mockSignOut(),
    },
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

describe("signInWithGoogle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  })

  it("calls signInWithOAuth with google provider and correct options", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/oauth" },
      error: null,
    })

    const { signInWithGoogle } = await import("./actions")
    const result = await signInWithGoogle()

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
    expect(result).toEqual({
      success: true,
      data: { url: "https://accounts.google.com/oauth" },
    })
  })

  it("returns error when signInWithOAuth fails", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: "OAuth failed" },
    })

    const { signInWithGoogle } = await import("./actions")
    const result = await signInWithGoogle()

    expect(result).toEqual({
      success: false,
      error: { code: "AUTH_ERROR", message: "OAuth failed" },
    })
  })
})

describe("signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls supabase signOut and redirects to login", async () => {
    mockSignOut.mockResolvedValue({ error: null })
    const { redirect } = await import("next/navigation")

    const { signOut } = await import("./actions")
    await signOut()

    expect(mockSignOut).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/auth/login")
  })
})
