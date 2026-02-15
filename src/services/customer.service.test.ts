import { describe, it, expect, vi, beforeEach } from "vitest"
import { customerService } from "./customer.service"

const mockUpsert = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

describe("customerService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("findOrCreate", () => {
    const hostId = "host-uuid-1"
    const email = "visitor@example.com"

    it("creates new customer when none exists for host-email pair", async () => {
      const created = { id: "cust-1", email, name: null, hostId }
      mockUpsert.mockResolvedValue(created)

      const result = await customerService.findOrCreate(hostId, email)

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { hostId_email: { hostId, email } },
        create: { email, hostId, name: null },
        update: {},
        select: { id: true, email: true, name: true, hostId: true },
      })
      expect(result).toEqual(created)
    })

    it("returns existing customer when one already exists (upsert no-op)", async () => {
      const existing = { id: "cust-1", email, name: "Existing", hostId }
      mockUpsert.mockResolvedValue(existing)

      const result = await customerService.findOrCreate(hostId, email)

      expect(result).toEqual(existing)
      expect(result.name).toBe("Existing")
    })

    it("handles different hosts with same email as separate customers", async () => {
      const host1Customer = { id: "cust-1", email, name: null, hostId: "host-1" }
      const host2Customer = { id: "cust-2", email, name: null, hostId: "host-2" }

      mockUpsert.mockResolvedValueOnce(host1Customer)
      mockUpsert.mockResolvedValueOnce(host2Customer)

      const result1 = await customerService.findOrCreate("host-1", email)
      const result2 = await customerService.findOrCreate("host-2", email)

      expect(result1.id).toBe("cust-1")
      expect(result2.id).toBe("cust-2")
      expect(mockUpsert).toHaveBeenCalledTimes(2)
    })

    it("passes name when provided", async () => {
      const created = { id: "cust-1", email, name: "John", hostId }
      mockUpsert.mockResolvedValue(created)

      await customerService.findOrCreate(hostId, email, "John")

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { email, hostId, name: "John" },
        })
      )
    })
  })
})
