import { prisma } from "@/lib/prisma"
import type { CreatePackageInput, UpdatePackageInput } from "@/lib/validations/package"

export const packageService = {
  async create(hostId: string, data: CreatePackageInput) {
    return prisma.package.create({
      data: {
        hostId,
        name: data.name,
        sessionCount: data.sessionCount,
        priceInCents: data.priceInCents,
        isFreeIntro: data.priceInCents === 0 && data.sessionCount === 1,
      },
    })
  },

  async listByHostId(hostId: string) {
    return prisma.package.findMany({
      where: { hostId },
      orderBy: { createdAt: "desc" },
    })
  },

  async findById(id: string, hostId: string) {
    return prisma.package.findFirst({
      where: { id, hostId },
    })
  },

  async update(id: string, hostId: string, data: UpdatePackageInput) {
    const existing = await prisma.package.findFirst({ where: { id, hostId } })
    if (!existing) throw new Error("Package not found")
    return prisma.package.update({ where: { id }, data })
  },

  async deactivate(id: string, hostId: string) {
    const existing = await prisma.package.findFirst({ where: { id, hostId } })
    if (!existing) throw new Error("Package not found")
    return prisma.package.update({
      where: { id },
      data: { isActive: false },
    })
  },

  async findActiveByHostId(hostId: string) {
    return prisma.package.findMany({
      where: { hostId, isActive: true },
      select: {
        id: true,
        name: true,
        sessionCount: true,
        priceInCents: true,
        isFreeIntro: true,
      },
      orderBy: [{ isFreeIntro: "desc" }, { createdAt: "asc" }],
    })
  },

  async countByHostId(hostId: string) {
    return prisma.package.count({
      where: { hostId },
    })
  },
}
