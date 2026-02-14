import { NextRequest, NextResponse } from "next/server"
import { hostService } from "@/services/host.service"
import { availabilityService } from "@/services/availability.service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const host = await hostService.findBySlugPublic(slug)
  if (!host) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const defaultTo = new Date(tomorrow)
  defaultTo.setDate(defaultTo.getDate() + 13) // 14 days total

  const result = await availabilityService.getAvailableSlots(host.id, {
    from: from ? new Date(from) : tomorrow,
    to: to ? new Date(to) : defaultTo,
  })

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}
