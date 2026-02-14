"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface OnboardingCompleteProps {
  slug: string
}

export function OnboardingComplete({ slug }: OnboardingCompleteProps) {
  const router = useRouter()
  const publicUrl = `https://timetap.it/${slug}`

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(publicUrl)
    toast.success("Link copied")
  }

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-tt-primary-light">
        <svg
          className="h-10 w-10 text-tt-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-tt-text-primary">
        You&apos;re live!
      </h1>

      <div className="w-full rounded-lg bg-tt-surface p-4">
        <p className="text-lg font-medium text-tt-text-primary">
          timetap.it/{slug}
        </p>
      </div>

      <Button variant="outline" onClick={handleCopyLink}>
        Copy link
      </Button>

      <p className="text-sm text-tt-text-secondary">
        Share this link with your clients or add it to your Instagram bio
      </p>

      <Button
        onClick={() => router.push("/dashboard")}
        className="w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white"
      >
        Go to dashboard
      </Button>
    </div>
  )
}
