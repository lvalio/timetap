import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDeactivate = vi.fn()
const mockListByHostId = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

vi.mock("@/services/package.service", () => ({
  packageService: {
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    deactivate: (...args: unknown[]) => mockDeactivate(...args),
    listByHostId: (...args: unknown[]) => mockListByHostId(...args),
  },
}))

vi.mock("@/lib/validations/package", async () => {
  const actual = await vi.importActual("@/lib/validations/package")
  return actual
})

import {
  createPackageAction,
  updatePackageAction,
  deactivatePackageAction,
  listPackagesAction,
} from "./actions"

describe("dashboard package actions", () => {
  const mockUser = { id: "host-1" }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
  })

  describe("createPackageAction", () => {
    it("creates a package successfully", async () => {
      const mockPkg = { id: "pkg-1", name: "Test" }
      mockCreate.mockResolvedValue(mockPkg)

      const result = await createPackageAction({
        name: "Test",
        sessionCount: 1,
        priceInCents: 5000,
      })

      expect(result).toEqual({ success: true, data: mockPkg })
      expect(mockCreate).toHaveBeenCalledWith("host-1", {
        name: "Test",
        sessionCount: 1,
        priceInCents: 5000,
      })
    })

    it("returns validation error for invalid input", async () => {
      const result = await createPackageAction({
        name: "",
        sessionCount: 1,
        priceInCents: 0,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR")
      }
    })

    it("returns unauthorized when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await createPackageAction({
        name: "Test",
        sessionCount: 1,
        priceInCents: 0,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED")
      }
    })
  })

  describe("updatePackageAction", () => {
    it("updates a package successfully", async () => {
      const mockPkg = { id: "pkg-1", name: "Updated" }
      mockUpdate.mockResolvedValue(mockPkg)

      const result = await updatePackageAction("pkg-1", {
        name: "Updated",
        sessionCount: 3,
        priceInCents: 15000,
      })

      expect(result).toEqual({ success: true, data: mockPkg })
    })

    it("returns unauthorized when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await updatePackageAction("pkg-1", {
        name: "Updated",
        sessionCount: 3,
        priceInCents: 15000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED")
      }
    })
  })

  describe("deactivatePackageAction", () => {
    it("deactivates a package successfully", async () => {
      const mockPkg = { id: "pkg-1", isActive: false }
      mockDeactivate.mockResolvedValue(mockPkg)

      const result = await deactivatePackageAction("pkg-1")

      expect(result).toEqual({ success: true, data: mockPkg })
      expect(mockDeactivate).toHaveBeenCalledWith("pkg-1", "host-1")
    })

    it("returns unauthorized when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await deactivatePackageAction("pkg-1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED")
      }
    })
  })

  describe("listPackagesAction", () => {
    it("lists packages successfully", async () => {
      const mockPkgs = [{ id: "pkg-1" }, { id: "pkg-2" }]
      mockListByHostId.mockResolvedValue(mockPkgs)

      const result = await listPackagesAction()

      expect(result).toEqual({ success: true, data: mockPkgs })
      expect(mockListByHostId).toHaveBeenCalledWith("host-1")
    })

    it("returns unauthorized when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await listPackagesAction()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED")
      }
    })
  })
})
