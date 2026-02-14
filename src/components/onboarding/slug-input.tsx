"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, Check } from "lucide-react"
import { checkSlugAvailability } from "@/app/(host)/onboarding/actions"
import { cn } from "@/lib/utils"

type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken"; suggestion: string }
  | { state: "error"; message: string }

interface SlugInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  excludeHostId?: string
  error?: string
}

export function SlugInput({
  value,
  onChange,
  onBlur,
  excludeHostId,
  error,
}: SlugInputProps) {
  const [status, setStatus] = useState<SlugStatus>({ state: "idle" })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCheckedRef = useRef<string>("")

  const checkSlug = useCallback(
    async (slug: string) => {
      if (slug.length < 3) {
        setStatus({ state: "idle" })
        return
      }

      setStatus({ state: "checking" })
      const result = await checkSlugAvailability(slug, excludeHostId)
      if (!result.success) {
        setStatus({ state: "error", message: result.error.message })
        return
      }

      if (result.data.available) {
        setStatus({ state: "available" })
      } else {
        setStatus({
          state: "taken",
          suggestion: result.data.suggestion ?? slug,
        })
      }
      lastCheckedRef.current = slug
    },
    [excludeHostId]
  )

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!value || value.length < 3 || value === lastCheckedRef.current) {
      if (!value || value.length < 3) {
        setStatus({ state: "idle" })
      }
      return
    }

    debounceRef.current = setTimeout(() => {
      checkSlug(value)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, checkSlug])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    onChange(raw)
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
  }

  return (
    <div>
      <div className="flex">
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-tt-bg-subtle px-3 text-base text-tt-text-muted">
          timetap.it/
        </span>
        <Input
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          className="rounded-l-none"
          placeholder="your-slug"
          aria-label="Public URL slug"
          aria-invalid={!!error || status.state === "taken"}
        />
      </div>

      {/* Status indicator */}
      <div className="mt-1.5 min-h-[20px] text-sm">
        {status.state === "checking" && (
          <span className="flex items-center gap-1 text-tt-text-muted">
            <Loader2 className="size-3.5 animate-spin" />
            Checking...
          </span>
        )}
        {status.state === "available" && (
          <span className="flex items-center gap-1 text-tt-success">
            <Check className="size-3.5" />
            Available!
          </span>
        )}
        {status.state === "taken" && (
          <span className="text-tt-error">
            Taken — try{" "}
            <button
              type="button"
              onClick={() => handleSuggestionClick(status.suggestion)}
              className="underline hover:no-underline"
            >
              {status.suggestion}
            </button>
            ?
          </span>
        )}
        {status.state === "error" && (
          <span className="text-tt-error">{status.message}</span>
        )}
        {error && status.state === "idle" && (
          <span className="text-tt-error">{error}</span>
        )}
      </div>
    </div>
  )
}
