"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper"
import { ProfileForm } from "@/components/onboarding/profile-form"
import { StripeConnectStep } from "@/components/onboarding/stripe-connect-step"
import { GoogleCalendarStep } from "@/components/onboarding/google-calendar-step"
import { PackageStep } from "@/components/onboarding/package-step"
import { saveProfile } from "./actions"
import type { UpdateProfileInput } from "@/lib/validations/host"

interface HostData {
  id: string
  name: string
  description: string | null
  slug: string | null
  stripeAccountId: string | null
  googleRefreshToken: string | null
  bookableHours: Record<string, { start: string; end: string }[]> | null
}

const STEP_TITLES: Record<number, { title: string; description: string }> = {
  1: {
    title: "Set up your profile",
    description: "Tell your clients who you are and choose your unique URL.",
  },
  2: {
    title: "Connect Stripe",
    description:
      "Connect your Stripe account so you can receive payments from your clients.",
  },
  3: {
    title: "Google Calendar & Bookable Hours",
    description:
      "Connect your Google Calendar and set when you're available.",
  },
  4: {
    title: "Create Your First Package",
    description: "Set up your packages so clients can book and buy.",
  },
  5: {
    title: "Start Free Trial",
    description: "Coming in Story 2.5",
  },
}

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [hostData, setHostData] = useState<HostData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [calendarConnected, setCalendarConnected] = useState(false)

  const fetchHost = useCallback(async () => {
    const res = await fetch("/api/host/me")
    if (res.ok) {
      const data = await res.json()
      setHostData(data)
      return data as HostData
    }
    return null
  }, [])

  // Initial host data fetch
  useEffect(() => {
    fetchHost()
  }, [fetchHost])

  // Handle return from Stripe OAuth
  useEffect(() => {
    const step = searchParams.get("step")
    const stripe = searchParams.get("stripe")
    const google = searchParams.get("google")
    const errorParam = searchParams.get("error")

    if (step === "2") {
      setCurrentStep(2)

      if (stripe === "connected") {
        fetchHost().then((host) => {
          if (host?.stripeAccountId) {
            setCurrentStep(3)
          }
        })
      }

      if (errorParam === "stripe_connect_failed") {
        setStripeError("stripe_connect_failed")
      }
    }

    if (step === "3") {
      setCurrentStep(3)

      if (google === "connected") {
        fetchHost().then((host) => {
          if (host?.googleRefreshToken) {
            setCalendarConnected(true)
          }
        })
      }

      if (errorParam === "google_connect_failed") {
        setGoogleError("google_connect_failed")
      }
    }
  }, [searchParams, fetchHost])

  // Sync calendarConnected with hostData
  useEffect(() => {
    if (hostData?.googleRefreshToken) {
      setCalendarConnected(true)
    }
  }, [hostData])

  const handleProfileSubmit = async (data: UpdateProfileInput) => {
    setError(null)
    startTransition(async () => {
      const result = await saveProfile(data)
      if (result.success) {
        setCurrentStep(2)
      } else {
        setError(result.error.message)
      }
    })
  }

  const stepInfo = STEP_TITLES[currentStep]

  return (
    <div>
      <OnboardingStepper currentStep={currentStep} />

      <h1 className="text-xl font-semibold text-tt-text-primary">
        {stepInfo.title}
      </h1>
      <p className="mt-1 text-sm text-tt-text-secondary">
        {stepInfo.description}
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-tt-error-light px-4 py-3 text-sm text-tt-error">
          {error}
        </div>
      )}

      <div className="mt-6">
        {currentStep === 1 && hostData && (
          <ProfileForm
            defaultValues={{
              name: hostData.name,
              description: hostData.description ?? "",
              slug: hostData.slug ?? "",
            }}
            hostId={hostData.id}
            onSubmit={handleProfileSubmit}
            submitLabel="Continue"
            isPending={isPending}
          />
        )}

        {currentStep === 2 && (
          <StripeConnectStep error={stripeError} />
        )}

        {currentStep === 3 && (
          <GoogleCalendarStep
            calendarConnected={calendarConnected}
            error={googleError}
            onComplete={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && hostData && (
          <PackageStep
            hostId={hostData.id}
            onComplete={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-tt-text-muted">
              {stepInfo.description}
            </p>
            <button
              disabled
              className="mt-6 w-full rounded-md bg-tt-divider py-2 text-sm text-tt-text-disabled"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
