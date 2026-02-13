import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SidebarNav } from "./sidebar-nav"

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/dashboard"),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe("SidebarNav", () => {
  it("renders all 5 navigation items", () => {
    render(<SidebarNav slug="john" />)

    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Schedule")).toBeInTheDocument()
    expect(screen.getByText("Clients")).toBeInTheDocument()
    expect(screen.getByText("Packages")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()
  })

  it("renders TimeTap branding", () => {
    render(<SidebarNav slug="john" />)
    expect(screen.getByText("TimeTap")).toBeInTheDocument()
  })

  it("renders the host slug link when provided", () => {
    render(<SidebarNav slug="john" />)
    expect(screen.getByText("timetap.it/john")).toBeInTheDocument()
  })

  it("does not render slug card when slug is null", () => {
    render(<SidebarNav slug={null} />)
    expect(screen.queryByText(/timetap\.it\//)).not.toBeInTheDocument()
  })

  it("has navigation landmark", () => {
    const { container } = render(<SidebarNav slug="john" />)
    const nav = container.querySelector('nav[aria-label="Main navigation"]')
    expect(nav).toBeTruthy()
  })
})
