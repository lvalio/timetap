"use client"

import { useState, useEffect, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { updatePackageAction, deactivatePackageAction, listPackagesAction } from "../actions"
import { toast } from "sonner"

interface PackageData {
  id: string
  name: string
  sessionCount: number
  priceInCents: number
  isActive: boolean
}

export default function EditPackagePage() {
  const params = useParams<{ packageId: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pkg, setPkg] = useState<PackageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [name, setName] = useState("")
  const [sessionCount, setSessionCount] = useState("")
  const [price, setPrice] = useState("")

  useEffect(() => {
    startTransition(async () => {
      const result = await listPackagesAction()
      if (result.success) {
        const found = result.data.find((p) => p.id === params.packageId)
        if (found) {
          setPkg(found)
          setName(found.name)
          setSessionCount(String(found.sessionCount))
          setPrice(String(found.priceInCents / 100))
        }
      }
      setLoading(false)
    })
  }, [params.packageId])

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
      const result = await updatePackageAction(params.packageId, {
        name: name.trim(),
        sessionCount: sessions,
        priceInCents,
      })
      if (result.success) {
        toast.success("Package updated!")
        router.push("/dashboard/packages")
      } else {
        setError(result.error.message)
      }
    })
  }

  const handleDeactivate = () => {
    startTransition(async () => {
      const result = await deactivatePackageAction(params.packageId)
      if (result.success) {
        toast.success("Package deactivated")
        router.push("/dashboard/packages")
      } else {
        setError(result.error.message)
      }
    })
    setConfirmOpen(false)
  }

  if (loading) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-tt-text-muted">Loading package…</p>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-tt-error">Package not found.</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-semibold text-tt-text-primary">
        Edit Package
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <div>
          <Label htmlFor="name">Package name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>

      {pkg.isActive && (
        <div className="mt-8 max-w-md border-t border-tt-divider pt-6">
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full text-tt-error hover:bg-tt-error-light hover:text-tt-error">
                Deactivate Package
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deactivate {pkg.name}?</DialogTitle>
                <DialogDescription>
                  Customers won&apos;t be able to buy this package anymore.
                  Existing credits won&apos;t be affected.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                >
                  Keep active
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={isPending}
                >
                  {isPending ? "Deactivating…" : "Deactivate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
