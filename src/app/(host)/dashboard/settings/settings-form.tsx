"use client"

import { useTransition, useState } from "react"
import { ProfileForm } from "@/components/onboarding/profile-form"
import { updateHostProfile } from "./actions"
import { toast } from "sonner"
import type { UpdateProfileInput } from "@/lib/validations/host"

interface SettingsFormProps {
  host: {
    id: string
    name: string
    description: string
    slug: string
  }
}

export function SettingsForm({ host }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: UpdateProfileInput) => {
    setError(null)
    startTransition(async () => {
      const result = await updateHostProfile(data)
      if (result.success) {
        toast.success("Profile updated")
      } else {
        setError(result.error.message)
      }
    })
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-tt-error-light px-4 py-3 text-sm text-tt-error">
          {error}
        </div>
      )}
      <ProfileForm
        defaultValues={{
          name: host.name,
          description: host.description,
          slug: host.slug,
        }}
        hostId={host.id}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        isPending={isPending}
      />
    </div>
  )
}
