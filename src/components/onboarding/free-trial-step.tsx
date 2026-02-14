"use client"

import { useState, useTransition } from "react"
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import type { StripeCardElementOptions } from "@stripe/stripe-js"
import { getStripe } from "@/lib/stripe/elements"
import { activateTrial } from "@/app/(host)/onboarding/actions"
import { Button } from "@/components/ui/button"

const cardElementOptions: StripeCardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#2d3748",
      "::placeholder": { color: "#718096" },
    },
    invalid: {
      color: "#e53e3e",
    },
  },
}

function formatTrialEndDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 20)
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

interface FreeTrialFormProps {
  onComplete: (data: { trialEndsAt: string; slug: string }) => void
}

function FreeTrialForm({ onComplete }: FreeTrialFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const { paymentMethod, error: stripeError } =
      await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      })

    if (stripeError) {
      setError(
        stripeError.message || "Card didn't go through. Try a different card?"
      )
      return
    }

    startTransition(async () => {
      const result = await activateTrial({
        paymentMethodId: paymentMethod.id,
      })

      if (result.success) {
        onComplete(result.data)
      } else {
        setError(result.error.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-tt-text-primary">
          Start your free trial
        </h2>
        <p className="mt-2 text-sm text-tt-text-secondary">
          Try TimeTap free for 20 days. No charge until your trial ends.
        </p>
        <p className="mt-3 text-lg font-medium text-tt-text-primary">
          €14.99/month after trial
        </p>
      </div>

      <div className="rounded-md border border-tt-divider p-4">
        <CardElement
          options={cardElementOptions}
          onChange={() => setError(null)}
        />
      </div>

      {error && (
        <p className="text-sm text-tt-error" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!stripe || isPending}
        className="w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white"
      >
        {isPending ? "Processing…" : "Start free trial"}
      </Button>

      <p className="text-center text-xs text-tt-text-muted">
        Cancel anytime. You won&apos;t be charged until {formatTrialEndDate()}.
      </p>
    </form>
  )
}

interface FreeTrialStepProps {
  onComplete: (data: { trialEndsAt: string; slug: string }) => void
}

export function FreeTrialStep({ onComplete }: FreeTrialStepProps) {
  return (
    <Elements stripe={getStripe()}>
      <FreeTrialForm onComplete={onComplete} />
    </Elements>
  )
}
