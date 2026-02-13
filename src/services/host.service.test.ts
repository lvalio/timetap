import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    host: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
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
})
