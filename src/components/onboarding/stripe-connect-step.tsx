"use client"

import { useState } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StripeConnectStepProps {
  error?: string | null
}

export function StripeConnectStep({ error }: StripeConnectStepProps) {
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleConnect = () => {
    setIsRedirecting(true)
    window.location.href = "/api/stripe/connect"
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-base text-tt-text-secondary">
        When clients purchase your packages, payments go directly to your Stripe
        account. Connect now so everything&apos;s ready when you go live.
      </p>

      {error && (
        <div className="mt-4 w-full rounded-md bg-tt-error-light px-4 py-3 text-sm text-tt-error">
          Stripe connection didn&apos;t go through. Let&apos;s try again.
        </div>
      )}

      <Button
        onClick={handleConnect}
        disabled={isRedirecting}
        className="mt-6 w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90"
      >
        <Lock className="mr-2 h-4 w-4" />
        {isRedirecting ? "Redirecting to Stripe…" : "Connect Stripe"}
      </Button>
    </div>
  )
}
