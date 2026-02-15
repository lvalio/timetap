import { Skeleton } from "@/components/ui/skeleton"

export default function BookingLoading() {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-8">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-5 w-32 mb-8" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[44px] w-[72px] rounded-full" />
        ))}
      </div>
      <div className="space-y-3.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[44px] w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
