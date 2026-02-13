import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BottomTabBar } from "./bottom-tab-bar"

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/dashboard"),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe("BottomTabBar", () => {
  it("renders all 5 tabs", () => {
    render(<BottomTabBar />)

    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Schedule")).toBeInTheDocument()
    expect(screen.getByText("Clients")).toBeInTheDocument()
    expect(screen.getByText("Packages")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()
  })

  it("renders navigation with tablist role", () => {
    const { container } = render(<BottomTabBar />)
    const nav = container.querySelector('nav[role="tablist"]')
    expect(nav).toBeTruthy()
  })

  it("marks home tab as active on /dashboard", () => {
    const { container } = render(<BottomTabBar />)
    const homeLink = container.querySelector('a[href="/dashboard"]')
    expect(homeLink).toHaveAttribute("aria-selected", "true")
  })

  it("marks other tabs as inactive on /dashboard", () => {
    const { container } = render(<BottomTabBar />)
    const scheduleLink = container.querySelector('a[href="/dashboard/schedule"]')
    expect(scheduleLink).toHaveAttribute("aria-selected", "false")
  })
})
