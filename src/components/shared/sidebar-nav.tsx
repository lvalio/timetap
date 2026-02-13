"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Users, Package, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Packages", href: "/dashboard/packages", icon: Package },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const

interface SidebarNavProps {
  slug: string | null
}

export function SidebarNav({ slug }: SidebarNavProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 left-0 hidden h-screen w-[240px] flex-col border-r border-tt-divider bg-tt-surface md:flex"
    >
      <div className="flex h-14 items-center px-5">
        <span className="text-lg font-semibold text-tt-text-primary">TimeTap</span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-tt-primary-light text-tt-primary"
                  : "text-tt-text-secondary hover:bg-tt-bg-subtle"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </div>

      {slug && (
        <div className="mx-3 mb-4 rounded-lg border border-tt-divider bg-tt-bg-subtle p-3">
          <p className="mb-1 text-xs text-tt-text-muted">Your link</p>
          <p className="truncate text-sm font-medium text-tt-text-primary">
            timetap.it/{slug}
          </p>
        </div>
      )}
    </nav>
  )
}
