"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Users, Package, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Packages", href: "/dashboard/packages", icon: Package },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const

export function BottomTabBar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <nav
      role="tablist"
      aria-label="Dashboard navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-tt-divider bg-tt-surface md:hidden"
    >
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2",
                active ? "text-tt-primary" : "text-tt-text-muted"
              )}
            >
              <tab.icon className="h-6 w-6" />
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
