"use client"

import { cn } from "@/lib/utils"

interface OnboardingStepperProps {
  currentStep: number
  totalSteps?: number
}

export function OnboardingStepper({
  currentStep,
  totalSteps = 5,
}: OnboardingStepperProps) {
  return (
    <div className="mb-6">
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep

          return (
            <div
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full",
                isCompleted || isCurrent
                  ? "bg-gradient-to-r from-[#4facfe] to-[#00f2fe]"
                  : "bg-tt-divider"
              )}
              role="progressbar"
              aria-valuenow={isCompleted ? 100 : isCurrent ? 50 : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Step ${step} of ${totalSteps}`}
            />
          )
        })}
      </div>
      <p className="mt-2 text-xs text-tt-text-muted">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  )
}
