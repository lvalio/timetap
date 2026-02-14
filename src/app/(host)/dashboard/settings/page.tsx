import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const host = await hostService.findByAuthId(user.id)
  if (!host) {
    redirect("/auth/login")
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-semibold text-tt-text-primary">Settings</h1>
      <p className="mt-1 text-sm text-tt-text-muted">
        Manage your profile and integrations.
      </p>

      <div className="mt-6 max-w-[480px]">
        <h2 className="text-base font-medium text-tt-text-primary">Profile</h2>
        <div className="mt-4">
          <SettingsForm
            host={{
              id: host.id,
              name: host.name,
              description: host.description ?? "",
              slug: host.slug ?? "",
            }}
          />
        </div>

        <div className="mt-8 border-t border-tt-divider pt-6">
          <h2 className="text-base font-medium text-tt-text-primary">
            Integrations
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-tt-text-body">
                Google Calendar
              </span>
              {host.googleRefreshToken ? (
                <span className="text-sm text-tt-success">Connected</span>
              ) : (
                <span className="text-sm text-tt-text-muted">
                  Not connected
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-tt-text-body">Stripe</span>
              {host.stripeAccountId ? (
                <span className="text-sm text-tt-success">Connected</span>
              ) : (
                <a
                  href="/api/stripe/connect"
                  className="text-sm text-tt-text-muted hover:text-tt-primary underline"
                >
                  Not connected — Connect
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
