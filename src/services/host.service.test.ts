import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockFindFirst = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    host: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}))

import { hostService } from "./host.service"

describe("hostService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("findByAuthId", () => {
    it("queries host by id (which matches Supabase auth uid)", async () => {
      const mockHost = { id: "uuid-123", name: "Test", email: "test@example.com" }
      mockFindUnique.mockResolvedValue(mockHost)

      const result = await hostService.findByAuthId("uuid-123")

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "uuid-123" },
      })
      expect(result).toEqual(mockHost)
    })

    it("returns null when host not found", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await hostService.findByAuthId("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("createFromAuth", () => {
    it("creates host with auth id, name, and email", async () => {
      const mockHost = { id: "uuid-456", name: "New User", email: "new@example.com" }
      mockCreate.mockResolvedValue(mockHost)

      const result = await hostService.createFromAuth("uuid-456", "New User", "new@example.com")

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          id: "uuid-456",
          name: "New User",
          email: "new@example.com",
        },
      })
      expect(result).toEqual(mockHost)
    })
  })

  describe("activateTrial", () => {
    it("updates host with subscription fields", async () => {
      const trialEndsAt = new Date("2026-03-06T00:00:00Z")
      const updatedHost = {
        id: "host-1",
        subscriptionId: "sub_123",
        subscriptionStatus: "trialing",
        trialEndsAt,
      }
      mockUpdate.mockResolvedValue(updatedHost)

      const result = await hostService.activateTrial("host-1", {
        subscriptionId: "sub_123",
        subscriptionStatus: "trialing",
        trialEndsAt,
      })

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "host-1" },
        data: {
          subscriptionId: "sub_123",
          subscriptionStatus: "trialing",
          trialEndsAt,
        },
      })
      expect(result).toEqual(updatedHost)
    })
  })

  describe("completeOnboarding", () => {
    it("sets onboardingCompleted to true", async () => {
      const updatedHost = { id: "host-1", onboardingCompleted: true }
      mockUpdate.mockResolvedValue(updatedHost)

      const result = await hostService.completeOnboarding("host-1")

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "host-1" },
        data: { onboardingCompleted: true },
      })
      expect(result).toEqual(updatedHost)
    })
  })

  describe("updateSubscriptionStatus", () => {
    it("updates subscription status", async () => {
      mockUpdate.mockResolvedValue({ id: "host-1", subscriptionStatus: "active" })

      await hostService.updateSubscriptionStatus("host-1", {
        subscriptionStatus: "active",
      })

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "host-1" },
        data: { subscriptionStatus: "active" },
      })
    })

    it("includes optional fields when provided", async () => {
      const trialEndsAt = new Date("2026-03-06T00:00:00Z")
      mockUpdate.mockResolvedValue({ id: "host-1" })

      await hostService.updateSubscriptionStatus("host-1", {
        subscriptionStatus: "trialing",
        subscriptionId: "sub_new",
        trialEndsAt,
      })

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "host-1" },
        data: {
          subscriptionStatus: "trialing",
          subscriptionId: "sub_new",
          trialEndsAt,
        },
      })
    })
  })

  describe("findBySlugPublic", () => {
    it("returns public fields for onboarded host", async () => {
      mockFindFirst.mockResolvedValue({
        id: "host-1",
        name: "Jane Coach",
        slug: "jane-coach",
        description: "Life coaching sessions",
        avatarUrl: "https://example.com/avatar.jpg",
      })

      const result = await hostService.findBySlugPublic("jane-coach")

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { slug: "jane-coach", onboardingCompleted: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          avatarUrl: true,
        },
      })
      expect(result).toEqual({
        id: "host-1",
        name: "Jane Coach",
        slug: "jane-coach",
        description: "Life coaching sessions",
        avatarUrl: "https://example.com/avatar.jpg",
      })
    })

    it("returns null for non-existent slug", async () => {
      mockFindFirst.mockResolvedValue(null)

      const result = await hostService.findBySlugPublic("nonexistent")

      expect(result).toBeNull()
    })

    it("returns null for non-onboarded host", async () => {
      mockFindFirst.mockResolvedValue(null)

      const result = await hostService.findBySlugPublic("not-onboarded")

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { slug: "not-onboarded", onboardingCompleted: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          avatarUrl: true,
        },
      })
      expect(result).toBeNull()
    })
  })

  describe("findBySubscriptionId", () => {
    it("finds host by subscription ID", async () => {
      const mockHost = { id: "host-1", subscriptionId: "sub_123" }
      mockFindFirst.mockResolvedValue(mockHost)

      const result = await hostService.findBySubscriptionId("sub_123")

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { subscriptionId: "sub_123" },
      })
      expect(result).toEqual(mockHost)
    })

    it("returns null when no host found", async () => {
      mockFindFirst.mockResolvedValue(null)

      const result = await hostService.findBySubscriptionId("sub_nonexistent")

      expect(result).toBeNull()
    })
  })
})
