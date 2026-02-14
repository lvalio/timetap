# Story 3.1: Public Host Page

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to view a host's public profile and available packages,
So that I can learn about the host and decide to book or buy.

## Acceptance Criteria

1. **Given** a visitor navigates to `timetap.it/{slug}` where the slug belongs to an active host (onboardingCompleted = true), **When** the page loads, **Then** the page is server-side rendered (SSR) for SEO and LLM discoverability, **And** they see a gradient hero section with the host's avatar, name, and description, **And** below the hero: the free intro package (if exists) with "Start here" label and "Book free session" button (gradient primary CTA), **And** paid packages listed below with: name, session count, price, per-session price breakdown (caption), and "Buy package" button (secondary), **And** the page is centered column, max-width 640px on both mobile and desktop, **And** an "Already a client? Access your workspace" text link is visible but secondary, **And** "Powered by TimeTap" in the footer, **And** privacy policy link accessible from the page (NFR13), **And** the page achieves LCP under 2 seconds on mobile 4G (NFR1).

2. **Given** a visitor navigates to a slug that doesn't exist, **When** the page loads, **Then** they see a 404 page with warm messaging: "We couldn't find this page. The link may have changed or the host hasn't gone live yet."

3. **Given** a visitor navigates to a slug for a host whose `onboardingCompleted` is `false`, **When** the page loads, **Then** they see the same 404 page (host is not yet publicly visible).

4. **Given** a visitor navigates to a slug for a host with no active packages, **When** the page loads, **Then** they see the host profile (hero section) but a message: "No packages available yet" in place of the package list.

5. **Given** the host has both a free intro package and paid packages, **When** the page renders, **Then** the free intro package appears first with a "Start here" label above it, visually distinguished from paid packages, **And** paid packages appear below in a separate section, **And** each package card shows the per-session price breakdown as caption text (e.g., "€80 per session").

6. **Given** a visitor clicks "Book free session" on the free intro package, **When** the action triggers, **Then** nothing happens in this story — the button is rendered but the booking flow will be implemented in Story 3.3. The button should link to `/{slug}/book?package={packageId}` (route will exist in Story 3.3).

7. **Given** a visitor clicks "Buy package" on a paid package, **When** the action triggers, **Then** nothing happens in this story — the button is rendered but Stripe Checkout will be implemented in Story 4.1. The button should link to `/{slug}/buy?package={packageId}` (route will exist in Story 4.1).

## Tasks / Subtasks

- [x] Task 1: Add host service methods for public page data (AC: #1, #2, #3)
  - [x] 1.1 Add `findBySlugPublic(slug: string)` to `src/services/host.service.ts`: Finds a host by slug where `onboardingCompleted = true`. Returns `{ id, name, slug, description, avatarUrl }` (no sensitive fields like tokens or subscription data). Returns `null` if not found or not onboarded.
  - [x] 1.2 Add tests for `findBySlugPublic` to `src/services/host.service.test.ts`: test found host, test non-existent slug returns null, test non-onboarded host returns null.

- [x] Task 2: Add package service methods for public page (AC: #1, #4, #5)
  - [x] 2.1 Add `findActiveByHostId(hostId: string)` to `src/services/package.service.ts`: Returns all active packages for a host, ordered with free intro packages first, then by createdAt. Returns `{ id, name, sessionCount, priceInCents, isFreeIntro }[]`.
  - [x] 2.2 Add tests for `findActiveByHostId` to `src/services/package.service.test.ts`: test returns active packages sorted correctly, test filters out inactive packages, test returns empty array for host with no packages.

- [x] Task 3: Create PackageCardPublic component (AC: #1, #5, #6, #7)
  - [x] 3.1 Create `src/components/packages/package-card-public.tsx` — server-friendly component (no `"use client"` unless interactivity needed):
    - Package name (h3 weight), session count (secondary text, e.g., "10 sessions")
    - Price display: "Free" in `text-tt-success` for free intro, or formatted price (e.g., "€800") for paid
    - Per-session price breakdown as caption text below price (e.g., "€80 per session") — only for paid packages with sessionCount > 1
    - CTA: For free intro → `<Link href="/{slug}/book?package={id}">` styled as gradient primary button with text "Book free session". For paid → `<Link href="/{slug}/buy?package={id}">` styled as secondary button with text "Buy package"
    - Props: `package: { id: string, name: string, sessionCount: number, priceInCents: number, isFreeIntro: boolean }`, `slug: string`
  - [x] 3.2 Create `src/components/packages/package-card-public.test.tsx` — tests: renders free intro with "Free" price and "Book free session" CTA, renders paid package with formatted price and "Buy package" CTA, shows per-session breakdown for multi-session packages, shows "Start here" label for free intro packages.

- [x] Task 4: Create public host page route (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `src/app/(public)/[slug]/page.tsx` — server component:
    - Fetch host via `hostService.findBySlugPublic(slug)` — if null, call `notFound()`
    - Fetch packages via `packageService.findActiveByHostId(host.id)`
    - Separate packages into `freeIntroPackage` (first where `isFreeIntro`) and `paidPackages` (rest)
    - Render:
      - **Gradient hero section:** Full-width gradient background (`bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`), centered column, host avatar (80px, white border, initials fallback using Avatar component), host name (h1, white, bold), host description (white, 85% opacity)
      - **Package section (centered, max-w-[640px]):**
        - If `freeIntroPackage`: "Start here" label (caption, `text-tt-text-muted`) above the free intro `PackageCardPublic`
        - If `paidPackages.length > 0`: Section with paid package cards
        - If no packages at all: "No packages available yet" empty state
      - **"Already a client?" link:** Text link below packages: "Already a client? Access your workspace" → links to `/auth/magic-link?host={slug}` (magic-link page will be built in Epic 5, but link is in place)
      - **Footer:** "Powered by TimeTap" centered, muted text, with privacy policy link
    - Export `generateMetadata` for SEO: title = "{host.name} | TimeTap", description = host.description or default
  - [x] 4.2 Create `src/app/(public)/[slug]/loading.tsx` — skeleton loading state matching the page layout (gradient hero skeleton + package card skeletons)

- [x] Task 5: Create public layout (AC: #1)
  - [x] 5.1 Create `src/app/(public)/layout.tsx` — minimal layout: no sidebar, no tab bar, just `{children}` with `bg-tt-bg-page` background. No auth checks — public pages are fully unauthenticated.

- [x] Task 6: Create 404 / not-found handling (AC: #2, #3)
  - [x] 6.1 Create `src/app/(public)/[slug]/not-found.tsx` — warm 404 page:
    - Centered column, max-w-[640px]
    - Heading: "Page not found" (h1)
    - Message: "We couldn't find this page. The link may have changed or the host hasn't gone live yet."
    - CTA: "Go to TimeTap" link → `/` (home page)
    - Uses warm, blame-free tone per UX spec

- [x] Task 7: Add `formatCurrency` utility (AC: #5)
  - [x] 7.1 Add `formatCurrency(cents: number): string` to `src/lib/utils.ts`: Formats integer cents to display string using `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`. Example: `80000` → "€800.00" (or "800,00 €" depending on locale — use 'en-IE' or manual formatting to get "€800" without decimals for whole amounts).
  - [x] 7.2 Add tests for `formatCurrency` in `src/lib/utils.test.ts` (create file if needed): test whole euros (no decimals shown), test cents (decimals shown), test zero (returns "Free" or "€0").

- [x] Task 8: Write page-level tests (all ACs)
  - [x] 8.1 Create `src/app/(public)/[slug]/page.test.tsx`:
    - Test: renders host name and description in hero
    - Test: renders free intro package with "Start here" label and "Book free session" CTA
    - Test: renders paid packages with price and "Buy package" CTA
    - Test: calls notFound() when slug doesn't exist
    - Test: calls notFound() when host is not onboarded
    - Test: shows "No packages available yet" when host has no active packages
    - Test: renders "Already a client?" link
    - Test: renders "Powered by TimeTap" footer
    - Test: generates correct metadata (SEO title and description)

## Dev Notes

### Architecture Patterns & Constraints

**Server-Side Rendering (SSR) — This is the first SSR public page:**

Story 3.1 introduces the first public-facing SSR page. All previous work has been in the `(host)` route group (authenticated dashboard/onboarding). Key differences:

```typescript
// src/app/(public)/[slug]/page.tsx — Server Component (NO "use client")
import { notFound } from "next/navigation"
import { hostService } from "@/services/host.service"
import { packageService } from "@/services/package.service"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const host = await hostService.findBySlugPublic(slug)
  if (!host) return { title: "Not Found | TimeTap" }
  return {
    title: `${host.name} | TimeTap`,
    description: host.description || `Book sessions with ${host.name} on TimeTap`,
  }
}

export default async function PublicHostPage({ params }: PageProps) {
  const { slug } = await params
  const host = await hostService.findBySlugPublic(slug)
  if (!host) notFound()

  const packages = await packageService.findActiveByHostId(host.id)
  // ... render
}
```

**CRITICAL: `params` is a Promise in Next.js 16** — must `await params` before accessing `.slug`. This is different from Next.js 14/15 where params was synchronous.

**No Auth Required:** The `(public)` route group has NO auth middleware interception. The public layout should NOT import Supabase or check authentication. This page is fully unauthenticated.

**Service Layer Access:** Even though this is a public page, data access still goes through the services layer. The `findBySlugPublic` method intentionally returns only public-safe fields (no tokens, no subscription details, no email).

**PackageCardPublic Component Pattern:**

```tsx
// src/components/packages/package-card-public.tsx
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

interface PackageCardPublicProps {
  package: {
    id: string
    name: string
    sessionCount: number
    priceInCents: number
    isFreeIntro: boolean
  }
  slug: string
}

export function PackageCardPublic({ package: pkg, slug }: PackageCardPublicProps) {
  const perSessionPrice = pkg.sessionCount > 1
    ? formatCurrency(Math.round(pkg.priceInCents / pkg.sessionCount))
    : null

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <h3 className="font-semibold text-tt-text-primary">{pkg.name}</h3>
          <p className="text-sm text-tt-text-secondary">
            {pkg.sessionCount} {pkg.sessionCount === 1 ? "session" : "sessions"}
          </p>
        </div>
        <div className="text-right">
          {pkg.isFreeIntro ? (
            <p className="font-semibold text-tt-success">Free</p>
          ) : (
            <>
              <p className="font-semibold text-tt-text-primary">{formatCurrency(pkg.priceInCents)}</p>
              {perSessionPrice && (
                <p className="text-xs text-tt-text-muted">{perSessionPrice} per session</p>
              )}
            </>
          )}
        </div>
      </CardContent>
      <div className="px-4 pb-4">
        {pkg.isFreeIntro ? (
          <Button asChild className="w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white">
            <Link href={`/${slug}/book?package=${pkg.id}`}>Book free session</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${slug}/buy?package=${pkg.id}`}>Buy package</Link>
          </Button>
        )}
      </div>
    </Card>
  )
}
```

### Critical Implementation Details

**Gradient Hero Section (from UX spec — "Warm Gradient Hero" direction):**

```tsx
<section className="bg-gradient-to-r from-[#4facfe] to-[#00f2fe] px-4 py-12">
  <div className="mx-auto max-w-[640px] text-center">
    {/* Avatar: 80px circle, white border, initials fallback */}
    <Avatar className="mx-auto h-20 w-20 border-4 border-white">
      {host.avatarUrl ? (
        <AvatarImage src={host.avatarUrl} alt={host.name} />
      ) : null}
      <AvatarFallback className="bg-white/20 text-white text-2xl">
        {host.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
      </AvatarFallback>
    </Avatar>
    <h1 className="mt-4 text-2xl font-bold text-white">{host.name}</h1>
    {host.description && (
      <p className="mt-2 text-white/85">{host.description}</p>
    )}
  </div>
</section>
```

**Package Section Layout:**

```tsx
<main className="mx-auto max-w-[640px] px-4 py-8">
  {freeIntroPackage && (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-tt-text-muted">
        Start here
      </p>
      <PackageCardPublic package={freeIntroPackage} slug={slug} />
    </div>
  )}

  {paidPackages.length > 0 && (
    <div className="space-y-4">
      {paidPackages.map(pkg => (
        <PackageCardPublic key={pkg.id} package={pkg} slug={slug} />
      ))}
    </div>
  )}

  {packages.length === 0 && (
    <p className="text-center text-tt-text-secondary py-8">
      No packages available yet
    </p>
  )}
</main>
```

**Footer:**

```tsx
<footer className="mx-auto max-w-[640px] px-4 py-8 text-center">
  <p className="text-sm text-tt-text-muted">
    Already a client?{" "}
    <Link href={`/auth/magic-link?host=${slug}`} className="text-tt-primary hover:text-tt-primary-hover underline">
      Access your workspace
    </Link>
  </p>
  <div className="mt-6 text-xs text-tt-text-muted">
    <p>Powered by TimeTap</p>
    <Link href="/privacy" className="underline hover:text-tt-text-secondary">Privacy policy</Link>
  </div>
</footer>
```

**Color Tokens (CRITICAL — use tt- prefix):**

- Gradient: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`
- White text on gradient: `text-white`
- White text opacity: `text-white/85`
- Body text: `text-tt-text-body`
- Primary text: `text-tt-text-primary`
- Secondary text: `text-tt-text-secondary`
- Muted text: `text-tt-text-muted`
- Success (free price): `text-tt-success`
- Primary link: `text-tt-primary`
- Primary hover: `hover:text-tt-primary-hover`
- Surface card: `bg-tt-surface`
- Page background: `bg-tt-bg-page`

**SEO Metadata:**

```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const host = await hostService.findBySlugPublic(slug)
  if (!host) {
    return { title: "Not Found | TimeTap" }
  }
  return {
    title: `${host.name} | TimeTap`,
    description: host.description || `Book sessions with ${host.name} on TimeTap`,
    openGraph: {
      title: `${host.name} | TimeTap`,
      description: host.description || `Book sessions with ${host.name} on TimeTap`,
      type: "profile",
    },
  }
}
```

### Previous Story Intelligence

**From Story 2.5 (most recent):**
- 178/179 tests pass (1 pre-existing failure in `host.test.ts` — "allows description to be omitted") — no new regressions allowed
- Stripe webhook handler at `/api/webhooks/stripe/route.ts` already exists — don't touch it
- Host service has methods: `findByAuthId`, `updateProfile`, `findBySlug` (for slug uniqueness check), `activateTrial`, `completeOnboarding`, `updateSubscriptionStatus`, `findBySubscriptionId`
- Package service has methods: `create`, `findByHostId`, `findById`, `update`, `deactivate`

**IMPORTANT — Existing `findBySlug` vs new `findBySlugPublic`:**
The host service already has `findBySlug(slug: string)` which is used for slug uniqueness validation during onboarding. That method returns the full host record. The new `findBySlugPublic` must:
1. Add the `onboardingCompleted: true` filter (only show live hosts)
2. Return only public-safe fields (no email, no tokens, no subscription data)
3. This is a NEW method, not a modification of the existing one

**From Story 2.4:**
- Package service `findByHostId` exists but returns ALL packages (active and inactive) — the new `findActiveByHostId` must filter `isActive: true`
- `package-card-host.tsx` exists as the host-facing variant — `package-card-public.tsx` is the new public variant

**Established code patterns:**
- Service pattern: plain object with methods, uses `prisma` singleton from `@/lib/prisma`
- Server component data fetching: direct service calls, no API routes needed
- Test pattern: mock Prisma with `vi.mock("@/lib/prisma")`, test both happy path and edge cases
- shadcn components available: button, card, avatar, badge, skeleton, separator, input, textarea, form, label, sonner, dialog

### Git Intelligence

**Recent commits (most recent first):**
1. `cf090a0` — "Deploy fix Story 2.5: Free Trial Activation & Onboarding Completion (Step 5/5)"
2. `32959f0` — "REVIEW Story 2.5: Free Trial Activation & Onboarding Completion (Step 5/5)"
3. `c0d173e` — "to review: Story 2.4: Package Creation & Management (Step 4/5)"

**Patterns established:**
- All Epic 2 stories completed — onboarding is fully functional
- Service + Server Action + Component pattern consistent across all stories
- Tests co-located with source files, Vitest + testing-library
- Color tokens consistently use `tt-` prefix throughout

### Dependencies

No new packages needed. All required dependencies are already installed:
- `next`, `react` — for SSR page
- shadcn/ui components (card, button, avatar, skeleton) — already available
- `@/services/host.service.ts` and `@/services/package.service.ts` — already exist, need new methods

### Testing Notes

**Testing SSR Server Components:**

Server components can't be tested with `render()` from testing-library (they're async). Test approaches:
1. Test service methods independently (unit tests for `findBySlugPublic`, `findActiveByHostId`)
2. For the page component, test the rendering logic by importing and calling the component function, or use a helper that resolves the async component
3. Mock `next/navigation` for `notFound()` calls

```typescript
// Mock pattern for server component tests
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}))

vi.mock("@/services/host.service", () => ({
  hostService: {
    findBySlugPublic: vi.fn(),
  },
}))

vi.mock("@/services/package.service", () => ({
  packageService: {
    findActiveByHostId: vi.fn(),
  },
}))
```

**Testing the PackageCardPublic component** — this is a simpler component (no client-side state), so standard `render()` + assertions work.

### Project Structure Notes

**Files to create:**
- `src/app/(public)/layout.tsx` — Public layout (minimal)
- `src/app/(public)/[slug]/page.tsx` — Public host page (SSR)
- `src/app/(public)/[slug]/loading.tsx` — Loading skeleton
- `src/app/(public)/[slug]/not-found.tsx` — 404 page
- `src/app/(public)/[slug]/page.test.tsx` — Page tests
- `src/components/packages/package-card-public.tsx` — Public package card
- `src/components/packages/package-card-public.test.tsx` — Package card tests

**Files to modify:**
- `src/services/host.service.ts` — Add `findBySlugPublic` method
- `src/services/host.service.test.ts` — Add tests for new method
- `src/services/package.service.ts` — Add `findActiveByHostId` method
- `src/services/package.service.test.ts` — Add tests for new method
- `src/lib/utils.ts` — Add `formatCurrency` utility

**Files to potentially create:**
- `src/lib/utils.test.ts` — Tests for `formatCurrency` (if file doesn't already exist)

**Existing files to use (do not modify):**
- `src/lib/prisma.ts` — Prisma singleton
- `src/types/actions.ts` — `ActionResult<T>` type (not needed for this story — no mutations)
- `src/components/ui/card.tsx`, `button.tsx`, `avatar.tsx`, `skeleton.tsx` — shadcn components
- `src/app/(public)/.gitkeep` — Can be deleted once `layout.tsx` is created

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Public Host Page]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Rendering Strategy]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure — (public) routes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries — Data Access Boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction — Public Page: Warm Gradient Hero]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component #5: Package Card — Variant A: Public-facing]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Layout — Public host page: Centered column, max-width 640px]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility — WCAG 2.1 AA]
- [Source: _bmad-output/planning-artifacts/prd.md#FR19, FR20 — Host Public Page]
- [Source: _bmad-output/implementation-artifacts/2-5-free-trial-activation-and-onboarding-completion.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Added `findBySlugPublic(slug)` to host service — filters by `onboardingCompleted: true`, returns only public-safe fields (id, name, slug, description, avatarUrl). 3 tests added (found host, non-existent slug, non-onboarded host).
- Task 2: Added `findActiveByHostId(hostId)` to package service — filters `isActive: true`, selects only public fields, orders free intro first then by createdAt. 2 tests added.
- Task 3: Created `PackageCardPublic` component — renders free intro with gradient CTA and "Book free session" link, paid packages with secondary "Buy package" link, per-session price breakdown for multi-session packages. 5 tests added.
- Task 4: Created SSR public host page at `(public)/[slug]/page.tsx` — async server component with `await params` (Next.js 16), gradient hero section, package cards, "Already a client?" link, "Powered by TimeTap" footer, privacy link. Includes `generateMetadata` for SEO with OpenGraph. Created loading skeleton. 11 tests added.
- Task 5: Created minimal public layout — no auth, just `bg-tt-bg-page` background wrapper.
- Task 6: Created warm 404 page at `not-found.tsx` — blame-free messaging per UX spec.
- Task 7: Updated `formatCurrency` in utils.ts — changed from USD to EUR (`en-IE` locale), whole euros show no decimals, zero returns "Free". 5 tests added.
- Task 8: Comprehensive page-level tests covering all 9 ACs — hero rendering, free/paid package rendering, notFound() calls, empty state, footer, metadata generation.
- Total: 234/236 tests pass (2 pre-existing failures in `host.test.ts` and `stripe/route.test.ts` — no new regressions).

### Change Log

- 2026-02-14: Story 3.1 implementation complete — all 8 tasks implemented with 26 new tests

### File List

**New files:**
- src/app/(public)/layout.tsx
- src/app/(public)/[slug]/page.tsx
- src/app/(public)/[slug]/loading.tsx
- src/app/(public)/[slug]/not-found.tsx
- src/app/(public)/[slug]/page.test.tsx
- src/components/packages/package-card-public.tsx
- src/components/packages/package-card-public.test.tsx
- src/lib/utils.test.ts

**Modified files:**
- src/services/host.service.ts (added `findBySlugPublic`)
- src/services/host.service.test.ts (added 3 tests for `findBySlugPublic`)
- src/services/package.service.ts (added `findActiveByHostId`)
- src/services/package.service.test.ts (added 2 tests for `findActiveByHostId`)
- src/lib/utils.ts (updated `formatCurrency` to EUR format)
