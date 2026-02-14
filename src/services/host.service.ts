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

  async updateProfile(
    hostId: string,
    data: { name: string; description?: string; slug: string }
  ) {
    return prisma.host.update({
      where: { id: hostId },
      data: {
        name: data.name,
        description: data.description ?? null,
        slug: data.slug,
      },
    })
  },

  async isSlugAvailable(slug: string, excludeHostId?: string) {
    const existing = await prisma.host.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!existing) return true
    if (excludeHostId && existing.id === excludeHostId) return true
    return false
  },

  suggestSlug(slug: string): string {
    const suffix = Math.floor(10 + Math.random() * 90)
    return `${slug}-${suffix}`
  },
}
