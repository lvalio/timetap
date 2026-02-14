import { Skeleton } from "@/components/ui/skeleton"

export default function PublicHostPageLoading() {
  return (
    <>
      <section className="bg-gradient-to-r from-[#4facfe] to-[#00f2fe] px-4 py-12">
        <div className="mx-auto max-w-[640px] text-center">
          <Skeleton className="mx-auto h-20 w-20 rounded-full bg-white/20" />
          <Skeleton className="mx-auto mt-4 h-8 w-48 bg-white/20" />
          <Skeleton className="mx-auto mt-2 h-5 w-72 bg-white/20" />
        </div>
      </section>

      <main className="mx-auto max-w-[640px] px-4 py-8">
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="mb-6 h-36 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </main>
    </>
  )
}
