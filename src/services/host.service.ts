import { prisma } from "@/lib/prisma"

export const hostService = {
  async findByAuthId(authId: string) {
    return prisma.host.findUnique({
      where: { id: authId },
    })
  },

  async createFromAuth(authId: string, name: string, email: string) {
    return prisma.host.create({
      data: {
        id: authId,
        name,
        email,
      },
    })
  },
}
