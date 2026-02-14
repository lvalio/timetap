"use client"

import { useState, useTransition } from "react"
import { Check, Package, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPackage } from "@/app/(host)/onboarding/actions"

interface PackageItem {
  id: string
  name: string
  sessionCount: number
  priceInCents: number
  isFreeIntro: boolean
}

function formatPrice(priceInCents: number): string {
  if (priceInCents === 0) return "Free"
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(priceInCents / 100)
}

interface PackageStepProps {
  onComplete: () => void
  hostId: string
}

export function PackageStep({ onComplete, hostId }: PackageStepProps) {
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [freeIntroCreated, setFreeIntroCreated] = useState(false)

  // Paid package form state
  const [name, setName] = useState("")
  const [sessionCount, setSessionCount] = useState("")
  const [price, setPrice] = useState("")

  const handleFreeIntroCreate = () => {
    setError(null)
    startTransition(async () => {
      const result = await createPackage({
        name: "Free Intro Call",
        sessionCount: 1,
        priceInCents: 0,
      })
      if (result.success) {
        setPackages((prev) => [
          ...prev,
          {
            id: result.data.id,
            name: result.data.name,
            sessionCount: result.data.sessionCount,
            priceInCents: result.data.priceInCents,
            isFreeIntro: true,
          },
        ])
        setFreeIntroCreated(true)
      } else {
        setError(result.error.message)
      }
    })
  }

  const handlePaidPackageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const sessions = parseInt(sessionCount, 10)
    const priceInCents = Math.round(parseFloat(price) * 100)

    if (!name.trim()) {
      setError("Package name is required")
      return
    }
    if (isNaN(sessions) || sessions < 1) {
      setError("Session count must be at least 1")
      return
    }
    if (isNaN(priceInCents) || priceInCents < 0) {
      setError("Please enter a valid price")
      return
    }

    startTransition(async () => {
      const result = await createPackage({
        name: name.trim(),
        sessionCount: sessions,
        priceInCents,
      })
      if (result.success) {
        setPackages((prev) => [
          ...prev,
          {
            id: result.data.id,
            name: result.data.name,
            sessionCount: result.data.sessionCount,
            priceInCents: result.data.priceInCents,
            isFreeIntro: false,
          },
        ])
        setName("")
        setSessionCount("")
        setPrice("")
      } else {
        setError(result.error.message)
      }
    })
  }

  const handleRemovePackage = (id: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== id))
    if (packages.find((p) => p.id === id)?.isFreeIntro) {
      setFreeIntroCreated(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Section A: Free Intro Call */}
      <div className="rounded-lg border border-tt-divider bg-tt-surface p-4">
        {freeIntroCreated ? (
          <div className="flex items-center gap-2 text-tt-success">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">
              Free Intro Call created!
            </span>
          </div>
        ) : (
          <>
            <h2 className="text-base font-medium text-tt-text-primary">
              Offer a free intro call
            </h2>
            <p className="mt-1 text-sm text-tt-text-secondary">
              Let potential clients meet you before committing. This is a great
              way to build trust.
            </p>
            <Button
              onClick={handleFreeIntroCreate}
              disabled={isPending}
              className="mt-4 w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90"
            >
              <Package className="mr-2 h-4 w-4" />
              {isPending ? "Creating…" : "Free Intro Call"}
            </Button>
          </>
        )}
      </div>

      {/* Section B: Paid Package Form */}
      <div className="mt-6">
        <h2 className="text-base font-medium text-tt-text-primary">
          Or create a paid package
        </h2>
        <form onSubmit={handlePaidPackageSubmit} className="mt-3 space-y-4">
          <div>
            <Label htmlFor="package-name">Package name</Label>
            <Input
              id="package-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., "5 Coaching Sessions"'
              maxLength={100}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session-count">Sessions</Label>
              <Input
                id="session-count"
                type="number"
                value={sessionCount}
                onChange={(e) => setSessionCount(e.target.value)}
                placeholder="1"
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label htmlFor="package-price">Price (€)</Label>
              <Input
                id="package-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="80.00"
                min={0}
                step="0.01"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isPending}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isPending ? "Adding…" : "Add package"}
          </Button>
        </form>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-tt-error-light px-4 py-3 text-sm text-tt-error">
          {error}
        </div>
      )}

      {/* Package List */}
      {packages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-tt-text-secondary">
            Your packages
          </h3>
          <ul className="mt-2 space-y-2">
            {packages.map((pkg) => (
              <li
                key={pkg.id}
                className="flex items-center justify-between rounded-md border border-tt-divider px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-tt-text-primary">
                    {pkg.name}
                  </span>
                  <span className="ml-2 text-xs text-tt-text-muted">
                    {pkg.sessionCount} session{pkg.sessionCount > 1 ? "s" : ""}{" "}
                    · {formatPrice(pkg.priceInCents)}
                  </span>
                </div>
                <button
                  onClick={() => handleRemovePackage(pkg.id)}
                  className="text-tt-text-muted hover:text-tt-error"
                  aria-label={`Remove ${pkg.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue Button */}
      <Button
        onClick={onComplete}
        disabled={packages.length === 0}
        className="mt-6 w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90 disabled:opacity-50"
      >
        Continue
      </Button>
    </div>
  )
}
