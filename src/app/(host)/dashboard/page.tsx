import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"
import { redirect } from "next/navigation"
import { GradientHeader } from "@/components/dashboard/gradient-header"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const host = await hostService.findByAuthId(user.id)
  if (!host) redirect("/auth/login")

  const firstName = host.name.split(" ")[0]

  return (
    <>
      <GradientHeader name={firstName} />

      <header className="hidden border-b border-tt-divider bg-tt-surface px-6 py-5 md:block">
        <h1 className="text-xl font-semibold text-tt-text-primary">Home</h1>
        <p className="mt-0.5 text-sm text-tt-text-muted">
          Welcome back, {firstName}
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-tt-text-secondary">
          Waiting for your first booking. Share your link to get started.
        </p>
        {host.slug && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-tt-text-primary">
              timetap.it/{host.slug}
            </p>
            <CopyLinkButton slug={host.slug} />
          </div>
        )}
      </div>
    </>
  )
}

function CopyLinkButton({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      className="min-h-[44px] rounded-lg border border-tt-border px-4 py-2 text-sm font-medium text-tt-text-secondary transition-colors hover:bg-tt-bg-subtle"
      data-copy-link={`timetap.it/${slug}`}
    >
      Copy link
    </button>
  )
}
