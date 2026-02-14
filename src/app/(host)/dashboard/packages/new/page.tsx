"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPackageAction } from "../actions"
import { toast } from "sonner"

export default function NewPackagePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [sessionCount, setSessionCount] = useState("")
  const [price, setPrice] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
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
      const result = await createPackageAction({
        name: name.trim(),
        sessionCount: sessions,
        priceInCents,
      })
      if (result.success) {
        toast.success("Package created!")
        router.push("/dashboard/packages")
      } else {
        setError(result.error.message)
      }
    })
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-semibold text-tt-text-primary">
        New Package
      </h1>
      <p className="mt-1 text-sm text-tt-text-secondary">
        Create a new package for your clients.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <div>
          <Label htmlFor="name">Package name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g., "5 Coaching Sessions"'
            maxLength={100}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sessions">Sessions</Label>
            <Input
              id="sessions"
              type="number"
              value={sessionCount}
              onChange={(e) => setSessionCount(e.target.value)}
              placeholder="1"
              min={1}
              max={100}
            />
          </div>
          <div>
            <Label htmlFor="price">Price (€)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="80.00"
              min={0}
              step="0.01"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-tt-error-light px-4 py-3 text-sm text-tt-error">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90"
        >
          {isPending ? "Creating…" : "Create Package"}
        </Button>
      </form>
    </div>
  )
}
