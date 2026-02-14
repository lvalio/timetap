import { describe, it, expect, vi, beforeEach } from "vitest"

const mockCustomersList = vi.fn()
const mockCustomersCreate = vi.fn()
const mockCustomersUpdate = vi.fn()
const mockPaymentMethodsAttach = vi.fn()
const mockSubscriptionsCreate = vi.fn()
const mockConstructEvent = vi.fn()

vi.mock("./client", () => ({
  stripe: {
    customers: {
      list: (...args: unknown[]) => mockCustomersList(...args),
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      update: (...args: unknown[]) => mockCustomersUpdate(...args),
    },
    paymentMethods: {
      attach: (...args: unknown[]) => mockPaymentMethodsAttach(...args),
    },
    subscriptions: {
      create: (...args: unknown[]) => mockSubscriptionsCreate(...args),
    },
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
}))

import { createTrialSubscription, constructWebhookEvent } from "./billing"

describe("billing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_ID = "price_test123"
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test123"
  })

  describe("createTrialSubscription", () => {
    const params = {
      hostEmail: "host@example.com",
      hostId: "host-uuid-123",
      paymentMethodId: "pm_test123",
    }

    it("creates a new customer when none exists", async () => {
      mockCustomersList.mockResolvedValue({ data: [] })
      mockCustomersCreate.mockResolvedValue({ id: "cus_new123" })
      mockPaymentMethodsAttach.mockResolvedValue({})
      mockCustomersUpdate.mockResolvedValue({})
      mockSubscriptionsCreate.mockResolvedValue({
        id: "sub_test123",
        trial_end: 1700000000,
      })

      const result = await createTrialSubscription(params)

      expect(mockCustomersList).toHaveBeenCalledWith({
        email: "host@example.com",
        limit: 1,
      })
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: "host@example.com",
        metadata: { hostId: "host-uuid-123" },
      })
      expect(result.subscriptionId).toBe("sub_test123")
      expect(result.customerId).toBe("cus_new123")
      expect(result.trialEnd).toEqual(new Date(1700000000 * 1000))
    })

    it("retrieves existing customer when one exists", async () => {
      mockCustomersList.mockResolvedValue({
        data: [{ id: "cus_existing456" }],
      })
      mockPaymentMethodsAttach.mockResolvedValue({})
      mockCustomersUpdate.mockResolvedValue({})
      mockSubscriptionsCreate.mockResolvedValue({
        id: "sub_test456",
        trial_end: 1700000000,
      })

      const result = await createTrialSubscription(params)

      expect(mockCustomersCreate).not.toHaveBeenCalled()
      expect(result.customerId).toBe("cus_existing456")
    })

    it("attaches payment method and sets as default", async () => {
      mockCustomersList.mockResolvedValue({
        data: [{ id: "cus_abc" }],
      })
      mockPaymentMethodsAttach.mockResolvedValue({})
      mockCustomersUpdate.mockResolvedValue({})
      mockSubscriptionsCreate.mockResolvedValue({
        id: "sub_xyz",
        trial_end: 1700000000,
      })

      await createTrialSubscription(params)

      expect(mockPaymentMethodsAttach).toHaveBeenCalledWith("pm_test123", {
        customer: "cus_abc",
      })
      expect(mockCustomersUpdate).toHaveBeenCalledWith("cus_abc", {
        invoice_settings: { default_payment_method: "pm_test123" },
      })
    })

    it("creates subscription with 20-day trial", async () => {
      mockCustomersList.mockResolvedValue({
        data: [{ id: "cus_abc" }],
      })
      mockPaymentMethodsAttach.mockResolvedValue({})
      mockCustomersUpdate.mockResolvedValue({})
      mockSubscriptionsCreate.mockResolvedValue({
        id: "sub_xyz",
        trial_end: 1700000000,
      })

      await createTrialSubscription(params)

      expect(mockSubscriptionsCreate).toHaveBeenCalledWith({
        customer: "cus_abc",
        items: [{ price: "price_test123" }],
        trial_period_days: 20,
        metadata: { hostId: "host-uuid-123" },
      })
    })

    it("throws on card decline (Stripe error propagates)", async () => {
      mockCustomersList.mockResolvedValue({ data: [] })
      mockCustomersCreate.mockResolvedValue({ id: "cus_new" })
      mockPaymentMethodsAttach.mockRejectedValue(
        new Error("Your card was declined.")
      )

      await expect(createTrialSubscription(params)).rejects.toThrow(
        "Your card was declined."
      )
    })
  })

  describe("constructWebhookEvent", () => {
    it("calls stripe.webhooks.constructEvent with correct args", () => {
      const mockEvent = { type: "test" }
      mockConstructEvent.mockReturnValue(mockEvent)

      const result = constructWebhookEvent("body", "sig_test")

      expect(mockConstructEvent).toHaveBeenCalledWith(
        "body",
        "sig_test",
        "whsec_test123"
      )
      expect(result).toBe(mockEvent)
    })
  })
})
