# Story 2.4: Package Creation & Management (Step 4/5)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a host,
I want to create my first package during onboarding and manage packages afterward,
So that customers have something to book and buy on my public page.

## Acceptance Criteria

1. **Given** the host is on onboarding step 4, **When** the page loads, **Then** they see a "Create your first package" heading, **And** a one-tap "Free Intro Call" button that pre-fills: name = "Free Intro Call", sessions = 1, price = €0, **And** an option to "Create a paid package" with fields: name, number of sessions, price (€ prefix, numeric input), **And** the progress bar shows step 4 active.

2. **Given** the host taps "Free Intro Call" quick-create, **When** the action completes, **Then** a package is created in a `packages` table with: id (UUID), hostId, name ("Free Intro Call"), sessionCount (1), priceInCents (0), isFreeIntro (true), isActive (true), createdAt, updatedAt, **And** the package appears in a list below the form, **And** the host can optionally create additional packages.

3. **Given** the host creates a paid package with name, sessions, and price, **When** they submit the form, **Then** the package is saved with priceInCents as integer cents (e.g., €800 → 80000), **And** Zod validation ensures: name is 1-100 characters, sessions is 1-100, price is >= 0, **And** the package appears in the list.

4. **Given** the host has created at least one package and clicks "Continue", **When** the save action runs, **Then** the stepper advances to step 5.

5. **Given** an authenticated host visits `/dashboard/packages` after onboarding, **When** the page loads, **Then** they see all their packages as host-facing package cards with: name, session count, price, status badge (Active/Inactive), **And** they can tap "+ New" to create additional packages, **And** they can tap a package to edit its name, sessions, price, or deactivate it, **And** deactivating a package sets isActive to false (existing credits unaffected).

## Tasks / Subtasks

- [x] Task 1: Add Package model to Prisma schema and run migration (AC: #2)
  - [x] 1.1 Add `Package` model to `prisma/schema.prisma` with fields: `id` (UUID, `@default(uuid())`), `hostId` (UUID, FK to `hosts.id`), `name` (String), `sessionCount` (Int, `@map("session_count")`), `priceInCents` (Int, `@map("price_in_cents")`), `isFreeIntro` (Boolean, `@default(false)`, `@map("is_free_intro")`), `isActive` (Boolean, `@default(true)`, `@map("is_active")`), `createdAt` (DateTime, `@default(now())`), `updatedAt` (DateTime, `@updatedAt`). Map to `packages` table (`@@map("packages")`). Add relation: `host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)`. Add `packages Package[]` relation field on `Host` model.
  - [x] 1.2 Run `pnpm prisma db push` to sync schema to Supabase
  - [x] 1.3 Run `pnpm prisma generate` to regenerate the Prisma client
  - [x] 1.4 Create migration SQL file `prisma/migrations/XXX_add_packages/migration.sql` with RLS policy: `ALTER TABLE packages ENABLE ROW LEVEL SECURITY; CREATE POLICY "Hosts manage own packages" ON packages FOR ALL USING (host_id = auth.uid());` — apply via `psql` or Supabase SQL Editor (since `prisma db push` does NOT apply RLS)

- [x] Task 2: Create package validation schemas (AC: #3)
  - [x] 2.1 Create `src/lib/validations/package.ts` with `createPackageSchema`: `name` (string, min 1, max 100), `sessionCount` (number, int, min 1, max 100), `priceInCents` (number, int, min 0). Export `CreatePackageInput` type. Add `updatePackageSchema` extending `createPackageSchema` with optional `isActive` (boolean). Export `UpdatePackageInput` type.

- [x] Task 3: Create package service (AC: #2, #3, #5)
  - [x] 3.1 Create `src/services/package.service.ts` following the `hostService` pattern (plain object with methods). Methods:
    - `create(hostId: string, data: CreatePackageInput)` — creates a new package, sets `isFreeIntro: true` if `priceInCents === 0 && sessionCount === 1`
    - `listByHostId(hostId: string)` — returns all packages for a host, ordered by `createdAt` desc
    - `findById(id: string, hostId: string)` — finds a single package, verifying host ownership
    - `update(id: string, hostId: string, data: UpdatePackageInput)` — updates package fields
    - `deactivate(id: string, hostId: string)` — sets `isActive = false`
    - `countByHostId(hostId: string)` — returns count of packages (used for "Continue" button enable/disable)

- [x] Task 4: Create package server actions (AC: #2, #3, #5)
  - [x] 4.1 Add `createPackage` action to `src/app/(host)/onboarding/actions.ts` — follows established pattern: validate with `createPackageSchema`, auth check via Supabase, call `packageService.create(user.id, parsed.data)`, return `ActionResult<Package>`
  - [x] 4.2 Create `src/app/(host)/dashboard/packages/actions.ts` with:
    - `createPackageAction(input: CreatePackageInput)` — same as onboarding but for dashboard context
    - `updatePackageAction(id: string, input: UpdatePackageInput)` — validates, auth checks, calls `packageService.update()`
    - `deactivatePackageAction(id: string)` — validates, auth checks, calls `packageService.deactivate()`
    - `listPackagesAction()` — auth checks, calls `packageService.listByHostId()`, returns `ActionResult<Package[]>`

- [x] Task 5: Create PackageStep onboarding component (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `src/components/onboarding/package-step.tsx` — client component with:
    - **Free Intro Call section:** A prominent card/button with one-tap creation. When tapped, immediately calls `createPackage({ name: "Free Intro Call", sessionCount: 1, priceInCents: 0 })`. Shows loading state during creation. After creation, shows the package in a list below with a checkmark.
    - **Paid package section:** "Or create a paid package" heading. Form with: name input, session count input (type="number", min=1, max=100), price input with "€" prefix (user enters euros, component converts to cents before submission — e.g., user types "80" → `priceInCents: 8000`). Gradient primary "Add package" button. On success, package appears in the list below.
    - **Package list:** Shows all created packages as simple items (name, sessions, price). Each has a delete/remove option (removes from the list during onboarding only, not a full deactivation).
    - **Continue button:** Only enabled when `packages.length >= 1`. Gradient primary full-width button. Calls `onComplete()` prop to advance to step 5.
    - Props: `onComplete: () => void`, `hostId: string`
  - [x] 5.2 The price input UX: user enters euros as a decimal (e.g., "80.00" or "80"), component converts to cents for the server action. Display back as euros with `Intl.NumberFormat`.

- [x] Task 6: Update onboarding page for step 4 (AC: #1, #4)
  - [x] 6.1 Update `src/app/(host)/onboarding/page.tsx`:
    - Import `PackageStep` component
    - Replace the step 4 placeholder block with `<PackageStep hostId={hostData.id} onComplete={() => setCurrentStep(5)} />`
    - Update `STEP_TITLES[4].description` to "Set up your packages so clients can book and buy."

- [x] Task 7: Create host-facing package card component (AC: #5)
  - [x] 7.1 Create `src/components/packages/package-card-host.tsx` — displays a package with: name (h3), session count + price (secondary text), status badge (`Active` in `tt-success` / `Inactive` in `tt-text-muted`). Tappable — entire card is a link/button. For price display: if `priceInCents === 0`, show "Free" in `text-tt-success`; otherwise format as euros (e.g., "€80.00"). Show per-session price in caption if `sessionCount > 1` (e.g., "€40.00/session").

- [x] Task 8: Build dashboard packages page (AC: #5)
  - [x] 8.1 Update `src/app/(host)/dashboard/packages/page.tsx` — server component that:
    - Authenticates via Supabase `createClient()` → `auth.getUser()`
    - Calls `packageService.listByHostId(user.id)` to fetch all packages
    - Renders a header with title "Packages" and a "+ New" button (link to `/dashboard/packages/new` or inline creation)
    - Maps packages to `<PackageCardHost>` components
    - Shows empty state if no packages: "No packages yet. Create your first package to start receiving bookings."
  - [x] 8.2 Create `src/app/(host)/dashboard/packages/new/page.tsx` — a page with a package creation form (reuses similar form fields as the onboarding `PackageStep` but styled for the dashboard context). On success, redirects back to `/dashboard/packages` with a toast.
  - [x] 8.3 Create `src/app/(host)/dashboard/packages/[packageId]/page.tsx` — an edit page for a single package. Loads the package via `packageService.findById()`, displays an editable form (same fields as create), plus a "Deactivate" button (destructive action with confirmation). On save, redirects to `/dashboard/packages`.

- [x] Task 9: Update `/api/host/me` to include packages (AC: #5)
  - [x] 9.1 Update `src/app/api/host/me/route.ts` — include `packages` in the response by querying `packageService.listByHostId(host.id)` and adding them to the JSON output. This allows the onboarding page to know if packages already exist (for step auto-advance).

- [x] Task 10: Write tests (all ACs)
  - [x] 10.1 Create `src/lib/validations/package.test.ts` — test `createPackageSchema`: valid input, name too long, name empty, sessionCount = 0, sessionCount > 100, negative price, float price (should fail — must be int)
  - [x] 10.2 Create `src/services/package.service.test.ts` — test create (sets `isFreeIntro` correctly), listByHostId (returns sorted), findById (rejects wrong host), update, deactivate
  - [x] 10.3 Create `src/components/onboarding/package-step.test.tsx` — test: renders "Free Intro Call" button, tapping it calls createPackage action, shows package in list after creation, paid package form validates and submits, "Continue" disabled when no packages, "Continue" enabled when package exists, calls onComplete on continue
  - [x] 10.4 Create `src/components/packages/package-card-host.test.tsx` — test: renders name and price, shows "Free" for free packages, shows Active/Inactive badge, formats per-session price
  - [x] 10.5 Update `src/app/(host)/onboarding/page.test.tsx` — add tests for step 4: renders PackageStep when `currentStep === 4`, advancing from step 4 to step 5
  - [x] 10.6 Create `src/app/(host)/dashboard/packages/actions.test.ts` — test all dashboard package actions: create, update, deactivate, list (with auth checks)

## Dev Notes

### Architecture Patterns & Constraints

**Package Data Model:**

```typescript
// prisma/schema.prisma
model Package {
  id            String   @id @default(uuid()) @db.Uuid
  hostId        String   @map("host_id") @db.Uuid
  name          String
  sessionCount  Int      @map("session_count")
  priceInCents  Int      @map("price_in_cents")
  isFreeIntro   Boolean  @default(false) @map("is_free_intro")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  host Host @relation(fields: [hostId], references: [id], onDelete: Cascade)

  @@map("packages")
}
```

**Critical: Money is stored as integer cents.** The `priceInCents` field is an `Int`. The UI must convert user input (euros) to cents before sending to the server action. Display: use `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })` or similar to format `priceInCents / 100` for display.

**RLS Policy (must be applied separately from Prisma):**

```sql
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts manage own packages" ON packages
  FOR ALL USING (host_id = auth.uid());
```

Note: `prisma db push` does NOT apply RLS. The SQL must be run separately via Supabase SQL Editor or `psql`.

**Service Layer Pattern (from `host.service.ts`):**

```typescript
import { prisma } from "@/lib/prisma"
import type { CreatePackageInput, UpdatePackageInput } from "@/lib/validations/package"

export const packageService = {
  async create(hostId: string, data: CreatePackageInput) {
    return prisma.package.create({
      data: {
        hostId,
        name: data.name,
        sessionCount: data.sessionCount,
        priceInCents: data.priceInCents,
        isFreeIntro: data.priceInCents === 0 && data.sessionCount === 1,
      },
    })
  },

  async listByHostId(hostId: string) {
    return prisma.package.findMany({
      where: { hostId },
      orderBy: { createdAt: "desc" },
    })
  },

  async findById(id: string, hostId: string) {
    return prisma.package.findFirst({
      where: { id, hostId },
    })
  },

  async update(id: string, hostId: string, data: UpdatePackageInput) {
    return prisma.package.update({
      where: { id, hostId },
      data,
    })
  },

  async deactivate(id: string, hostId: string) {
    return prisma.package.update({
      where: { id, hostId },
      data: { isActive: false },
    })
  },

  async countByHostId(hostId: string) {
    return prisma.package.count({
      where: { hostId },
    })
  },
}
```

**Server Action Pattern (from established pattern in `actions.ts`):**

```typescript
"use server"

import { createPackageSchema } from "@/lib/validations/package"
import { createClient } from "@/lib/supabase/server"
import { packageService } from "@/services/package.service"
import type { ActionResult } from "@/types/actions"
import type { Package } from "@/generated/prisma/client"

export async function createPackage(
  input: { name: string; sessionCount: number; priceInCents: number }
): Promise<ActionResult<Package>> {
  const parsed = createPackageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }
  }

  try {
    const pkg = await packageService.create(user.id, parsed.data)
    return { success: true, data: pkg }
  } catch (error) {
    console.error("createPackage failed:", error)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Could not create package. Please try again." } }
  }
}
```

### Critical Implementation Details

**Onboarding Step 4 UI Specs (from UX spec):**

- Progress bar: segments 1-3 completed (gradient fill), segment 4 active (gradient fill), segment 5 future (divider color)
- Centered column (max-width 480px), no sidebar/tab bar (onboarding layout handles this)
- **Section A (Free Intro Call):** Prominent card with one-tap "Free Intro Call" creation. Button text: "Free Intro Call" or similar. After creation, the card transforms to show a checkmark and the created package info.
- **Section B (Paid Package):** "Or create a paid package" heading. Form fields: name (text input), sessions (number input, min 1, max 100), price (€ prefix, numeric input — user enters euros, system stores cents).
- **Package List:** Simple list showing all created packages. Each item: name, sessions, price.
- **Continue button:** Full-width gradient primary, only enabled when at least 1 package exists.
- "Step 4 of 5" label in caption text.

**Price Input UX:**

The user enters a price in EUROS (e.g., "80" or "80.00"). The component converts to CENTS before submitting to the server action:

```typescript
// User types "80" or "80.00" → priceInCents = 8000
const priceInCents = Math.round(parseFloat(priceValue) * 100)
```

Display formatting (euros from cents):

```typescript
function formatPrice(priceInCents: number): string {
  if (priceInCents === 0) return "Free"
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(priceInCents / 100)
}
```

**Package Card — Host-Facing (Component Variant B from UX spec):**

- Package name (h3)
- Session count + price (secondary text)
- Status badge: `Active` (green/success badge) or `Inactive` (muted badge)
- If `priceInCents === 0`: show "Free" in `text-tt-success`
- If `sessionCount > 1`: show per-session price in caption (e.g., "€40.00/session")
- Entire card is tappable → navigates to edit page

**Dashboard Packages Page — Layout:**

- Header: "Packages" title + "+ New" button (top right)
- Package list: vertical stack of `<PackageCardHost>` components
- Empty state: "No packages yet. Create your first package to start receiving bookings." with a "Create package" CTA

**Deactivation (Destructive Action):**

Per UX spec, destructive actions require two-step confirmation:
1. Host taps "Deactivate" button (error-colored)
2. Confirmation dialog: "Deactivate {package_name}? Customers won't be able to buy this package anymore. Existing credits won't be affected."
3. Buttons: "Keep active" (secondary, visually stronger) and "Deactivate" (error-colored)

**Prisma Compound Unique Constraint:**

Note: `prisma.package.update({ where: { id, hostId } })` requires either a unique constraint on `(id, hostId)` or the `findFirst` + `update` pattern. Since `id` alone is unique (UUID PK), the safest approach is:

```typescript
async update(id: string, hostId: string, data: UpdatePackageInput) {
  // Verify ownership first
  const existing = await prisma.package.findFirst({ where: { id, hostId } })
  if (!existing) throw new Error("Package not found")
  return prisma.package.update({ where: { id }, data })
},
```

**Color Tokens (CRITICAL — use tt- prefix):**

- Gradient button: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`
- Active badge: `bg-tt-success-light text-tt-success` or use shadcn `<Badge variant="outline">` with green styling
- Inactive badge: `bg-tt-surface text-tt-text-muted`
- Free price text: `text-tt-success`
- Error/destructive text: `text-tt-error`
- Body text: `text-tt-text-body`
- Muted text: `text-tt-text-muted`
- Caption text: `text-tt-text-secondary`

### Previous Story Intelligence

**From Story 2.3 (most recent, completed):**
- 133 tests pass — no regressions allowed
- `WeeklyHoursGrid` and `GoogleCalendarStep` are the component patterns to follow for `PackageStep`
- The onboarding page now handles steps 1-3 with real components, step 4-5 are placeholder blocks (the exact block to replace is `{currentStep >= 4 && currentStep <= 5 && (...)}`)
- `saveBookableHours` server action pattern is the template for `createPackage`
- `/api/host/me` returns `bookableHours` — needs to also return `packages` (or a package count)

**From Story 2.3 — Debug Learnings:**
- Fake timers in Vitest need `shouldAdvanceTime: true`
- `useSearchParams()` mock: use `mockSearchParams = new URLSearchParams()` and mutate per test
- Test pattern for form components: render, fill inputs, click submit, use `waitFor` for async state updates
- Found multiple elements issue: use `getByRole("heading")` to disambiguate

**From Story 2.2:**
- `StripeConnectStep` is a simple one-CTA component — `PackageStep` is more complex with form + list
- Onboarding page error handling pattern: `setError("message")` → display above form

**From Story 2.1:**
- `ProfileForm` established the pattern for form submission → `startTransition` → action call → advance step
- The `handleProfileSubmit` function is the exact template for how `PackageStep` should call actions and advance
- Sonner toast available globally via `toast.success("...")` from `sonner`

### Git Intelligence

**Recent commits (most recent first):**
1. `f07b314` — "vercel build fix after 2.3"
2. `483ca26` — "Story 2.3: Google Calendar Connection & Bookable Hours"
3. `ba97836` — "Story 2.2: Stripe Connect Integration (Step 2/5)"
4. `195220b` — "Story 2.1: Onboarding Flow & Profile Setup (Step 1/5)"
5. `50dff39` — "Story 1.3: Route Protection & Dashboard Shell"

**Patterns established:**
- Service pattern: `xxxService` as plain object with methods using Prisma client singleton
- Server Action pattern: validate → auth → service → `ActionResult<T>`
- Onboarding component pattern: client component with props (`onComplete: () => void`), internal state management, calls server actions via `startTransition`
- shadcn components available: button, card, avatar, badge, skeleton, separator, input, textarea, form, label, sonner
- Tests: Vitest + testing-library, mocked Supabase and Prisma, co-located `.test.ts(x)` files

**shadcn components that may need to be added:**
- `dialog` — for deactivation confirmation on the dashboard packages page
- No other new shadcn components needed — existing `button`, `card`, `input`, `badge`, `form`, `label` suffice

### Dependencies to Install

```bash
# No new npm dependencies needed
# shadcn dialog component may need to be added:
pnpm dlx shadcn@latest add dialog
```

### Project Structure Notes

**Files to create:**
- `src/services/package.service.ts` — Package CRUD operations
- `src/lib/validations/package.ts` — Zod schemas for package creation/update
- `src/components/onboarding/package-step.tsx` — Onboarding step 4 UI
- `src/components/packages/package-card-host.tsx` — Host-facing package card component
- `src/app/(host)/dashboard/packages/actions.ts` — Dashboard package actions
- `src/app/(host)/dashboard/packages/new/page.tsx` — Create package page (dashboard)
- `src/app/(host)/dashboard/packages/[packageId]/page.tsx` — Edit package page (dashboard)

**Files to modify:**
- `prisma/schema.prisma` — Add `Package` model and relation on `Host`
- `src/app/(host)/onboarding/page.tsx` — Replace step 4 placeholder with `<PackageStep>`
- `src/app/(host)/onboarding/actions.ts` — Add `createPackage` server action
- `src/app/(host)/dashboard/packages/page.tsx` — Replace placeholder with real packages list
- `src/app/api/host/me/route.ts` — Add packages to the JSON response

**Existing files to use (do not modify unless listed above):**
- `src/lib/prisma.ts` — Prisma singleton
- `src/lib/supabase/server.ts` — Server Supabase client (for auth checks)
- `src/types/actions.ts` — `ActionResult<T>` type
- `src/lib/utils.ts` — `cn()` utility
- `src/components/onboarding/onboarding-stepper.tsx` — Reused as-is
- `src/app/(host)/onboarding/layout.tsx` — Handles auth, no modification needed
- All existing shadcn UI components

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Action Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Conventions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: Host Onboarding — Step 4]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Package Card Component (Variant B)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form & Input Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Destructive Actions]
- [Source: _bmad-output/implementation-artifacts/2-3-google-calendar-connection-and-bookable-hours.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing test failure in `host.test.ts` ("allows description to be omitted") — not introduced by this story, existed before changes.

### Completion Notes List

- Implemented full Package CRUD: Prisma model, service layer, validation schemas, server actions
- Onboarding step 4 PackageStep component with one-tap Free Intro Call and paid package form
- Dashboard packages page with server-side rendering, package list, create/edit/deactivate flows
- PackageCardHost component with price formatting, per-session price, Active/Inactive badges
- Deactivation uses two-step confirmation via shadcn Dialog component
- `/api/host/me` now includes packages in response for onboarding auto-advance
- RLS migration SQL created (must be applied separately via Supabase SQL Editor)
- 45 new tests added (10 validation, 11 service, 8 package-step, 8 package-card, 9 dashboard-actions), all passing
- No regressions: 178/179 tests pass (1 pre-existing failure)
- Build passes cleanly

### Change Log

- 2026-02-14: Story 2.4 implementation complete — Package Creation & Management

### File List

**New files:**
- prisma/migrations/1_add_packages/migration.sql
- src/lib/validations/package.ts
- src/lib/validations/package.test.ts
- src/services/package.service.ts
- src/services/package.service.test.ts
- src/components/onboarding/package-step.tsx
- src/components/onboarding/package-step.test.tsx
- src/components/packages/package-card-host.tsx
- src/components/packages/package-card-host.test.tsx
- src/app/(host)/dashboard/packages/actions.ts
- src/app/(host)/dashboard/packages/actions.test.ts
- src/app/(host)/dashboard/packages/new/page.tsx
- src/app/(host)/dashboard/packages/[packageId]/page.tsx
- src/components/ui/dialog.tsx (shadcn)

**Modified files:**
- prisma/schema.prisma
- src/app/(host)/onboarding/page.tsx
- src/app/(host)/onboarding/page.test.tsx
- src/app/(host)/onboarding/actions.ts
- src/app/(host)/dashboard/packages/page.tsx
- src/app/api/host/me/route.ts
