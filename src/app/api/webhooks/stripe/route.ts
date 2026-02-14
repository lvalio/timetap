import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { constructWebhookEvent } from "@/lib/stripe/billing"
import { hostService } from "@/services/host.service"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature) as Stripe.Event
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const host = await hostService.findBySubscriptionId(subscription.id)
      if (host) {
        await hostService.updateSubscriptionStatus(host.id, {
          subscriptionStatus: subscription.status,
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : undefined,
        })
      }
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const host = await hostService.findBySubscriptionId(subscription.id)
      if (host) {
        await hostService.updateSubscriptionStatus(host.id, {
          subscriptionStatus: "canceled",
        })
      }
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const sub = invoice.parent?.subscription_details?.subscription
      if (sub) {
        const subId = typeof sub === "string" ? sub : sub.id
        const host = await hostService.findBySubscriptionId(subId)
        if (host) {
          await hostService.updateSubscriptionStatus(host.id, {
            subscriptionStatus: "past_due",
          })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
