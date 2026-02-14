# Story 2.2: Stripe Connect Integration (Step 2/5)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a host,
I want to connect my Stripe account during onboarding,
So that I can receive payments from customers who buy my packages.

## Acceptance Criteria

1. **Given** the host is on onboarding step 2, **When** the page loads, **Then** they see "Connect your Stripe account to receive payments" with a clear explanation of why, **And** a single "Connect Stripe" button (gradient primary), **And** the progress bar shows step 2 active.

2. **Given** the host clicks "Connect Stripe", **When** the Stripe Connect Standard OAuth flow initiates, **Then** they are redirected to Stripe's OAuth page, **And** on successful connection, they return to `/api/auth/callback/stripe`, **And** the host's `stripeAccountId` is saved to their record, **And** the onboarding advances to step 3.

3. **Given** the Stripe OAuth flow fails or the host cancels, **When** they return to the onboarding page, **Then** they see a warm message: "Stripe connection didn't go through. Let's try again." with a retry button, **And** no dead end — the host can always retry.

## Tasks / Subtasks

- [x] Task 1: Create Stripe client module and connect OAuth helpers (AC: #2)
  - [x] 1.1 Create `src/lib/stripe/client.ts` — server-side Stripe instance: `new Stripe(process.env.STRIPE_SECRET_KEY!)` with TypeScript enabled
  - [x] 1.2 Create `src/lib/stripe/connect.ts` — helper functions: `getStripeConnectUrl(state: string, hostEmail?: string)` using `stripe.oauth.authorizeUrl()` (synchronous method), and `exchangeCodeForAccount(code: string)` using `stripe.oauth.token()` (async method)
  - [x] 1.3 Add `STRIPE_CLIENT_ID` to `.env.example` — this is the Connect platform client ID (`ca_...`) from Stripe Dashboard > Connect > Settings, separate from `STRIPE_SECRET_KEY`

- [x] Task 2: Create Stripe Connect OAuth initiation route (AC: #2)
  - [x] 2.1 Create `src/app/api/stripe/connect/route.ts` — GET handler that: verifies the host is authenticated (Supabase auth check), generates a cryptographic random state token, stores state in an HTTP-only cookie (`stripe_oauth_state`, 10 min max-age, secure in production, sameSite lax), calls `getStripeConnectUrl(state, host.email)` to build the OAuth URL with `client_id`, `response_type: 'code'`, `scope: 'read_write'`, `redirect_uri`, and `stripe_user` prefill (email from host record), then redirects the host to Stripe's OAuth page

- [x] Task 3: Create Stripe OAuth callback route (AC: #2, #3)
  - [x] 3.1 Create `src/app/api/auth/callback/stripe/route.ts` — GET handler that: extracts `code`, `state`, `error`, `error_description` from query params; validates state against the `stripe_oauth_state` cookie (CSRF protection); if error or no code, redirects to `/onboarding?step=2&error=stripe_connect_failed`; if valid, calls `exchangeCodeForAccount(code)` to get `stripe_user_id`; calls `hostService.updateStripeAccountId(hostId, stripeAccountId)` to save the connected account ID; clears the state cookie; redirects to `/onboarding?step=2&stripe=connected`
  - [x] 3.2 Add `updateStripeAccountId(hostId: string, stripeAccountId: string)` method to `src/services/host.service.ts` — updates the host record's `stripeAccountId` field

- [x] Task 4: Implement onboarding step 2 UI (AC: #1, #2, #3)
  - [x] 4.1 Update `STEP_TITLES` in `src/app/(host)/onboarding/page.tsx` — change step 2 title to "Connect Stripe" and description to "Connect your Stripe account so you can receive payments from your clients."
  - [x] 4.2 Create `src/components/onboarding/stripe-connect-step.tsx` — client component that: shows an explanation paragraph ("When clients purchase your packages, payments go directly to your Stripe account. Connect now so everything's ready when you go live."), renders a gradient primary "Connect Stripe" button (full-width, with Stripe icon or lock icon from lucide-react), on click navigates to `/api/stripe/connect` (browser redirect, not fetch), shows loading state while redirecting
  - [x] 4.3 Handle return from Stripe OAuth in the onboarding page: read `step` and `stripe` query params from URL via `useSearchParams()`, if `stripe=connected` auto-advance to step 3, if `error=stripe_connect_failed` show warm error message with retry button
  - [x] 4.4 Re-fetch host data after Stripe connection to confirm `stripeAccountId` is present before advancing

- [x] Task 5: Update settings page with Stripe connection status (AC: ties to Story 2.1 AC#5)
  - [x] 5.1 Update the integration status section in `src/app/(host)/dashboard/settings/settings-form.tsx` — the Stripe status should be dynamic: if `host.stripeAccountId` exists show "Connected" in `text-tt-success`, else show "Not connected" in `text-tt-text-muted` with a "Connect" link pointing to `/api/stripe/connect`

- [x] Task 6: Write tests (all ACs)
  - [x] 6.1 Create tests for `src/lib/stripe/connect.ts` — test `getStripeConnectUrl` returns proper URL with all params, test `exchangeCodeForAccount` calls `stripe.oauth.token` correctly
  - [x] 6.2 Create tests for the Stripe callback route — test successful flow (saves account ID, redirects), test error flow (redirects with error), test CSRF validation (rejects mismatched state)
  - [x] 6.3 Create tests for the `StripeConnectStep` component — test renders button, test loading state, test error display and retry
  - [x] 6.4 Update onboarding page tests to cover step 2 flow (advancing from step 1 to step 2, handling query params)

## Dev Notes

### Architecture Patterns & Constraints

**Stripe Connect Standard OAuth Flow:**

The Stripe Connect Standard OAuth flow uses `stripe.oauth.authorizeUrl()` (synchronous, returns string) and `stripe.oauth.token()` (async, returns `OAuthToken`). The `stripe@20.3.1` package exposes these on `stripe.oauth`.

```
Host clicks "Connect Stripe"
  → GET /api/stripe/connect (generates OAuth URL, sets state cookie, redirects)
  → Stripe OAuth page (host grants permission)
  → GET /api/auth/callback/stripe?code=CODE&state=STATE
  → Server exchanges code for stripe_user_id via stripe.oauth.token()
  → Saves stripeAccountId to host record
  → Redirects to /onboarding?step=2&stripe=connected
  → Client reads query params, advances to step 3
```

**Critical: STRIPE_CLIENT_ID is NOT the same as STRIPE_SECRET_KEY or STRIPE_PUBLISHABLE_KEY.** It's a separate value (`ca_...`) found in Stripe Dashboard > Connect > Settings. Must be added to `.env.example` and `.env.local`.

**Stripe OAuth State/CSRF Protection:**

```typescript
import crypto from "crypto"

// Generate state
const state = crypto.randomBytes(32).toString("hex")

// Store in HTTP-only cookie (not in client state — server-side only)
response.cookies.set("stripe_oauth_state", state, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 10, // 10 minutes
})

// On callback, validate:
const storedState = request.cookies.get("stripe_oauth_state")?.value
if (!state || state !== storedState) {
  // CSRF attack — reject
}
```

**Stripe Connect OAuth URL Generation (synchronous):**

```typescript
import { stripe } from "@/lib/stripe/client"

const authUrl = stripe.oauth.authorizeUrl({
  client_id: process.env.STRIPE_CLIENT_ID!,
  response_type: "code",
  scope: "read_write",
  redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/stripe`,
  state,
  stripe_user: {
    email: hostEmail, // pre-fill from host record
  },
})
```

**Stripe OAuth Token Exchange (async):**

```typescript
const oauthToken = await stripe.oauth.token({
  grant_type: "authorization_code",
  code,
})
// oauthToken.stripe_user_id is the connected account ID (e.g., "acct_1ABC...")
```

**Server Action Pattern (for reference — NOT used for OAuth redirect):**

The Stripe OAuth flow uses Route Handlers (GET), not Server Actions, because it involves browser redirects to/from external URLs. Server Actions are for user-facing mutations only. Route Handlers are correct for OAuth callbacks (per architecture doc).

**Service Layer Pattern (must follow):**

```typescript
// src/services/host.service.ts
async updateStripeAccountId(hostId: string, stripeAccountId: string) {
  return prisma.host.update({
    where: { id: hostId },
    data: { stripeAccountId },
  })
}
```

### Critical Implementation Details

**Onboarding Step 2 UI Specs (from UX spec):**

- Progress bar: segment 1 completed (gradient fill), segment 2 active (gradient fill), segments 3-5 future (divider color)
- Centered column (max-width 480px), no sidebar/tab bar (onboarding layout handles this)
- One primary CTA: "Connect Stripe" — gradient button, full-width
- Explanation text in `text-tt-text-secondary`, body size (16px)
- If error: warm message in `text-tt-error` on `bg-tt-error-light` background with retry button
- No skip option on this step (Stripe is required for the product to work)

**Error Handling — Stripe OAuth Errors:**

| Error Value | Meaning | User Message |
|---|---|---|
| `access_denied` | Host clicked "Cancel" on Stripe | "Stripe connection didn't go through. Let's try again." |
| `invalid_client` | `STRIPE_CLIENT_ID` is wrong | Same warm message + log error server-side |
| Network/timeout | Stripe is unreachable | Same warm message |

**Query Parameter Handling in Next.js 16:**

`searchParams` is a Promise in Next.js 16. Use `useSearchParams()` hook in client components:

```typescript
"use client"
import { useSearchParams } from "next/navigation"

const searchParams = useSearchParams()
const stripeStatus = searchParams.get("stripe") // "connected" | null
const error = searchParams.get("error") // "stripe_connect_failed" | null
```

**Color Tokens (CRITICAL — use tt- prefix):**

- Gradient button: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`
- Error background: `bg-tt-error-light`
- Error text: `text-tt-error`
- Success text: `text-tt-success`
- Muted text: `text-tt-text-muted`
- Secondary text: `text-tt-text-secondary`
- Body text: `text-tt-text-body`

### Previous Story Intelligence

**From Story 2.1 (most recent, completed):**
- Onboarding page is at `src/app/(host)/onboarding/page.tsx` — client component with `useState` for `currentStep`
- Steps 2-5 are currently placeholders with disabled Continue buttons
- Host data fetched via `/api/host/me` endpoint on mount
- `ProfileForm` handles step 1 submission, advances to step 2 on success
- Onboarding layout at `src/app/(host)/onboarding/layout.tsx` — chrome-free, centered 480px, auth check
- Settings page has integration status section (Google Calendar, Stripe) — currently reads from host props
- Sonner toast available globally via `toast.success("...")` from `sonner`
- 68 tests pass — no regressions allowed

**From Story 2.1 — Debug Learnings:**
- `@hookform/resolvers` already installed, no separate install needed
- Fake timers in Vitest need `shouldAdvanceTime: true`
- Host layout uses `x-pathname` header set in proxy.ts for path detection
- Prisma unique constraint violations: catch `PrismaClientKnownRequestError` with code `P2002`
- shadcn `toast` component deprecated, use `sonner` instead

**From Story 1.2:**
- Auth callback pattern established at `src/app/auth/callback/route.ts` — uses Supabase `exchangeCodeForSession(code)`, creates host record, redirects based on onboarding status
- `createClient()` from `@/lib/supabase/server` for server-side auth checks

### Git Intelligence

**Recent commits (most recent first):**
1. `195220b` — "Story 2.1: Onboarding Flow & Profile Setup (Step 1/5)"
2. `50dff39` — "Story 1.3: Route Protection & Dashboard Shell"
3. `00495b5` — "started to set up APIs and services"
4. `3d696b7` — "1.1 — Project Initialization & Database Foundation"

**Patterns established:**
- Service pattern: `hostService` as plain object with methods using Prisma client singleton
- Route Handler pattern: `export async function GET(request: Request) { ... }`
- Tests: Vitest + testing-library, mocked Supabase and Prisma, co-located `.test.ts(x)` files
- shadcn components already installed: button, card, avatar, badge, skeleton, separator, input, textarea, form, label, sonner

### Web Research — Stripe Connect Standard OAuth (stripe@20.3.1)

**Key findings:**
- `stripe.oauth.authorizeUrl(params)` is **synchronous** — returns a string URL, NOT a promise
- `stripe.oauth.token(params)` is **async** — returns `Promise<Stripe.OAuthToken>`
- `stripe.oauth.deauthorize(params)` is **async** — for future use when disconnecting
- The `OAuthToken` response includes `stripe_user_id` (the connected account ID `acct_...`), `access_token`, `refresh_token`, `scope`, `livemode`
- For making API calls on behalf of connected accounts, pass `{ stripeAccount: stripeAccountId }` as request options
- Authorization code from the callback is **one-time use** and expires in 5 minutes
- `STRIPE_CLIENT_ID` (`ca_...`) is separate from `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`

**Important deprecation note:** Stripe Standard accounts with OAuth are being deprecated for new platforms. If the TimeTap Stripe Connect platform was NOT created yet, the dev should check whether the platform can use Standard OAuth. If blocked, the alternative is `stripe.accounts.create()` + Account Sessions for embedded onboarding. The architecture doc specifies Stripe Connect Standard, so proceed with OAuth but be prepared to pivot if Stripe blocks it for new platforms.

### Dependencies to Install

```bash
# No new npm dependencies needed — stripe@20.3.1 and @stripe/stripe-js@8.7.0 already installed
```

**Already installed (from previous stories):**
- stripe 20.3.1
- @stripe/stripe-js 8.7.0
- lucide-react 0.563.0
- sonner 2.0.7
- All shadcn components needed

### Project Structure Notes

**Files to create:**
- `src/lib/stripe/client.ts` — Stripe server instance
- `src/lib/stripe/connect.ts` — OAuth helper functions
- `src/app/api/stripe/connect/route.ts` — OAuth initiation (generates URL, sets state cookie, redirects)
- `src/app/api/auth/callback/stripe/route.ts` — OAuth callback (exchanges code, saves account ID)
- `src/components/onboarding/stripe-connect-step.tsx` — Onboarding step 2 UI component

**Files to modify:**
- `src/app/(host)/onboarding/page.tsx` — replace step 2 placeholder with StripeConnectStep, handle query params for return from OAuth
- `src/services/host.service.ts` — add `updateStripeAccountId()` method
- `src/app/(host)/dashboard/settings/settings-form.tsx` — update Stripe integration status to link to connect if not connected
- `.env.example` — add `STRIPE_CLIENT_ID`

**Existing files to use (do not modify unless listed above):**
- `src/lib/supabase/server.ts` — server Supabase client (for auth checks in route handlers)
- `src/lib/prisma.ts` — Prisma singleton
- `src/types/actions.ts` — `ActionResult<T>` type
- `src/lib/utils.ts` — `cn()` utility
- `src/components/onboarding/onboarding-stepper.tsx` — reused as-is
- `src/app/(host)/onboarding/layout.tsx` — handles auth, no modification needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Stripe Connect Setup]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: Host Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Onboarding Stepper]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: _bmad-output/implementation-artifacts/2-1-onboarding-flow-and-profile-setup.md]
- [Source: stripe@20.3.1 OAuth.d.ts type definitions]
- [Source: Stripe Connect Standard OAuth documentation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Test failure: "Found multiple elements with the text: Connect Stripe" — h1 title and button both had same text. Fixed by using `getByRole("heading")` in test.

### Completion Notes List

- Task 1: Created Stripe client singleton (`src/lib/stripe/client.ts`) and Connect OAuth helpers (`src/lib/stripe/connect.ts`) with `getStripeConnectUrl()` (sync) and `exchangeCodeForAccount()` (async). Added `STRIPE_CLIENT_ID` to `.env.example`.
- Task 2: Created OAuth initiation route at `/api/stripe/connect` — authenticates host, generates CSRF state token in HTTP-only cookie, redirects to Stripe OAuth with email prefill.
- Task 3: Created OAuth callback route at `/api/auth/callback/stripe` — validates CSRF state, exchanges code for `stripe_user_id`, saves to host record via service, redirects to onboarding with success/error params. Added `updateStripeAccountId()` to host service.
- Task 4: Implemented onboarding step 2 UI with `StripeConnectStep` component (gradient CTA, warm error message, loading state). Updated onboarding page to handle OAuth return via `useSearchParams()`, auto-advances to step 3 after re-fetching host data confirms `stripeAccountId`.
- Task 5: Updated settings page Stripe status — shows "Not connected — Connect" link to `/api/stripe/connect` when no `stripeAccountId`.
- Task 6: Wrote 22 new tests across 4 test files: connect helpers (3), callback route (7), StripeConnectStep component (6), onboarding page step 2 flow (6). All 87 tests pass, 0 regressions.

### File List

**New files:**
- `src/lib/stripe/client.ts` — Stripe server-side client singleton
- `src/lib/stripe/connect.ts` — Stripe Connect OAuth helper functions
- `src/app/api/stripe/connect/route.ts` — OAuth initiation route handler
- `src/app/api/auth/callback/stripe/route.ts` — OAuth callback route handler
- `src/components/onboarding/stripe-connect-step.tsx` — Onboarding step 2 UI component
- `src/lib/stripe/connect.test.ts` — Tests for connect helpers
- `src/app/api/auth/callback/stripe/route.test.ts` — Tests for callback route
- `src/components/onboarding/stripe-connect-step.test.tsx` — Tests for StripeConnectStep component

**Modified files:**
- `src/app/(host)/onboarding/page.tsx` — Added step 2 rendering with StripeConnectStep, useSearchParams for OAuth return handling
- `src/app/(host)/onboarding/page.test.tsx` — Added tests for step 2 query param handling and auto-advance
- `src/services/host.service.ts` — Added `updateStripeAccountId()` method
- `src/app/(host)/dashboard/settings/page.tsx` — Updated Stripe status to show "Connect" link when not connected
- `.env.example` — Added `STRIPE_CLIENT_ID`

## Change Log

- **2026-02-14**: Implemented Story 2.2 — Stripe Connect Standard OAuth integration for onboarding step 2. Created OAuth initiation and callback routes with CSRF protection, Stripe Connect step UI component, and service layer method. Updated settings page with dynamic connect link. 22 new tests added, all 87 tests pass.
