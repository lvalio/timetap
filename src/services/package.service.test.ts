import { describe, it, expect, vi, beforeEach } from "vitest"

const mockCreate = vi.fn()
const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockCount = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    package: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}))

import { packageService } from "./package.service"

describe("packageService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("create", () => {
    it("creates a package and sets isFreeIntro for free single-session", async () => {
      const mockPkg = { id: "pkg-1", name: "Free Intro Call", isFreeIntro: true }
      mockCreate.mockResolvedValue(mockPkg)

      const result = await packageService.create("host-1", {
        name: "Free Intro Call",
        sessionCount: 1,
        priceInCents: 0,
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          hostId: "host-1",
          name: "Free Intro Call",
          sessionCount: 1,
          priceInCents: 0,
          isFreeIntro: true,
        },
      })
      expect(result).toEqual(mockPkg)
    })

    it("sets isFreeIntro false for paid packages", async () => {
      mockCreate.mockResolvedValue({ id: "pkg-2" })

      await packageService.create("host-1", {
        name: "5 Sessions",
        sessionCount: 5,
        priceInCents: 40000,
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ isFreeIntro: false }),
      })
    })

    it("sets isFreeIntro false for free multi-session", async () => {
      mockCreate.mockResolvedValue({ id: "pkg-3" })

      await packageService.create("host-1", {
        name: "Free Bundle",
        sessionCount: 3,
        priceInCents: 0,
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ isFreeIntro: false }),
      })
    })
  })

  describe("listByHostId", () => {
    it("returns packages sorted by createdAt desc", async () => {
      const mockPkgs = [{ id: "pkg-2" }, { id: "pkg-1" }]
      mockFindMany.mockResolvedValue(mockPkgs)

      const result = await packageService.listByHostId("host-1")

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { hostId: "host-1" },
        orderBy: { createdAt: "desc" },
      })
      expect(result).toEqual(mockPkgs)
    })
  })

  describe("findById", () => {
    it("finds package by id and hostId", async () => {
      const mockPkg = { id: "pkg-1", hostId: "host-1" }
      mockFindFirst.mockResolvedValue(mockPkg)

      const result = await packageService.findById("pkg-1", "host-1")

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: "pkg-1", hostId: "host-1" },
      })
      expect(result).toEqual(mockPkg)
    })

    it("returns null for wrong host", async () => {
      mockFindFirst.mockResolvedValue(null)

      const result = await packageService.findById("pkg-1", "wrong-host")

      expect(result).toBeNull()
    })
  })

  describe("update", () => {
    it("updates package after verifying ownership", async () => {
      mockFindFirst.mockResolvedValue({ id: "pkg-1", hostId: "host-1" })
      mockUpdate.mockResolvedValue({ id: "pkg-1", name: "Updated" })

      const result = await packageService.update("pkg-1", "host-1", {
        name: "Updated",
        sessionCount: 3,
        priceInCents: 15000,
      })

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: "pkg-1", hostId: "host-1" },
      })
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "pkg-1" },
        data: { name: "Updated", sessionCount: 3, priceInCents: 15000 },
      })
      expect(result).toEqual({ id: "pkg-1", name: "Updated" })
    })

    it("throws when package not found", async () => {
      mockFindFirst.mockResolvedValue(null)

      await expect(
        packageService.update("pkg-1", "wrong-host", {
          name: "X",
          sessionCount: 1,
          priceInCents: 0,
        })
      ).rejects.toThrow("Package not found")
    })
  })

  describe("deactivate", () => {
    it("deactivates package after verifying ownership", async () => {
      mockFindFirst.mockResolvedValue({ id: "pkg-1", hostId: "host-1" })
      mockUpdate.mockResolvedValue({ id: "pkg-1", isActive: false })

      const result = await packageService.deactivate("pkg-1", "host-1")

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "pkg-1" },
        data: { isActive: false },
      })
      expect(result).toEqual({ id: "pkg-1", isActive: false })
    })

    it("throws when package not found", async () => {
      mockFindFirst.mockResolvedValue(null)

      await expect(
        packageService.deactivate("pkg-1", "wrong-host")
      ).rejects.toThrow("Package not found")
    })
  })

  describe("findActiveByHostId", () => {
    it("returns active packages with free intro first, then by createdAt", async () => {
      const mockPkgs = [
        { id: "pkg-free", name: "Free Intro", sessionCount: 1, priceInCents: 0, isFreeIntro: true },
        { id: "pkg-paid", name: "5 Sessions", sessionCount: 5, priceInCents: 40000, isFreeIntro: false },
      ]
      mockFindMany.mockResolvedValue(mockPkgs)

      const result = await packageService.findActiveByHostId("host-1")

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { hostId: "host-1", isActive: true },
        select: {
          id: true,
          name: true,
          sessionCount: true,
          priceInCents: true,
          isFreeIntro: true,
        },
        orderBy: [{ isFreeIntro: "desc" }, { createdAt: "asc" }],
      })
      expect(result).toEqual(mockPkgs)
    })

    it("returns empty array for host with no active packages", async () => {
      mockFindMany.mockResolvedValue([])

      const result = await packageService.findActiveByHostId("host-no-pkgs")

      expect(result).toEqual([])
    })
  })

  describe("countByHostId", () => {
    it("returns count of packages for host", async () => {
      mockCount.mockResolvedValue(3)

      const result = await packageService.countByHostId("host-1")

      expect(mockCount).toHaveBeenCalledWith({
        where: { hostId: "host-1" },
      })
      expect(result).toBe(3)
    })
  })
})
