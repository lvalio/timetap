import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div aria-busy="true">
      {/* Mobile gradient header skeleton */}
      <div className="bg-gradient-to-r from-[#4facfe] to-[#00f2fe] px-5 pb-5 pt-6 md:hidden">
        <Skeleton className="h-6 w-48 bg-white/20" />
        <Skeleton className="mt-2 h-4 w-32 bg-white/20" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-16 flex-1 rounded-xl bg-white/20" />
          <Skeleton className="h-16 flex-1 rounded-xl bg-white/20" />
          <Skeleton className="h-16 flex-1 rounded-xl bg-white/20" />
        </div>
      </div>

      {/* Desktop header skeleton */}
      <div className="hidden border-b border-tt-divider bg-tt-surface px-6 py-5 md:block">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>

      {/* Content skeleton */}
      <div className="px-6 py-8">
        <Skeleton className="mx-auto h-4 w-64" />
        <Skeleton className="mx-auto mt-4 h-4 w-40" />
        <Skeleton className="mx-auto mt-2 h-10 w-28" />
      </div>
    </div>
  )
}
