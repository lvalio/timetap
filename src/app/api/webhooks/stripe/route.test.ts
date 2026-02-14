import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockConstructWebhookEvent = vi.fn()
vi.mock("@/lib/stripe/billing", () => ({
  constructWebhookEvent: (...args: unknown[]) =>
    mockConstructWebhookEvent(...args),
}))

const mockFindBySubscriptionId = vi.fn()
const mockUpdateSubscriptionStatus = vi.fn()
vi.mock("@/services/host.service", () => ({
  hostService: {
    findBySubscriptionId: (...args: unknown[]) =>
      mockFindBySubscriptionId(...args),
    updateSubscriptionStatus: (...args: unknown[]) =>
      mockUpdateSubscriptionStatus(...args),
  },
}))

import { POST } from "./route"

function makeRequest(body: string, signature: string | null) {
  const headers = new Headers()
  if (signature) {
    headers.set("stripe-signature", signature)
  }
  return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  })
}

describe("Stripe webhook handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for missing signature", async () => {
    const req = makeRequest("{}", null)
    const res = await POST(req)

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Missing signature")
  })

  it("returns 400 for invalid signature", async () => {
    mockConstructWebhookEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    const req = makeRequest("{}", "invalid_sig")
    const res = await POST(req)

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid signature")
  })

  it("handles customer.subscription.created event", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          status: "trialing",
          trial_end: 1700000000,
        },
      },
    })
    mockFindBySubscriptionId.mockResolvedValue({ id: "host-1" })
    mockUpdateSubscriptionStatus.mockResolvedValue({})

    const req = makeRequest("{}", "valid_sig")
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockFindBySubscriptionId).toHaveBeenCalledWith("sub_123")
    expect(mockUpdateSubscriptionStatus).toHaveBeenCalledWith("host-1", {
      subscriptionStatus: "trialing",
      trialEndsAt: new Date(1700000000 * 1000),
    })
  })

  it("handles customer.subscription.updated event", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          status: "active",
          trial_end: null,
        },
      },
    })
    mockFindBySubscriptionId.mockResolvedValue({ id: "host-1" })
    mockUpdateSubscriptionStatus.mockResolvedValue({})

    const req = makeRequest("{}", "valid_sig")
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockUpdateSubscriptionStatus).toHaveBeenCalledWith("host-1", {
      subscriptionStatus: "active",
      trialEndsAt: undefined,
    })
  })

  it("handles customer.subscription.deleted event", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: { id: "sub_123", status: "canceled" },
      },
    })
    mockFindBySubscriptionId.mockResolvedValue({ id: "host-1" })
    mockUpdateSubscriptionStatus.mockResolvedValue({})

    const req = makeRequest("{}", "valid_sig")
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockUpdateSubscriptionStatus).toHaveBeenCalledWith("host-1", {
      subscriptionStatus: "canceled",
    })
  })

  it("handles invoice.payment_failed event", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: { subscription: "sub_123" },
      },
    })
    mockFindBySubscriptionId.mockResolvedValue({ id: "host-1" })
    mockUpdateSubscriptionStatus.mockResolvedValue({})

    const req = makeRequest("{}", "valid_sig")
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockUpdateSubscriptionStatus).toHaveBeenCalledWith("host-1", {
      subscriptionStatus: "past_due",
    })
  })

  it("is idempotent - reprocessing same event produces same result", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          status: "active",
          trial_end: null,
        },
      },
    })
    mockFindBySubscriptionId.mockResolvedValue({ id: "host-1" })
    mockUpdateSubscriptionStatus.mockResolvedValue({})

    const req1 = makeRequest("{}", "valid_sig")
    await POST(req1)

    const req2 = makeRequest("{}", "valid_sig")
    await POST(req2)

    // Both calls update to the same status — idempotent
    expect(mockUpdateSubscriptionStatus).toHaveBeenCalledTimes(2)
    expect(mockUpdateSubscriptionStatus).toHaveBeenNthCalledWith(1, "host-1", {
      subscriptionStatus: "active",
      trialEndsAt: undefined,
    })
    expect(mockUpdateSubscriptionStatus).toHaveBeenNthCalledWith(2, "host-1", {
      subscriptionStatus: "active",
      trialEndsAt: undefined,
    })
  })

  it("returns 200 even if host not found for subscription", async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: {
        object: { id: "sub_unknown", status: "trialing", trial_end: null },
      },
    })
    mockFindBySubscriptionId.mockResolvedValue(null)

    const req = makeRequest("{}", "valid_sig")
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockUpdateSubscriptionStatus).not.toHaveBeenCalled()
  })
})
