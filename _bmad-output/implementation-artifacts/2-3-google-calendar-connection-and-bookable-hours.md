# Story 2.3: Google Calendar Connection & Bookable Hours (Step 3/5)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a host,
I want to connect my Google Calendar and set my bookable hours during onboarding,
So that TimeTap knows when I'm available and can avoid scheduling conflicts with my existing calendar events.

## Acceptance Criteria

1. **Given** the host is on onboarding step 3, **When** the page loads, **Then** they see a "Connect Google Calendar" section explaining the benefit: "We'll check your calendar to avoid double bookings", **And** a "Connect Calendar" button that triggers Google OAuth with calendar scopes (`calendar.events`, `calendar.readonly`), **And** the progress bar shows step 3 active.

2. **Given** the host clicks "Connect Calendar", **When** the Google OAuth flow initiates, **Then** they are redirected to Google's OAuth consent screen requesting `calendar.events` and `calendar.readonly` scopes, **And** on successful authorization, they return to `/api/auth/callback/google`, **And** the host's `googleRefreshToken` is stored securely in the database, **And** a success confirmation appears: "Calendar connected!", **And** the bookable hours section becomes visible below.

3. **Given** the Google OAuth flow fails or the host cancels, **When** they return to the onboarding page, **Then** they see a warm message: "Google Calendar connection didn't go through. Let's try again." with a retry button, **And** no dead end — the host can always retry.

4. **Given** the bookable hours section is visible, **When** the host interacts with the weekly hours grid, **Then** they see a 7-column (Mon–Sun) grid with 1-hour time blocks from 8am to 8pm, **And** Mon–Fri 9:00–17:00 is pre-selected as default, **And** tapping a block toggles it between available (`primary-light` background, `primary` border) and unavailable (`surface` background, `divider` border), **And** the grid is keyboard navigable (arrow keys move, Space/Enter toggles).

5. **Given** the host has set their hours and clicks "Continue", **When** the save action runs, **Then** the bookable hours are saved as JSON to the host's `bookableHours` field, **And** the stepper advances to step 4.

6. **Given** an onboarded host navigates to `/dashboard/settings`, **When** the settings page loads, **Then** they see their current bookable hours displayed in the same weekly hours grid component, **And** they can toggle time blocks to modify their availability at any time (FR8), **And** clicking "Save hours" updates the `bookableHours` JSON field, **And** a toast confirms: "Hours updated", **And** changes take effect immediately for future availability computations.

7. **Given** an onboarded host navigates to `/dashboard/settings`, **When** the Google Calendar status shows "Not connected", **Then** a "Connect" link is visible that initiates the Google OAuth flow (same as onboarding), **And** on return, the status updates to "Connected".

## Tasks / Subtasks

- [x] Task 1: Create Google OAuth helper module (AC: #2)
  - [x] 1.1 Create `src/lib/google/auth.ts` — Google OAuth2 client factory and helpers using the `googleapis` package: `createOAuth2Client()` returns a configured `google.auth.OAuth2` instance with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and redirect URI derived from `NEXT_PUBLIC_APP_URL`; `getGoogleCalendarAuthUrl(state: string)` calls `oauth2Client.generateAuthUrl()` with `access_type: 'offline'`, `prompt: 'consent'`, `scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly']`, and the state param; `exchangeCodeForTokens(code: string)` calls `oauth2Client.getToken(code)` and returns `tokens.refresh_token`
  - [x] 1.2 Remove `src/lib/google/.gitkeep` (no longer needed once real files exist)

- [x] Task 2: Create Google OAuth initiation route (AC: #2)
  - [x] 2.1 Create `src/app/api/google/connect/route.ts` — GET handler that mirrors the Stripe connect pattern: verifies the host is authenticated (Supabase auth check), generates a cryptographic random state token via `crypto.randomBytes(32).toString("hex")`, stores state in an HTTP-only cookie (`google_oauth_state`, 10 min max-age, secure in production, sameSite lax), calls `getGoogleCalendarAuthUrl(state)` to build the OAuth URL, then redirects the host to Google's consent screen

- [x] Task 3: Create Google OAuth callback route (AC: #2, #3)
  - [x] 3.1 Create `src/app/api/auth/callback/google/route.ts` — GET handler that mirrors the Stripe callback pattern: extracts `code`, `state`, `error` from query params; validates state against the `google_oauth_state` cookie (CSRF protection); if error or no code, redirects to `/onboarding?step=3&error=google_connect_failed`; if valid, calls `exchangeCodeForTokens(code)` to get `refresh_token`; if no refresh_token returned (user previously authorized without revoke), log warning and redirect with error; calls `hostService.updateGoogleRefreshToken(hostId, refreshToken)` to save; clears the state cookie; redirects to `/onboarding?step=3&google=connected`
  - [x] 3.2 Add `updateGoogleRefreshToken(hostId: string, refreshToken: string)` method to `src/services/host.service.ts` — updates the host record's `googleRefreshToken` field

- [x] Task 4: Create bookable hours validation schema (AC: #5)
  - [x] 4.1 Add `bookableHoursSchema` to `src/lib/validations/host.ts` — validates the JSON structure: an object with day keys (`monday`, `tuesday`, ..., `sunday`), each containing an array of `{ start: string, end: string }` time range objects where start/end are in `"HH:00"` format (whole hours 08-20), and start < end. Export `BookableHoursInput` type.

- [x] Task 5: Create save bookable hours server action (AC: #5, #6)
  - [x] 5.1 Add `saveBookableHours` action to `src/app/(host)/onboarding/actions.ts` — follows the established Server Action pattern: validates input with `bookableHoursSchema`, checks auth via Supabase, calls `hostService.updateBookableHours(hostId, data)`, returns `ActionResult`
  - [x] 5.2 Add `updateBookableHours(hostId: string, bookableHours: BookableHoursInput)` method to `src/services/host.service.ts` — updates the host record's `bookableHours` field

- [x] Task 6: Create Weekly Hours Grid component (AC: #4)
  - [x] 6.1 Create `src/components/onboarding/weekly-hours-grid.tsx` — client component that renders a 7-column × 12-row grid (Mon–Sun, 8am–8pm in 1-hour blocks); each cell is a toggle button; selected state uses `bg-tt-primary-light border-tt-primary border-2`, unselected uses `bg-tt-surface border-tt-divider`; accepts `defaultValue` prop (pre-filled hours) and `onChange` callback; default pre-fill: Mon–Fri 9:00–17:00; mobile layout: horizontally scrollable container if needed, with day labels sticky; keyboard navigation: arrow keys move focus between cells, Space/Enter toggles; uses `role="grid"`, `role="row"`, `role="gridcell"` with `aria-pressed` on each cell

- [x] Task 7: Implement onboarding step 3 UI (AC: #1, #2, #3, #4, #5)
  - [x] 7.1 Update `STEP_TITLES` in `src/app/(host)/onboarding/page.tsx` — change step 3 description to "Connect your Google Calendar and set when you're available."
  - [x] 7.2 Create `src/components/onboarding/google-calendar-step.tsx` — client component with TWO sections:
    - **Section A (Calendar Connect):** Shows explanation paragraph ("We'll check your Google Calendar to avoid double bookings. Your clients will only see times when you're genuinely free."), renders a gradient primary "Connect Calendar" button (full-width, with Calendar icon from lucide-react), on click navigates to `/api/google/connect` (browser redirect), shows loading state while redirecting. If `calendarConnected` prop is true, shows "Calendar connected!" in `text-tt-success` with a checkmark icon instead of the button.
    - **Section B (Bookable Hours):** Only visible when `calendarConnected` is true. Shows "Set your bookable hours" subheading, renders the `<WeeklyHoursGrid>` component with Mon–Fri 9–17 defaults, and a "Continue" gradient primary button that calls the `saveBookableHours` action.
  - [x] 7.3 Update the onboarding page to render `<GoogleCalendarStep>` for step 3 (replacing the placeholder block for step 3). Add `googleRefreshToken` and `bookableHours` to the `HostData` interface. Handle return from Google OAuth: read `google` and `error` query params from URL via `useSearchParams()`, if `google=connected` re-fetch host data and confirm `googleRefreshToken` is present, if `error=google_connect_failed` show warm error message with retry button. After saving bookable hours, `setCurrentStep(4)`.

- [x] Task 8: Update settings page with Google Calendar connect link and bookable hours editor (AC: #6, #7)
  - [x] 8.1 Update the Google Calendar integration status in `src/app/(host)/dashboard/settings/page.tsx` — when `host.googleRefreshToken` is absent, show "Not connected — Connect" as a link pointing to `/api/google/connect` (same pattern as Stripe status row)
  - [x] 8.2 Add a "Bookable Hours" section to the settings page below Integrations — render the `<WeeklyHoursGrid>` component (client component wrapper needed) with the host's current `bookableHours` as default value, a "Save hours" button that calls `saveBookableHours`, and a `toast.success("Hours updated")` on save. Pass `host.bookableHours` data from the server component to the client form.

- [x] Task 9: Update `/api/host/me` to include `bookableHours` (AC: #4, #6)
  - [x] 9.1 Update `src/app/api/host/me/route.ts` — add `bookableHours: host.bookableHours` to the JSON response (currently returns `googleRefreshToken` but NOT `bookableHours`)

- [x] Task 10: Write tests (all ACs)
  - [x] 10.1 Create tests for `src/lib/google/auth.ts` — test `getGoogleCalendarAuthUrl` returns URL with correct scopes, state, access_type=offline, prompt=consent; test `exchangeCodeForTokens` calls `oauth2Client.getToken` and returns refresh_token; test error handling when getToken fails
  - [x] 10.2 Create tests for the Google connect route (`src/app/api/google/connect/route.test.ts`) — test authenticated redirect with state cookie set, test unauthenticated redirect to login
  - [x] 10.3 Create tests for the Google callback route (`src/app/api/auth/callback/google/route.test.ts`) — test successful flow (saves refresh token, redirects with `google=connected`), test error flow (redirects with error), test CSRF validation (rejects mismatched state), test missing refresh_token handling
  - [x] 10.4 Create tests for the `WeeklyHoursGrid` component — test renders 7 day columns and 12 time rows, test Mon–Fri 9–17 default selection, test toggling a cell calls onChange, test keyboard navigation (arrow keys, space/enter)
  - [x] 10.5 Create tests for the `GoogleCalendarStep` component — test renders connect button when not connected, test renders bookable hours when connected, test loading state, test error display and retry, test save calls action
  - [x] 10.6 Create tests for `bookableHoursSchema` validation — test valid hours, test invalid day, test invalid time format, test start >= end
  - [x] 10.7 Update onboarding page tests to cover step 3 flow — auto-advance from step 3 Google callback, bookable hours save advances to step 4, error handling for google_connect_failed

## Dev Notes

### Architecture Patterns & Constraints

**Google Calendar OAuth Flow (mirrors Stripe Connect pattern exactly):**

```
Host clicks "Connect Calendar"
  → GET /api/google/connect (generates OAuth URL, sets state cookie, redirects)
  → Google OAuth consent screen (host grants calendar permissions)
  → GET /api/auth/callback/google?code=CODE&state=STATE
  → Server exchanges code for tokens via googleapis oauth2Client.getToken()
  → Saves refresh_token to host record
  → Redirects to /onboarding?step=3&google=connected
  → Client reads query params, shows bookable hours section
```

**Critical: This is a SEPARATE OAuth flow from the initial Google sign-in.** During sign-in (Story 1.2), the host grants `openid`, `email`, `profile` scopes via Supabase Auth. During onboarding step 3, the host grants `calendar.events` and `calendar.readonly` scopes via a direct Google OAuth flow using the `googleapis` package — NOT through Supabase. These are independent OAuth grants.

**Google OAuth2 Client Setup:**

```typescript
import { google } from "googleapis"

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
  )
}
```

**Google OAuth URL Generation:**

```typescript
export function getGoogleCalendarAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",    // Forces consent screen — guarantees refresh_token
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    state,
  })
}
```

**Google Token Exchange:**

```typescript
export async function exchangeCodeForTokens(code: string): Promise<string> {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  if (!tokens.refresh_token) {
    throw new Error("No refresh token received — user may have previously authorized without revoking")
  }
  return tokens.refresh_token
}
```

**Critical: `prompt: 'consent'` is REQUIRED.** Without it, Google only returns a `refresh_token` on the first authorization. If the user has previously authorized the app, subsequent authorizations return only an `access_token`. Setting `prompt: 'consent'` forces the consent screen every time and guarantees a `refresh_token` in the response.

**CSRF Protection (identical to Stripe pattern):**

```typescript
import crypto from "crypto"

// Generate state
const state = crypto.randomBytes(32).toString("hex")

// Store in HTTP-only cookie
response.cookies.set("google_oauth_state", state, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 10, // 10 minutes
})

// On callback, validate:
const storedState = request.cookies.get("google_oauth_state")?.value
if (!state || state !== storedState) {
  // CSRF attack — reject
}
```

**Bookable Hours JSON Schema:**

```typescript
// Stored in host.bookableHours as JSON
type BookableHours = {
  monday: TimeRange[]
  tuesday: TimeRange[]
  wednesday: TimeRange[]
  thursday: TimeRange[]
  friday: TimeRange[]
  saturday: TimeRange[]
  sunday: TimeRange[]
}

type TimeRange = {
  start: string  // "09:00" format (whole hours only for MVP)
  end: string    // "17:00" format
}

// Default value (Mon-Fri 9-17):
const DEFAULT_BOOKABLE_HOURS: BookableHours = {
  monday: [{ start: "09:00", end: "17:00" }],
  tuesday: [{ start: "09:00", end: "17:00" }],
  wednesday: [{ start: "09:00", end: "17:00" }],
  thursday: [{ start: "09:00", end: "17:00" }],
  friday: [{ start: "09:00", end: "17:00" }],
  saturday: [],
  sunday: [],
}
```

The grid component translates this to/from a visual grid: each selected cell maps to a 1-hour TimeRange entry for that day. Consecutive hours are merged into a single range (e.g., cells 9, 10, 11, 12 → `{ start: "09:00", end: "13:00" }`).

**Server Action Pattern (for `saveBookableHours`):**

```typescript
"use server"

export async function saveBookableHours(
  input: BookableHoursInput
): Promise<ActionResult<Host>> {
  // 1. Validate input with bookableHoursSchema
  // 2. Auth check via Supabase
  // 3. Call hostService.updateBookableHours(hostId, data)
  // 4. Return ActionResult
}
```

**Service Layer Pattern:**

```typescript
// src/services/host.service.ts
async updateGoogleRefreshToken(hostId: string, refreshToken: string) {
  return prisma.host.update({
    where: { id: hostId },
    data: { googleRefreshToken: refreshToken },
  })
},

async updateBookableHours(hostId: string, bookableHours: BookableHoursInput) {
  return prisma.host.update({
    where: { id: hostId },
    data: { bookableHours },
  })
},
```

### Critical Implementation Details

**Onboarding Step 3 UI Specs (from UX spec):**

- Progress bar: segments 1-2 completed (gradient fill), segment 3 active (gradient fill), segments 4-5 future (divider color)
- Centered column (max-width 480px), no sidebar/tab bar (onboarding layout handles this)
- TWO sections in one step:
  - Section A: "Connect Google Calendar" — gradient CTA button, explanation text
  - Section B: "Set your bookable hours" — weekly hours grid, appears AFTER calendar connected
- Explanation text in `text-tt-text-secondary`, body size (16px)
- If error: warm message on `bg-tt-error-light` background in `text-tt-error` with retry button
- Continue button (gradient primary) only enabled after calendar connected AND hours set

**Weekly Hours Grid Component Specs (from UX spec — Component #13):**

- 7 columns (Mon–Sun) × time blocks (1-hour increments, 8am–8pm = 12 rows)
- Each block is a toggle: tap to enable/disable
- Default pre-fill: Mon–Fri 9–17 selected
- Available (selected): `bg-tt-primary-light` background, `border-tt-primary` border
- Unavailable (deselected): `bg-tt-surface` background, `border-tt-divider` border
- Tapped: immediate toggle with subtle transition
- Keyboard navigable: Arrow keys move between cells, Space/Enter toggles
- Accessibility: `role="grid"`, cells use `aria-pressed`
- Mobile: the grid should be responsive — consider reducing day label width or enabling horizontal scroll on very small screens. Day headers use abbreviated names (Mon, Tue, etc.). Time labels on the left column.

**Error Handling — Google OAuth Errors:**

| Error Scenario | User Message |
|---|---|
| Host clicks "Cancel" on Google consent | "Google Calendar connection didn't go through. Let's try again." |
| Invalid credentials (GOOGLE_CLIENT_ID wrong) | Same warm message + log error server-side |
| No refresh_token returned | Same warm message (force `prompt: consent` to prevent) |
| Network/timeout | Same warm message |

**Query Parameter Handling in Next.js 16:**

```typescript
"use client"
import { useSearchParams } from "next/navigation"

const searchParams = useSearchParams()
const googleStatus = searchParams.get("google") // "connected" | null
const error = searchParams.get("error") // "google_connect_failed" | null
```

**Color Tokens (CRITICAL — use tt- prefix):**

- Gradient button: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`
- Selected grid cell: `bg-tt-primary-light border-tt-primary`
- Unselected grid cell: `bg-tt-surface border-tt-divider`
- Error background: `bg-tt-error-light`
- Error text: `text-tt-error`
- Success text: `text-tt-success`
- Muted text: `text-tt-text-muted`
- Secondary text: `text-tt-text-secondary`
- Body text: `text-tt-text-body`

### Previous Story Intelligence

**From Story 2.2 (most recent, completed):**
- Stripe OAuth flow is the EXACT template for Google OAuth — same route pattern (`/api/stripe/connect` → `/api/auth/callback/stripe`), same CSRF state cookie, same onboarding page query param handling
- `StripeConnectStep` component is the model for `GoogleCalendarStep` — gradient button, explanation text, error display
- Onboarding page already handles `step`, `stripe`, and `error` query params — needs extension for `google` param
- 87 tests pass — no regressions allowed

**From Story 2.2 — Debug Learnings:**
- Fake timers in Vitest need `shouldAdvanceTime: true`
- `useSearchParams()` mock: use `mockSearchParams = new URLSearchParams()` and mutate per test
- When testing components that navigate via `window.location.href`, mock with `vi.stubGlobal`
- Found multiple elements issue: use `getByRole("heading")` to disambiguate h1 title vs button text
- Test pattern for OAuth return: set search params, render, use `waitFor` for async state updates

**From Story 2.1:**
- `ProfileForm` established the pattern for form submission → `startTransition` → action call → advance step
- Host data fetched via `/api/host/me` on mount — this endpoint already returns `googleRefreshToken` but NOT `bookableHours` (must add)
- Sonner toast available globally via `toast.success("...")` from `sonner`

**From Story 1.2:**
- Auth callback at `src/app/auth/callback/route.ts` handles Supabase PKCE — this is SEPARATE from the Google Calendar OAuth callback
- `createClient()` from `@/lib/supabase/server` for server-side auth checks

### Git Intelligence

**Recent commits (most recent first):**
1. `ba97836` — "Story 2.2: Stripe Connect Integration (Step 2/5)"
2. `195220b` — "Story 2.1: Onboarding Flow & Profile Setup (Step 1/5)"
3. `50dff39` — "Story 1.3: Route Protection & Dashboard Shell"
4. `00495b5` — "started to set up APIs and services"
5. `3d696b7` — "1.1 — Project Initialization & Database Foundation"

**Patterns established:**
- Service pattern: `hostService` as plain object with methods using Prisma client singleton
- Route Handler pattern: `export async function GET(request: Request) { ... }`
- OAuth pattern: initiation route generates URL + sets state cookie → callback route validates state + exchanges code + updates DB → redirect with query params → client reads params
- Tests: Vitest + testing-library, mocked Supabase and Prisma, co-located `.test.ts(x)` files
- shadcn components already installed: button, card, avatar, badge, skeleton, separator, input, textarea, form, label, sonner

### Web Research — Google Calendar OAuth with `googleapis` (v171.4.0)

**Key findings:**
- `google.auth.OAuth2` constructor takes `(clientId, clientSecret, redirectUri)`
- `oauth2Client.generateAuthUrl(options)` is **synchronous** — returns a string URL
- `oauth2Client.getToken(code)` is **async** — returns `{ tokens: { access_token, refresh_token, ... } }`
- `refresh_token` is ONLY returned on the FIRST authorization unless `prompt: 'consent'` is set
- Setting `access_type: 'offline'` is required to get a refresh token at all
- Setting `prompt: 'consent'` forces the consent screen and guarantees `refresh_token` every time
- Scopes needed: `calendar.events` (read/write for booking events) + `calendar.readonly` (read for busy times)
- The redirect URI MUST match exactly what's configured in Google Cloud Console — `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
- Google Cloud Console must have "Google Calendar API" enabled

**Google Cloud Console Configuration Required:**
- The same Google Cloud project used for sign-in OAuth (Story 1.2)
- Authorized redirect URIs must include: `http://localhost:3000/api/auth/callback/google` (dev), `https://timetap.it/api/auth/callback/google` (prod)
- Calendar API must be enabled (may already be from Phase 4 setup)

### Dependencies to Install

```bash
# No new npm dependencies needed — googleapis@^171.4.0 already installed
```

**Already installed (from previous stories):**
- googleapis ^171.4.0
- lucide-react 0.563.0
- sonner 2.0.7
- zod (for validation schema)
- All shadcn components needed

### Project Structure Notes

**Files to create:**
- `src/lib/google/auth.ts` — Google OAuth2 client and helpers
- `src/app/api/google/connect/route.ts` — OAuth initiation (generates URL, sets state cookie, redirects)
- `src/app/api/auth/callback/google/route.ts` — OAuth callback (exchanges code, saves refresh token)
- `src/components/onboarding/google-calendar-step.tsx` — Onboarding step 3 UI component (calendar connect + bookable hours)
- `src/components/onboarding/weekly-hours-grid.tsx` — Visual availability editor component

**Files to modify:**
- `src/app/(host)/onboarding/page.tsx` — replace step 3 placeholder with `GoogleCalendarStep`, add `googleRefreshToken` and `bookableHours` to `HostData` interface, handle `google` query param for return from OAuth, advance to step 4 after saving hours
- `src/app/(host)/onboarding/actions.ts` — add `saveBookableHours` server action
- `src/services/host.service.ts` — add `updateGoogleRefreshToken()` and `updateBookableHours()` methods
- `src/lib/validations/host.ts` — add `bookableHoursSchema` and `BookableHoursInput` type
- `src/app/(host)/dashboard/settings/page.tsx` — add "Connect" link to Google Calendar row (currently just shows "Not connected" with no action), add bookable hours editor section
- `src/app/api/host/me/route.ts` — add `bookableHours` to the JSON response

**Files to delete:**
- `src/lib/google/.gitkeep` — no longer needed once real files exist

**Existing files to use (do not modify unless listed above):**
- `src/lib/supabase/server.ts` — server Supabase client (for auth checks in route handlers)
- `src/lib/prisma.ts` — Prisma singleton
- `src/types/actions.ts` — `ActionResult<T>` type
- `src/lib/utils.ts` — `cn()` utility
- `src/components/onboarding/onboarding-stepper.tsx` — reused as-is
- `src/app/(host)/onboarding/layout.tsx` — handles auth, no modification needed
- `prisma/schema.prisma` — `googleRefreshToken` and `bookableHours` fields already exist, NO schema changes needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Google Calendar & Meet Setup]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: Host Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Weekly Hours Grid (Component #13)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: _bmad-output/implementation-artifacts/2-2-stripe-connect-integration.md]
- [Source: googleapis@^171.4.0 — google.auth.OAuth2 API]
- [Source: Google Calendar API OAuth2 documentation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed googleapis mock: `vi.fn().mockImplementation()` doesn't work as constructor — must use `class MockOAuth2` pattern

### Completion Notes List

- Implemented complete Google Calendar OAuth flow mirroring the Stripe Connect pattern (Tasks 1-3)
- Created `bookableHoursSchema` Zod validation with HH:00 format, 08-20 range, start < end checks (Task 4)
- Added `saveBookableHours` server action following established ActionResult pattern (Task 5)
- Built accessible `WeeklyHoursGrid` component with ARIA grid roles, keyboard navigation, toggle states (Task 6)
- Implemented `GoogleCalendarStep` onboarding component with two-phase UX: connect then set hours (Task 7)
- Updated settings page with "Connect" link for Google Calendar and bookable hours editor with toast feedback (Task 8)
- Added `bookableHours` to `/api/host/me` response (Task 9)
- All 133 tests pass (46 new tests added, 0 regressions) across 21 test files (Task 10)

### File List

**New files:**
- src/lib/google/auth.ts
- src/lib/google/auth.test.ts
- src/app/api/google/connect/route.ts
- src/app/api/google/connect/route.test.ts
- src/app/api/auth/callback/google/route.ts
- src/app/api/auth/callback/google/route.test.ts
- src/components/onboarding/weekly-hours-grid.tsx
- src/components/onboarding/weekly-hours-grid.test.tsx
- src/components/onboarding/google-calendar-step.tsx
- src/components/onboarding/google-calendar-step.test.tsx
- src/app/(host)/dashboard/settings/bookable-hours-editor.tsx

**Modified files:**
- src/services/host.service.ts
- src/lib/validations/host.ts
- src/lib/validations/host.test.ts
- src/app/(host)/onboarding/actions.ts
- src/app/(host)/onboarding/page.tsx
- src/app/(host)/onboarding/page.test.tsx
- src/app/(host)/dashboard/settings/page.tsx
- src/app/api/host/me/route.ts

**Deleted files:**
- src/lib/google/.gitkeep

### Change Log

- 2026-02-14: Story 2.3 implemented — Google Calendar OAuth connection, bookable hours grid, settings page updates, 46 new tests
