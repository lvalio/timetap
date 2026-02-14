"use client"

import { useState, useEffect, useTransition } from "react"
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper"
import { ProfileForm } from "@/components/onboarding/profile-form"
import { saveProfile } from "./actions"
import type { UpdateProfileInput } from "@/lib/validations/host"

interface HostData {
  id: string
  name: string
  description: string | null
  slug: string | null
}

const STEP_TITLES: Record<number, { title: string; description: string }> = {
  1: {
    title: "Set up your profile",
    description: "Tell your clients who you are and choose your unique URL.",
  },
  2: {
    title: "Connect Stripe",
    description: "Coming in Story 2.2",
  },
  3: {
    title: "Google Calendar & Bookable Hours",
    description: "Coming in Story 2.3",
  },
  4: {
    title: "Create Your First Package",
    description: "Coming in Story 2.4",
  },
  5: {
    title: "Start Free Trial",
    description: "Coming in Story 2.5",
  },
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [hostData, setHostData] = useState<HostData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHost() {
      const res = await fetch("/api/host/me")
      if (res.ok) {
        const data = await res.json()
        setHostData(data)
      }
    }
    fetchHost()
  }, [])

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

        {currentStep >= 2 && currentStep <= 5 && (
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
