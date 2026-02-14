"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  WeeklyHoursGrid,
  gridToHours,
} from "@/components/onboarding/weekly-hours-grid"
import { saveBookableHours } from "@/app/(host)/onboarding/actions"
import type { BookableHoursInput } from "@/lib/validations/host"

interface BookableHoursEditorProps {
  defaultValue: BookableHoursInput
}

export function BookableHoursEditor({
  defaultValue,
}: BookableHoursEditorProps) {
  const [hours, setHours] = useState<BookableHoursInput>(defaultValue)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveBookableHours(hours)
      if (result.success) {
        toast.success("Hours updated")
      } else {
        toast.error(result.error.message)
      }
    })
  }

  return (
    <div>
      <WeeklyHoursGrid defaultValue={defaultValue} onChange={setHours} />
      <Button
        onClick={handleSave}
        disabled={isPending}
        className="mt-4 bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90"
      >
        {isPending ? "Saving…" : "Save hours"}
      </Button>
    </div>
  )
}
