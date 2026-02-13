# Story 1.3: Route Protection & Dashboard Shell

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a host,
I want my dashboard protected from unauthorized access and to see a welcoming home screen after signing in,
So that my data is secure and I know where to start.

## Acceptance Criteria

1. **Given** an unauthenticated visitor accessing any `/dashboard/*` route, **When** the Next.js proxy intercepts the request, **Then** they are redirected to `/auth/login`.

2. **Given** an unauthenticated visitor accessing a public route (`/`, `/{slug}`), **When** the proxy intercepts the request, **Then** access is allowed without authentication.

3. **Given** an unauthenticated visitor accessing `/workspace/*` routes, **When** the proxy intercepts the request, **Then** they are redirected to `/auth/magic-link`.

4. **Given** an authenticated host visiting `/dashboard`, **When** the page loads on mobile (< 768px), **Then** they see the gradient header component with greeting ("Good morning, {name}") and current date, **And** they see the bottom tab bar with 5 tabs: Home, Schedule, Clients, Packages, Settings, **And** the Home tab is active with `primary` color, **And** the main content area shows an empty state: "Waiting for your first booking. Share your link to get started."

5. **Given** an authenticated host visiting `/dashboard` on desktop (>= 768px), **When** the page loads, **Then** they see the sidebar navigation (240px) with TimeTap logo, navigation items (Home, Schedule, Clients, Packages, Settings), and "Your link" card at the bottom showing `timetap.it/{slug}`, **And** the gradient header is not visible (desktop uses page header instead), **And** the content area shows the same empty state.

6. **Given** any dashboard page, **When** rendered, **Then** skeleton loading states are shown while data loads, **And** all interactive elements meet 44px minimum touch target, **And** WCAG 2.1 AA compliance: keyboard navigable, proper heading hierarchy, semantic HTML (nav, main, header elements).

## Tasks / Subtasks

- [x] Task 1: Implement Supabase session refresh in proxy (AC: #1, #2, #3)
  - [x] 1.1 Update `src/lib/supabase/middleware.ts` with `updateSession()` function that creates a Supabase server client, calls `supabase.auth.getUser()` to refresh tokens, and syncs cookies to request/response
  - [x] 1.2 Add route protection logic: redirect `/dashboard/*` to `/auth/login` if no session, redirect `/workspace/*` to `/auth/magic-link` if no session, allow public routes through
  - [x] 1.3 Update `src/proxy.ts` to use the `updateSession` export with proper matcher config (exclude static files, images, favicon)
- [x] Task 2: Create host dashboard layout with responsive navigation (AC: #4, #5, #6)
  - [x] 2.1 Install required shadcn/ui components: `pnpm dlx shadcn@latest add button card avatar badge skeleton separator`
  - [x] 2.2 Create `src/app/(host)/layout.tsx` — server component that verifies host session via `supabase.auth.getUser()`, fetches host record from `hostService.findByAuthId()`, redirects to `/auth/login` if not authenticated
  - [x] 2.3 Create `src/components/shared/bottom-tab-bar.tsx` — client component with 5 tabs (Home, Schedule, Clients, Packages, Settings), uses `usePathname()` for active state, lucide-react icons, `primary` color for active tab, `text-muted` for inactive, fixed bottom on mobile, hidden on desktop (`md:hidden`)
  - [x] 2.4 Create `src/components/shared/sidebar-nav.tsx` — client component with TimeTap logo, 5 nav items matching tab bar, active state with `primary-light` bg and `primary` text, "Your link" card at bottom showing `timetap.it/{slug}`, 240px fixed width, hidden on mobile (`hidden md:flex`)
  - [x] 2.5 Wire layout.tsx to render sidebar (desktop) + bottom tab bar (mobile) + `<main>` content area with proper semantic HTML (`<nav>`, `<main>`, `<header>`)
- [x] Task 3: Create gradient header component (AC: #4, #6)
  - [x] 3.1 Create `src/components/dashboard/gradient-header.tsx` — server component with gradient background (`bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`), greeting based on time of day ("Good morning/afternoon/evening, {name}"), current date formatted, and stats pills row
  - [x] 3.2 Stats pills show: sessions today count, active clients count, new bookings count — all zeros for empty state
  - [x] 3.3 Visible only on mobile (`md:hidden`), role="status" for screen readers
- [x] Task 4: Create dashboard home page with empty state (AC: #4, #5, #6)
  - [x] 4.1 Create `src/app/(host)/dashboard/page.tsx` — server component that fetches host data and renders gradient header (mobile) + content area
  - [x] 4.2 Create empty state component with message: "Waiting for your first booking. Share your link to get started." with `timetap.it/{slug}` link display and "Copy link" button
  - [x] 4.3 Create `src/app/(host)/dashboard/loading.tsx` with skeleton loading states matching the layout (skeleton header, skeleton content cards)
  - [x] 4.4 Add desktop page header (visible `hidden md:block`) with page title "Home" and host greeting
- [x] Task 5: Create placeholder pages for other dashboard tabs (AC: #5)
  - [x] 5.1 Create `src/app/(host)/dashboard/schedule/page.tsx` with "Schedule" heading and placeholder content
  - [x] 5.2 Create `src/app/(host)/dashboard/clients/page.tsx` with "Clients" heading and placeholder content
  - [x] 5.3 Create `src/app/(host)/dashboard/packages/page.tsx` with "Packages" heading and placeholder content
  - [x] 5.4 Create `src/app/(host)/dashboard/settings/page.tsx` with "Settings" heading and placeholder content

## Dev Notes

### Architecture Patterns & Constraints

**Route Protection Strategy (proxy.ts + layout.tsx — two layers):**

Layer 1 — `src/proxy.ts` (runs on every request):
- Refreshes Supabase auth tokens via cookie management
- Redirects unauthenticated users based on route zone
- Does NOT verify host/customer role — only checks for valid Supabase session

Layer 2 — `src/app/(host)/layout.tsx` (server component):
- Verifies the user has a host record in the database
- Redirects to `/auth/login` if no host record found
- Passes host data to children via props or context

This two-layer approach is specified in the Architecture doc (Authentication Boundary section).

**Proxy.ts Implementation Pattern (Next.js 16):**

```typescript
// src/proxy.ts
import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

**Supabase Session Refresh Pattern (updateSession):**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser() not getSession() — getUser() validates the token
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection logic
  const { pathname } = request.nextUrl

  if (!user) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith("/workspace")) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/magic-link"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
```

**CRITICAL: Use `getUser()` not `getSession()`** — Supabase docs explicitly state: "Always use `supabase.auth.getUser()` to protect pages. Never trust `supabase.auth.getSession()` inside server code such as Proxy. It isn't guaranteed to revalidate the Auth token."

**Host Layout Pattern (Second Auth Layer):**

```typescript
// src/app/(host)/layout.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const host = await hostService.findByAuthId(user.id)
  if (!host) {
    redirect("/auth/login")
  }

  // Check onboarding
  if (!host.onboardingCompleted && !/* already on onboarding */) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-tt-bg-page">
      {/* Sidebar - desktop only */}
      <SidebarNav host={host} />
      {/* Main content */}
      <main className="md:ml-[240px]">
        {children}
      </main>
      {/* Bottom tab bar - mobile only */}
      <BottomTabBar />
    </div>
  )
}
```

### Critical Implementation Details

**Responsive Layout Architecture:**
- Mobile (< 768px): gradient header + single column + bottom tab bar (56px height, fixed bottom)
- Desktop (>= 768px): sidebar (240px fixed left) + content area (fluid) + no gradient header (page header instead)
- Breakpoint: Tailwind `md:` prefix = 768px — mobile-first approach
- Bottom tab bar: `fixed bottom-0 left-0 right-0` with `z-50`, surface background, top divider border
- Sidebar: `fixed top-0 left-0 h-screen w-[240px]` with surface background, right divider border
- Content area: `pb-16 md:pb-0 md:ml-[240px]` (padding-bottom for tab bar on mobile, margin-left for sidebar on desktop)

**Gradient Header Specs (from UX spec):**
- Full-width gradient: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`
- Row 1: Greeting + date (white text)
- Row 2: 3 stats pills — rounded containers with number + label
- Greeting logic: "Good morning" (5-12), "Good afternoon" (12-17), "Good evening" (17+)
- Date format: "Thursday, February 14" — use `Intl.DateTimeFormat`
- Mobile only: `md:hidden`
- `role="status"` for accessibility

**Bottom Tab Bar Specs (from UX spec, Custom Component #6):**
- 5 tabs: Home, Schedule, Clients, Packages, Settings
- Icons from lucide-react: `Home`, `Calendar`, `Users`, `Package`, `Settings`
- Each tab: icon (24x24) + label (10px)
- Active: `tt-primary` color icon + label, `tt-primary-light` icon background
- Inactive: `tt-text-muted` color
- Fixed bottom, surface background, top divider border
- `role="tablist"`, each tab `role="tab"` with `aria-selected`
- Tab bar height: ~56px (icon + label + padding)

**Sidebar Specs (from UX spec, Custom Component #7):**
- 240px fixed width, surface background, right divider border
- Top: TimeTap logo (icon + wordmark) — use logo files from `public/logo/`
- Nav items: icon + label, 6px border radius, full-width, 44px min height
- Active: `tt-primary-light` background, `tt-primary` text
- Inactive: `tt-text-secondary`, hover shows `tt-bg-subtle`
- Bottom: "Your link" card showing `timetap.it/{slug}` with copy action
- `hidden md:flex md:flex-col` for responsive visibility

**Empty State Pattern (from UX spec):**
- Message: "Waiting for your first booking. Share your link to get started."
- Show `timetap.it/{slug}` as a visible, copyable link
- "Copy link" button (secondary style)
- `text-secondary` color, centered, generous padding
- No icon — text only per UX spec empty state pattern

**Color Tokens (CRITICAL — from Story 1.1):**
- All TimeTap colors are prefixed `tt-` to avoid shadcn conflicts
- Use `text-tt-primary` NOT `text-primary` (shadcn owns `primary`)
- Use `bg-tt-primary-light` NOT `bg-primary-light`
- Use `text-tt-text-body` for body text, `text-tt-text-muted` for muted
- Gradient buttons: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]` (hardcoded, not tokens)

**Skeleton Loading Pattern (from UX spec):**
- Use shadcn Skeleton component matching expected content layout
- Show 3 skeleton rows for lists
- Skip skeleton if data loads < 200ms (no flash)
- `aria-busy="true"` on parent container

**Semantic HTML Requirements (from UX spec, WCAG 2.1 AA):**
- `<nav>` for tab bar and sidebar
- `<main>` for content area
- `<header>` for gradient header and page headers
- Proper heading hierarchy: h1 per page, h2 for sections
- All interactive elements: 44px minimum touch target
- `<button>` for actions, `<a>` for navigation (via Next.js `Link`)
- Focus indicators: `tt-primary` color ring (2px)

### Previous Story Intelligence

**From Story 1.1:**
- Color tokens use `tt-` prefix throughout — MUST continue this pattern
- Tailwind v4 CSS-first config in globals.css with `@theme inline` block
- shadcn/ui initialized with new-york style
- Directory structure: `(host)/dashboard/`, `(customer)/workspace/`, `(public)/` route groups already exist as .gitkeep placeholders
- `cn()` utility in `src/lib/utils.ts` for conditional classes
- `ActionResult<T>` type in `src/types/actions.ts`

**From Story 1.2:**
- `src/lib/supabase/server.ts` — server Supabase client already implemented with cookie handling
- `src/lib/supabase/client.ts` — browser client already implemented
- `src/lib/supabase/middleware.ts` — stub exists, exports `proxy` function (needs full implementation)
- `src/proxy.ts` — re-exports from middleware.ts (needs matcher config added)
- `src/services/host.service.ts` — has `findByAuthId(authId)` and `createFromAuth()` methods
- `src/lib/prisma.ts` — Prisma client singleton already exists
- Login page at `/auth/login` — already functional with Google OAuth
- Sign-out action in `/auth/actions.ts` — already implemented
- Prisma import: `@/generated/prisma/client` (NOT `@/generated/prisma`)

**Debug Learnings from Previous Stories:**
- Prisma 7.4.0: import from `@/generated/prisma/client` — confirmed working
- `@supabase/ssr` 0.8.x: PKCE flow default, cookies auto-managed
- Next.js 16.1.6: `proxy.ts` replaces `middleware.ts` — function named `proxy` not `middleware`
- Color tokens: `tt-` prefix avoids shadcn conflicts — verified in Story 1.1
- Tests use Vitest + testing-library — already configured in `vitest.config.ts`

### Git Intelligence

**Recent commits (most recent first):**
1. `00495b5` — "started to set up APIs and services" (Story 1.2 work)
2. `3d696b7` — "1.1 — Project Initialization & Database Foundation"
3. `bb46d4a` — "ready to start"
4. `973b2c0` — "until ux done"

**Patterns from Story 1.2 implementation:**
- Files created: login page, auth actions, callback route, host service, prisma singleton, vitest config
- Service pattern: `hostService` as a plain object with methods, using Prisma client singleton
- Auth actions: `"use server"` directive, returns `ActionResult<T>`, uses `createClient()` from supabase/server
- Test approach: vitest + testing-library, mock supabase and prisma, co-located test files

### Version-Specific Notes

| Package | Version | Story 1.3 Relevance |
|---|---|---|
| Next.js | 16.1.6 | `proxy.ts` (not middleware.ts), `proxy` function (not `middleware`), Node.js runtime (not Edge) |
| @supabase/ssr | 0.8.x | `createServerClient` for proxy, `getUser()` for token validation |
| lucide-react | installed | Icons for tab bar and sidebar nav items |
| Tailwind CSS | v4.1.x | `md:` prefix for 768px breakpoint, mobile-first approach |
| Prisma | 7.4.0 | Import from `@/generated/prisma/client` |

### Project Structure Notes

**Files to create:**
- `src/lib/supabase/middleware.ts` — REPLACE existing stub with full `updateSession` implementation
- `src/proxy.ts` — REPLACE existing re-export with full proxy + matcher config
- `src/app/(host)/layout.tsx` — NEW: host layout with auth check + responsive shell
- `src/app/(host)/dashboard/page.tsx` — NEW: dashboard home page
- `src/app/(host)/dashboard/loading.tsx` — NEW: skeleton loading state
- `src/app/(host)/dashboard/schedule/page.tsx` — NEW: placeholder
- `src/app/(host)/dashboard/clients/page.tsx` — NEW: placeholder
- `src/app/(host)/dashboard/packages/page.tsx` — NEW: placeholder
- `src/app/(host)/dashboard/settings/page.tsx` — NEW: placeholder
- `src/components/dashboard/gradient-header.tsx` — NEW: mobile gradient header
- `src/components/shared/bottom-tab-bar.tsx` — NEW: mobile navigation
- `src/components/shared/sidebar-nav.tsx` — NEW: desktop navigation

**Files to modify:**
- `src/lib/supabase/middleware.ts` — full rewrite from stub
- `src/proxy.ts` — add matcher config, update export

**Existing files to use (do not modify):**
- `src/lib/supabase/server.ts` — server Supabase client (already works)
- `src/lib/supabase/client.ts` — browser Supabase client (already works)
- `src/services/host.service.ts` — `findByAuthId()` already implemented
- `src/lib/prisma.ts` — Prisma singleton already exists
- `src/app/auth/login/page.tsx` — login page already functional

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Route Protection]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Gradient Header]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Bottom Tab Bar]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Sidebar Navigation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty & Loading States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Strategy]
- [Source: _bmad-output/implementation-artifacts/1-1-project-initialization-and-database-foundation.md]
- [Source: _bmad-output/implementation-artifacts/1-2-host-google-oauth-sign-in-and-sign-out.md]
- [Source: Next.js 16 proxy.ts API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Source: Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Test cleanup issue: `@testing-library/react` cleanup not auto-running with Vitest 4 — added explicit `afterEach(cleanup)` to `src/test/setup.ts`

### Completion Notes List

- Task 1: Implemented full `updateSession()` in `middleware.ts` with Supabase session refresh, cookie syncing, and route protection logic. Updated `proxy.ts` with matcher config. 10 unit tests covering all route zones (public, dashboard, workspace, onboarding, auth, api).
- Task 2: Created responsive host layout with two-layer auth (proxy + layout), sidebar navigation (desktop 240px), and bottom tab bar (mobile). 9 unit tests across components.
- Task 3: Created gradient header with time-of-day greeting, formatted date, and 3 stat pills (all zeros for empty state). Mobile-only with `role="status"`. 3 unit tests.
- Task 4: Created dashboard home page with gradient header (mobile) + desktop page header + empty state with copy link button. Skeleton loading state for suspense boundaries.
- Task 5: Created 4 placeholder pages (Schedule, Clients, Packages, Settings) with consistent heading + muted placeholder text.
- All 39 tests pass (0 regressions). ESLint clean.

### Change Log

- 2026-02-14: Story 1.3 implementation complete — route protection, dashboard shell with responsive layout, gradient header, empty state, placeholder pages

### File List

**New files:**
- src/lib/supabase/middleware.test.ts
- src/app/(host)/layout.tsx
- src/app/(host)/dashboard/page.tsx
- src/app/(host)/dashboard/loading.tsx
- src/app/(host)/dashboard/schedule/page.tsx
- src/app/(host)/dashboard/clients/page.tsx
- src/app/(host)/dashboard/packages/page.tsx
- src/app/(host)/dashboard/settings/page.tsx
- src/components/shared/bottom-tab-bar.tsx
- src/components/shared/bottom-tab-bar.test.tsx
- src/components/shared/sidebar-nav.tsx
- src/components/shared/sidebar-nav.test.tsx
- src/components/dashboard/gradient-header.tsx
- src/components/dashboard/gradient-header.test.tsx
- src/components/ui/button.tsx
- src/components/ui/card.tsx
- src/components/ui/avatar.tsx
- src/components/ui/badge.tsx
- src/components/ui/skeleton.tsx
- src/components/ui/separator.tsx

**Modified files:**
- src/lib/supabase/middleware.ts (full rewrite from stub)
- src/proxy.ts (added matcher config, updated export)
- src/test/setup.ts (added cleanup)
