# Story 2.1: Onboarding Flow & Profile Setup (Step 1/5)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a host,
I want to set up my profile and choose my unique public URL during onboarding,
So that customers can find and recognize me on TimeTap.

## Acceptance Criteria

1. **Given** a newly signed-in host whose `onboardingCompleted` is false, **When** they are redirected to `/onboarding`, **Then** they see a 5-segment progress bar at the top (segment 1 active with gradient fill), **And** "Step 1 of 5" label in caption text, **And** a centered form (max-width 480px) with fields: Name (pre-filled from Google), Description (textarea, 3 rows), and Slug input.

2. **Given** the host is on the slug input field, **When** they type a slug value, **Then** the input shows "timetap.it/" as a non-editable prefix, **And** after 300ms debounce, the system checks slug availability, **And** if available: green checkmark with "Available!" below the input, **And** if taken: red indicator with "Taken — try {suggestion}?" with alternative suggestions, **And** slug is validated: lowercase, alphanumeric and hyphens only, 3-30 characters.

3. **Given** the host completes all fields with a valid, available slug, **When** they click "Continue" (gradient primary button, full-width), **Then** the profile is saved to the hosts table (name, description, slug updated), **And** the stepper advances to step 2 with segment 1 showing completed (gradient fill).

4. **Given** validation fails (empty name, invalid slug), **When** the host tries to continue, **Then** inline error messages appear below the relevant fields in `error` color, **And** errors clear as the host starts typing.

5. **Given** an onboarded host navigates to `/dashboard/settings`, **When** the settings page loads, **Then** they see their current profile information (name, description, slug) in an editable form using the same components as onboarding step 1, **And** they can update name and description and save changes, **And** they can update their slug (same live validation: debounce, availability check, suggestions), **And** a toast confirms: "Profile updated" on successful save, **And** integration status is visible: Google Calendar (connected/disconnected), Stripe (connected/disconnected).

## Tasks / Subtasks

- [x] Task 1: Create onboarding layout and stepper component (AC: #1)
  - [x] 1.1 Install required shadcn/ui components: `pnpm dlx shadcn@latest add input textarea form label sonner` (toast deprecated, replaced with sonner) plus `@hookform/resolvers` already installed
  - [x] 1.2 Create `src/app/(host)/onboarding/layout.tsx` — server component that verifies host session (same auth check as host layout), but renders a minimal centered layout (no sidebar, no tab bar, max-width 480px centered column), redirects to `/dashboard` if `onboardingCompleted` is already true
  - [x] 1.3 Create `src/components/onboarding/onboarding-stepper.tsx` — client component: 5-segment progress bar (4px height, 4px gap between segments), completed/current segments use gradient fill (`bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`), future segments use `bg-tt-divider`, step label "Step N of 5" in `text-tt-text-muted` caption size (12px)
  - [x] 1.4 Create onboarding stepper tests

- [x] Task 2: Create slug input component with live validation (AC: #2)
  - [x] 2.1 Create `src/lib/validations/host.ts` — Zod schemas: `updateProfileSchema` (name: string min 1 max 100, description: string max 500 optional, slug: string regex `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` min 3 max 30)
  - [x] 2.2 Create `src/components/onboarding/slug-input.tsx` — client component: non-editable "timetap.it/" prefix in `bg-tt-bg-subtle` box + editable slug input, 300ms debounce on input change triggers server action `checkSlugAvailability`, status indicator below: idle (no indicator), checking (subtle loading spinner), available (green checkmark `text-tt-success` + "Available!"), taken (`text-tt-error` + "Taken — try {suggestion}?" where suggestion is slug + random suffix)
  - [x] 2.3 Create `src/app/(host)/onboarding/actions.ts` with `checkSlugAvailability` server action — queries `hostService.isSlugAvailable(slug)`, returns `ActionResult<{ available: boolean; suggestion?: string }>`
  - [x] 2.4 Add `isSlugAvailable(slug: string)` and `suggestSlug(slug: string)` methods to `src/services/host.service.ts` — queries `SELECT count(*) FROM hosts WHERE slug = $1`, for suggestion appends random 2-digit number or city-style suffix
  - [x] 2.5 Create slug input tests and validation schema tests

- [x] Task 3: Create onboarding step 1 page with profile form (AC: #1, #3, #4)
  - [x] 3.1 Create `src/app/(host)/onboarding/page.tsx` — client component (`"use client"`) that manages the multi-step onboarding state, starts at step 1, renders the onboarding stepper + step-specific content
  - [x] 3.2 Implement Step 1 form: React Hook Form + Zod resolver using `updateProfileSchema`, fields: Name input (pre-filled from host record via props or fetch), Description textarea (3 rows, optional placeholder "Tell your clients about yourself"), Slug input component
  - [x] 3.3 Create `saveProfile` server action in `onboarding/actions.ts` — validates with Zod, calls `hostService.updateProfile(hostId, { name, description, slug })`, returns `ActionResult<Host>`
  - [x] 3.4 Add `updateProfile(hostId: string, data: { name: string; description?: string; slug: string })` method to `hostService` — updates host record, handles unique constraint violation on slug gracefully
  - [x] 3.5 Wire form submission: on success, advance stepper to step 2; on failure, show inline errors
  - [x] 3.6 Create onboarding page tests

- [x] Task 4: Create placeholder steps 2-5 for onboarding flow (AC: #3)
  - [x] 4.1 Create Step 2 placeholder: "Connect Stripe" heading + "Coming in Story 2.2" muted text + disabled Continue button
  - [x] 4.2 Create Step 3 placeholder: "Google Calendar & Bookable Hours" heading + "Coming in Story 2.3" + disabled Continue
  - [x] 4.3 Create Step 4 placeholder: "Create Your First Package" heading + "Coming in Story 2.4" + disabled Continue
  - [x] 4.4 Create Step 5 placeholder: "Start Free Trial" heading + "Coming in Story 2.5" + disabled Continue
  - [x] 4.5 For now, step 1 "Continue" advances to step 2 which shows placeholder — subsequent stories will replace placeholders

- [x] Task 5: Implement settings page with profile editing (AC: #5)
  - [x] 5.1 Replace `src/app/(host)/dashboard/settings/page.tsx` placeholder — server component that fetches host data and renders profile edit form
  - [x] 5.2 Create `src/app/(host)/dashboard/settings/actions.ts` with `updateHostProfile` server action — validates with same `updateProfileSchema`, calls `hostService.updateProfile()`, returns `ActionResult<Host>`
  - [x] 5.3 Reuse the same form components (Name, Description, Slug Input) from onboarding — extracted to shared `ProfileForm` component in `src/components/onboarding/profile-form.tsx`
  - [x] 5.4 Add toast notification on successful save: "Profile updated" using sonner toast
  - [x] 5.5 Add integration status section: Google Calendar status (check if `googleRefreshToken` exists → "Connected" in `text-tt-success` / "Not connected" in `text-tt-text-muted`), Stripe status (check if `stripeAccountId` exists → same pattern)
  - [x] 5.6 Create settings page tests

- [x] Task 6: Update host layout for onboarding redirect logic (AC: #1)
  - [x] 6.1 Update `src/app/(host)/layout.tsx` — if `!host.onboardingCompleted` and current path is NOT `/onboarding`, redirect to `/onboarding`
  - [x] 6.2 Ensure the host layout does NOT render sidebar/tab bar for the `/onboarding` route — the onboarding layout handles its own chrome-free presentation

## Dev Notes

### Architecture Patterns & Constraints

**Onboarding Layout (Chrome-free):**

The onboarding flow uses its own layout WITHOUT sidebar or bottom tab bar. This is specified in the UX spec: "Centered column, max-width 480px. Stepper at top. One task per screen." The onboarding layout (`src/app/(host)/onboarding/layout.tsx`) handles its own auth check independently.

```
Route: /onboarding
Layout: Centered, 480px max-width, no sidebar/tab bar
Auth: Same Supabase check as host layout
Redirect: → /dashboard if onboardingCompleted is true
```

**Multi-Step Client Component Pattern:**

The onboarding page is a single `"use client"` component managing step state locally (React useState). Steps 2-5 are placeholders for now — each subsequent story (2.2-2.5) will replace its placeholder with a real implementation.

```typescript
// src/app/(host)/onboarding/page.tsx
"use client"
const [currentStep, setCurrentStep] = useState(1)
// Step content switches based on currentStep
// Each step's "Continue" advances to next step
```

**Server Action Pattern (must follow):**

```typescript
"use server"
import { z } from "zod"
import { updateProfileSchema } from "@/lib/validations/host"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"
import type { ActionResult } from "@/types/actions"

export async function saveProfile(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResult<Host>> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }
  }
  try {
    const host = await hostService.updateProfile(user.id, parsed.data)
    return { success: true, data: host }
  } catch (error) {
    console.error("saveProfile failed:", error)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Could not save profile. Please try again." } }
  }
}
```

**Form Handling Pattern (React Hook Form + Zod):**

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateProfileSchema } from "@/lib/validations/host"

const form = useForm({
  resolver: zodResolver(updateProfileSchema),
  defaultValues: { name: host.name, description: host.description ?? "", slug: host.slug ?? "" }
})
```

**Slug Validation Details:**
- Regex: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` (lowercase alphanumeric + hyphens, no leading/trailing hyphens)
- Length: 3-30 characters
- Debounce: 300ms after user stops typing
- Availability check: server action calls `hostService.isSlugAvailable(slug)`
- Must exclude the current host's own slug from the availability check (so they can "keep" their existing slug)
- Suggestion on taken: append random 2-digit number (e.g., "sofia-coaching" → "sofia-coaching-42")

### Critical Implementation Details

**Onboarding Stepper Specs (from UX spec, Custom Component #8):**
- 5-segment progress bar at top (4px height, 4px gap between segments)
- Step label: "Step N of 5" (caption, `text-tt-text-muted`, 12px)
- Title (h1) + description (body, `text-tt-text-secondary`)
- Form content area below
- "Continue" button at bottom (gradient primary, full-width)
- Completed segments: gradient fill
- Current segment: gradient fill
- Future segments: `bg-tt-divider` color

**Slug Input Specs (from UX spec, Custom Component #12):**
- Prefix display: "timetap.it/" in `bg-tt-bg-subtle` box, non-editable, inline with input
- Input field: editable slug text, 16px font
- Status indicator below: green "Available!" (`text-tt-success`) or red "Taken — try {suggestion}?" (`text-tt-error`)
- States: Idle, Checking (subtle loading), Available, Taken

**Form Layout Specs (from UX spec):**
- Single column always. No side-by-side fields on mobile.
- 16px gap between fields
- Primary CTA at the bottom, full width
- On desktop: centered column, max-width 480px
- Labels above inputs, never floating/inside
- 16px font minimum (prevents iOS auto-zoom)
- Validate on blur, clear error on typing
- Required fields: no asterisk — all visible fields required unless labeled "(optional)"

**Color Tokens (CRITICAL — from Story 1.1 & 1.3):**
- All TimeTap colors use `tt-` prefix to avoid shadcn conflicts
- Use `text-tt-primary` NOT `text-primary` (shadcn owns `primary`)
- Use `bg-tt-bg-subtle` for subtle backgrounds
- Use `text-tt-text-body` for body text, `text-tt-text-muted` for muted
- Use `text-tt-success` and `text-tt-error` for validation feedback
- Gradient buttons: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]` (hardcoded in class)

**Toast Implementation (from UX spec):**
- Use shadcn Toast component
- Position: bottom of screen on mobile (above tab bar), top-right on desktop
- Auto-dismiss after 3 seconds
- Success variant: `tt-success` color
- Copy: past tense + specifics — "Profile updated" not "Success!"

### Previous Story Intelligence

**From Story 1.3 (most recent):**
- Host layout (`src/app/(host)/layout.tsx`) fetches host via `hostService.findByAuthId(user.id)`, redirects to `/auth/login` if no user/host — onboarding layout must do the same auth check
- Dashboard pages are server components, using host data passed through layout
- Bottom tab bar and sidebar are client components using `usePathname()` for active state
- Skeleton loading states use shadcn Skeleton component with `aria-busy="true"`
- All 39 existing tests pass — no regressions allowed

**From Story 1.2:**
- `hostService` lives at `src/services/host.service.ts` — has `findByAuthId()` and `createFromAuth()`
- Auth callback (`src/app/auth/callback/route.ts`) creates host record on first login and redirects to `/onboarding` if `!host.onboardingCompleted`
- `createClient()` from `@/lib/supabase/server` for server-side Supabase client
- `createBrowserClient()` from `@/lib/supabase/client` for client-side

**From Story 1.1:**
- Prisma 7.4.0: import from `@/generated/prisma/client` (NOT `@/generated/prisma`)
- Prisma client singleton at `src/lib/prisma.ts` with `@prisma/adapter-pg` + `pg.Pool`
- `cn()` utility at `src/lib/utils.ts`
- `ActionResult<T>` type at `src/types/actions.ts`
- Tailwind v4 with `@theme inline` block in `globals.css` — no `tailwind.config.ts`

**Debug Learnings from Previous Stories:**
- `@testing-library/react` cleanup: explicit `afterEach(cleanup)` in `src/test/setup.ts` (already fixed)
- Vitest + testing-library: tests co-located with source files
- Next.js 16: `proxy.ts` not `middleware.ts`, function named `proxy`
- Prisma unique constraint violations: catch `PrismaClientKnownRequestError` with code `P2002` for slug conflicts

### Git Intelligence

**Recent commits (most recent first):**
1. `50dff39` — "Story 1.3: Route Protection & Dashboard Shell"
2. `00495b5` — "started to set up APIs and services"
3. `3d696b7` — "1.1 — Project Initialization & Database Foundation"

**Patterns established:**
- Service pattern: `hostService` as plain object with methods using Prisma client singleton
- Server Actions: `"use server"` directive, Zod validation, auth check, service call, `ActionResult<T>` return
- Client components: `"use client"`, hooks for interactivity, Tailwind for styling
- Tests: Vitest + testing-library, mocked Supabase and Prisma, co-located `.test.ts(x)` files
- shadcn components already installed: button, card, avatar, badge, skeleton, separator

### Dependencies to Install

```bash
# shadcn components needed for this story
pnpm dlx shadcn@latest add input textarea form label toast

# React Hook Form Zod resolver (react-hook-form already in package.json)
pnpm add @hookform/resolvers
```

**Already installed (from previous stories):**
- react-hook-form 7.71.1
- zod 4.3.6
- lucide-react 0.563.0
- @supabase/ssr 0.8.x
- shadcn button, card, avatar, badge, skeleton, separator

### Project Structure Notes

**Files to create:**
- `src/app/(host)/onboarding/layout.tsx` — chrome-free onboarding layout with auth
- `src/app/(host)/onboarding/page.tsx` — multi-step onboarding client component
- `src/app/(host)/onboarding/actions.ts` — server actions: saveProfile, checkSlugAvailability
- `src/components/onboarding/onboarding-stepper.tsx` — 5-step progress bar
- `src/components/onboarding/slug-input.tsx` — slug input with live validation
- `src/components/onboarding/profile-form.tsx` — shared profile form (reused in settings)
- `src/lib/validations/host.ts` — Zod schemas for host profile
- `src/app/(host)/dashboard/settings/actions.ts` — settings page server actions

**Files to modify:**
- `src/services/host.service.ts` — add `updateProfile()`, `isSlugAvailable()`, `suggestSlug()` methods
- `src/app/(host)/dashboard/settings/page.tsx` — replace placeholder with real settings page
- `src/app/(host)/layout.tsx` — add onboarding redirect logic (if !onboardingCompleted, redirect to /onboarding)

**Existing files to use (do not modify unless listed above):**
- `src/lib/supabase/server.ts` — server Supabase client
- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/prisma.ts` — Prisma singleton
- `src/types/actions.ts` — `ActionResult<T>` type
- `src/lib/utils.ts` — `cn()` utility
- `src/app/auth/callback/route.ts` — already redirects to `/onboarding`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Action Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Conventions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Onboarding Stepper]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Slug Input]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: Host Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty & Loading States]
- [Source: _bmad-output/implementation-artifacts/1-3-route-protection-and-dashboard-shell.md]
- [Source: _bmad-output/implementation-artifacts/1-2-host-google-oauth-sign-in-and-sign-out.md]
- [Source: _bmad-output/implementation-artifacts/1-1-project-initialization-and-database-foundation.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- shadcn `toast` component is deprecated; replaced with `sonner` (same API pattern, uses `toast.success()` instead of `toast()`)
- `@hookform/resolvers` was already installed in package.json, no separate install needed
- Fake timers in Vitest need `shouldAdvanceTime: true` to properly handle async mock resolution with debounced callbacks
- Host layout path detection: used `x-pathname` header set in proxy.ts middleware since server layouts can't access URL path directly

### Completion Notes List

- Implemented complete onboarding flow with 5-step stepper, chrome-free layout, and profile form (step 1)
- Created reusable `ProfileForm` component shared between onboarding and settings pages
- Slug input with 300ms debounce, live availability checking, and suggestion on conflict
- Zod validation schemas for host profile (name, description, slug)
- Host service extended with `updateProfile()`, `isSlugAvailable()`, and `suggestSlug()` methods
- Settings page with profile editing, sonner toast notifications, and integration status display
- Host layout conditionally renders chrome (sidebar/tabbar) and redirects non-onboarded users to /onboarding
- Added `/api/host/me` API route for client-side host data fetching
- Sonner Toaster added to root layout for global toast support
- All 68 tests pass (29 new tests added, 39 existing tests unchanged)

### Change Log

- 2026-02-14: Story 2.1 implementation complete — onboarding flow, profile setup, settings page, host layout redirect

### File List

**New files:**
- src/app/(host)/onboarding/layout.tsx
- src/app/(host)/onboarding/page.tsx
- src/app/(host)/onboarding/actions.ts
- src/app/(host)/onboarding/page.test.tsx
- src/app/(host)/dashboard/settings/actions.ts
- src/app/(host)/dashboard/settings/settings-form.tsx
- src/app/(host)/dashboard/settings/settings-form.test.tsx
- src/app/api/host/me/route.ts
- src/components/onboarding/onboarding-stepper.tsx
- src/components/onboarding/onboarding-stepper.test.tsx
- src/components/onboarding/slug-input.tsx
- src/components/onboarding/slug-input.test.tsx
- src/components/onboarding/profile-form.tsx
- src/lib/validations/host.ts
- src/lib/validations/host.test.ts
- src/components/ui/input.tsx (shadcn)
- src/components/ui/textarea.tsx (shadcn)
- src/components/ui/form.tsx (shadcn)
- src/components/ui/label.tsx (shadcn)
- src/components/ui/sonner.tsx (shadcn)

**Modified files:**
- src/services/host.service.ts (added updateProfile, isSlugAvailable, suggestSlug)
- src/app/(host)/dashboard/settings/page.tsx (replaced placeholder with real settings page)
- src/app/(host)/layout.tsx (added onboarding redirect and conditional chrome rendering)
- src/lib/supabase/middleware.ts (added x-pathname header)
- src/app/layout.tsx (added Sonner Toaster)
- package.json (added sonner, next-themes dependencies via shadcn)
