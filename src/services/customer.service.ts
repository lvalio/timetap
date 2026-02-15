import { prisma } from "@/lib/prisma"

export const customerService = {
  async findOrCreate(hostId: string, email: string, name?: string) {
    return prisma.customer.upsert({
      where: { hostId_email: { hostId, email } },
      create: { email, hostId, name: name ?? null },
      update: {},
      select: { id: true, email: true, name: true, hostId: true },
    })
  },
}
