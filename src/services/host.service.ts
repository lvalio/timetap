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

  async updateStripeAccountId(hostId: string, stripeAccountId: string) {
    return prisma.host.update({
      where: { id: hostId },
      data: { stripeAccountId },
    })
  },

  async updateBookableHours(hostId: string, bookableHours: Record<string, { start: string; end: string }[]>) {
    return prisma.host.update({
      where: { id: hostId },
      data: { bookableHours },
    })
  },

  async updateGoogleRefreshToken(hostId: string, refreshToken: string) {
    return prisma.host.update({
      where: { id: hostId },
      data: { googleRefreshToken: refreshToken },
    })
  },

  async activateTrial(
    hostId: string,
    data: {
      subscriptionId: string
      subscriptionStatus: string
      trialEndsAt: Date
    }
  ) {
    return prisma.host.update({
      where: { id: hostId },
      data: {
        subscriptionId: data.subscriptionId,
        subscriptionStatus: data.subscriptionStatus,
        trialEndsAt: data.trialEndsAt,
      },
    })
  },

  async completeOnboarding(hostId: string) {
    return prisma.host.update({
      where: { id: hostId },
      data: { onboardingCompleted: true },
    })
  },

  async updateSubscriptionStatus(
    hostId: string,
    data: {
      subscriptionStatus: string
      subscriptionId?: string
      trialEndsAt?: Date
    }
  ) {
    return prisma.host.update({
      where: { id: hostId },
      data: {
        subscriptionStatus: data.subscriptionStatus,
        ...(data.subscriptionId && { subscriptionId: data.subscriptionId }),
        ...(data.trialEndsAt && { trialEndsAt: data.trialEndsAt }),
      },
    })
  },

  async findBySlugPublic(slug: string) {
    return prisma.host.findFirst({
      where: { slug, onboardingCompleted: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatarUrl: true,
      },
    })
  },

  async findBySubscriptionId(subscriptionId: string) {
    return prisma.host.findFirst({
      where: { subscriptionId },
    })
  },

  suggestSlug(slug: string): string {
    const suffix = Math.floor(10 + Math.random() * 90)
    return `${slug}-${suffix}`
  },
}
