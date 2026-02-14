import Stripe from "stripe"
import { stripe } from "./client"

export async function createTrialSubscription(params: {
  hostEmail: string
  hostId: string
  paymentMethodId: string
}) {
  // 1. Create or retrieve Stripe Customer
  const existingCustomers = await stripe.customers.list({
    email: params.hostEmail,
    limit: 1,
  })
  let customer: Stripe.Customer
  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0]
  } else {
    customer = await stripe.customers.create({
      email: params.hostEmail,
      metadata: { hostId: params.hostId },
    })
  }

  // 2. Attach payment method and set as default
  await stripe.paymentMethods.attach(params.paymentMethodId, {
    customer: customer.id,
  })
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: params.paymentMethodId },
  })

  // 3. Create subscription with 20-day trial
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID! }],
    trial_period_days: 20,
    metadata: { hostId: params.hostId },
  })

  return {
    subscriptionId: subscription.id,
    customerId: customer.id,
    trialEnd: new Date(subscription.trial_end! * 1000),
  }
}

export function constructWebhookEvent(body: string, signature: string) {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
