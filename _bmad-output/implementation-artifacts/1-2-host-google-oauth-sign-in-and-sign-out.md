# Story 1.2: Host Google OAuth Sign-In & Sign-Out

Status: done

## Story

As a host,
I want to sign in with my Google account and sign out when I'm done,
So that I can securely access my TimeTap dashboard without creating a separate password.

## Acceptance Criteria

1. **Given** an unauthenticated visitor on the login page (`/auth/login`), **When** they click "Continue with Google", **Then** they are redirected to Google OAuth consent screen requesting openid, email, and profile scopes. On successful authentication, a Supabase session is created via cookies (@supabase/ssr). A host record is created in the database on first sign-in with name and email from Google profile. Returning hosts are matched to their existing host record (no duplicate creation). The host is redirected to `/dashboard` (or `/onboarding` if onboardingCompleted is false).

2. **Given** a Google OAuth callback with an error, **When** the auth callback handler processes the response, **Then** the host sees a warm error message: "Something went wrong with Google. Try again?" with a retry button. No partial records are created in the database.

3. **Given** an authenticated host on any dashboard page, **When** they click "Sign out", **Then** the Supabase session is destroyed, they are redirected to the login page, and accessing `/dashboard` after sign-out redirects to login.

## Tasks / Subtasks

- [x] Task 1: Create login page UI (AC: #1)
  - [x] 1.1 Create `/auth/login/page.tsx` as a `"use client"` component (required: signInWithOAuth returns a URL for browser redirect)
  - [x] 1.2 Style with TimeTap design system — centered layout (max-width 480px), gradient CTA button, TimeTap logo
  - [x] 1.3 Read `?error=auth_failed` from URL search params to display warm error message (AC: #2)
  - [x] 1.4 On button click: call signInWithGoogle action, then `window.location.href = data.url` to redirect to Google
- [x] Task 2: Implement Google OAuth sign-in action (AC: #1)
  - [x] 2.1 Create `/auth/actions.ts` with `signInWithGoogle` Server Action
  - [x] 2.2 Use `supabase.auth.signInWithOAuth({ provider: 'google' })` with PKCE flow
  - [x] 2.3 Set `redirectTo` to `{NEXT_PUBLIC_APP_URL}/auth/callback`
  - [x] 2.4 Request scopes: `openid email profile` (NOT calendar scopes — those come in onboarding step 3)
- [x] Task 3: Implement auth callback handler (AC: #1, #2)
  - [x] 3.1 Create `/auth/callback/route.ts` as a Route Handler (GET)
  - [x] 3.2 Exchange OAuth code for session via `supabase.auth.exchangeCodeForSession(code)`
  - [x] 3.3 On success: check if host record exists in DB by Supabase auth user ID
  - [x] 3.4 If no host record: create one via `host.service.ts` with name, email from Supabase user metadata
  - [x] 3.5 If host exists: proceed without creating duplicate
  - [x] 3.6 Check `onboardingCompleted` — redirect to `/onboarding` if false, `/dashboard` if true
  - [x] 3.7 On error: redirect to `/auth/login?error=auth_failed`
- [x] Task 4: Create host service for auth-related operations (AC: #1)
  - [x] 4.1 Implement `findByAuthId(authId)` in `host.service.ts`
  - [x] 4.2 Implement `createFromAuth(authId, name, email)` in `host.service.ts`
  - [x] 4.3 Import Prisma from `@/generated/prisma/client` (output path per schema.prisma config) — services are the only files that import Prisma
  - [x] 4.4 Use Prisma directly (bypasses RLS via DATABASE_URL) for host record creation — no service role client needed
- [x] Task 5: Implement sign-out action (AC: #3)
  - [x] 5.1 Add `signOut` Server Action in `/auth/actions.ts`
  - [x] 5.2 Call `supabase.auth.signOut()` to destroy session
  - [x] 5.3 Redirect to `/auth/login` after sign-out
- [x] Task 6: Supabase configuration verification
  - [x] 6.1 Verify Google OAuth provider is enabled in Supabase Dashboard
  - [x] 6.2 Verify callback URL (`{APP_URL}/auth/callback`) is in Supabase redirect allow list
  - [x] 6.3 Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Supabase Dashboard
  - [x] 6.4 Verify Google Cloud Console has correct authorized redirect URI pointing to Supabase

## Dev Notes

### Architecture Patterns & Constraints

**Authentication Architecture (from Architecture doc):**
- Auth provider: **Supabase Auth** with native Google OAuth provider
- Session management: Cookie-based via `@supabase/ssr` (PKCE flow, automatic)
- Two-step Google OAuth: This story requests **basic profile only** (openid, email, profile). Calendar scopes are requested separately in Epic 2 Story 2.3
- Host ID = Supabase Auth user ID (`auth.uid()`) — the Prisma `Host.id` field is a UUID that should match the Supabase auth user ID
- RLS policy already set: `hosts access own data (id = auth.uid())`

**Server Action Pattern (MANDATORY — from Architecture doc):**
```typescript
"use server"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/types/actions"

export async function signInWithGoogle(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })
  if (error) {
    return { success: false, error: { code: "AUTH_ERROR", message: error.message } }
  }
  return { success: true, data: { url: data.url } }
}
```

**Auth Callback Pattern (Route Handler, NOT Server Action):**
```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hostService } from "@/services/host.service"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  // Create or find host record
  let host = await hostService.findByAuthId(user.id)
  if (!host) {
    host = await hostService.createFromAuth(
      user.id,
      user.user_metadata.full_name || user.email!,
      user.email!
    )
  }

  // Redirect based on onboarding status
  const redirectPath = host.onboardingCompleted ? "/dashboard" : "/onboarding"
  return NextResponse.redirect(`${origin}${redirectPath}`)
}
```

**Sign-Out Pattern:**
```typescript
"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
```

### Critical Implementation Details

**Login Page is a Client Component:**
- `/auth/login/page.tsx` MUST use `"use client"` directive
- `signInWithOAuth` returns `{ data: { url } }` — the browser must navigate to this URL
- Pattern: call Server Action → get URL → `window.location.href = url`
- Cannot use `redirect()` from Server Action because the URL is external (Google OAuth)

**Prisma Client Import Path:**
- Import from `@/generated/prisma` (NOT `@prisma/client`) — per `output = "../src/generated/prisma"` in schema.prisma
- Example: `import { PrismaClient } from "@/generated/prisma"`

**Service Role Client for Host Creation:**
- The auth callback creates host records in the database
- RLS policy `id = auth.uid()` blocks INSERT via anon key (the user doesn't have a host record yet)
- Use a separate Supabase client with `SUPABASE_SERVICE_ROLE_KEY` for the Prisma connection OR use Prisma directly (Prisma bypasses RLS since it connects via `DATABASE_URL`, not Supabase client)
- Recommended: Use Prisma directly in `host.service.ts` — Prisma connects via `DATABASE_URL` which bypasses RLS

**Host Record Creation — ID Matching:**
- The Host `id` in Prisma MUST be set to the Supabase Auth `user.id` (UUID). This is critical because:
  - RLS policy uses `auth.uid()` to match `hosts.id`
  - If IDs don't match, RLS will block all queries
- Use `prisma.host.create({ data: { id: user.id, email: user.email, name: user.user_metadata.full_name } })`

**Returning User Detection:**
- Use `hostService.findByAuthId(user.id)` — query by `id` field (which equals Supabase auth UID)
- If found: skip creation, proceed to redirect
- If not found: create new host record
- NEVER query by email alone for matching (emails can change)

**Error Handling:**
- OAuth errors come as URL query params on the callback (`?error=...&error_description=...`)
- Code exchange errors are caught from `exchangeCodeForSession`
- Login page reads `?error=auth_failed` query param to display warm error message
- Error copy: "Something went wrong with Google. Try again?" — warm, blame-free

**Supabase SSR Cookie Handling:**
- `createClient()` from `@/lib/supabase/server` already handles cookie get/set
- The `setAll` try/catch in server.ts handles Server Component read-only context (already implemented in Story 1.1)
- Session tokens are automatically managed via cookies — no manual token storage

### Version-Specific Notes (from Story 1.1 Learnings)

- **Next.js 16.1.6:** Uses `proxy.ts` (not `middleware.ts`) for route interception
- **Prisma 7.4.0:** `provider = "prisma-client"` (not `prisma-client-js`). Connection config in `prisma.config.ts`
- **@supabase/ssr 0.8.x:** PKCE flow is default, cookies are auto-managed
- **Node.js 25.6.1:** Required for Prisma 7 compatibility (20.19+ minimum)
- **Tailwind CSS v4:** No `tailwind.config.ts` — use `@theme` directive in `globals.css`
- **Color tokens:** Prefixed with `tt-` (e.g., `tt-primary`) to avoid shadcn conflicts

### UX Requirements (from UX Design Spec)

**Login Page:**
- Single CTA: "Continue with Google" — gradient primary button
- Centered layout, max-width 480px
- TimeTap logo above the button
- No email/password option — Google OAuth only for hosts
- Warm error state if auth fails

**Sign-Out:**
- Available from any dashboard page
- Simple action — no confirmation dialog needed
- Immediate redirect to login page

### Project Structure Notes

- Login page: `src/app/auth/login/page.tsx` — already has `.gitkeep` placeholder
- Auth actions: `src/app/auth/actions.ts` — already has `.gitkeep` placeholder
- Auth callback: `src/app/auth/callback/route.ts` — already has `.gitkeep` placeholder
- Host service: `src/services/host.service.ts` — already has `.gitkeep` placeholder
- Supabase clients: `src/lib/supabase/client.ts` and `server.ts` — already implemented in Story 1.1
- Proxy: `src/proxy.ts` — stub exists, exports from `src/lib/supabase/middleware.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication Boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Action Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Access Boundary]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Authentication Flows]
- [Source: _bmad-output/planning-artifacts/prd.md#FR1, FR2]
- [Source: _bmad-output/implementation-artifacts/1-1-project-initialization-and-database-foundation.md#Dev Notes]
- [Source: Supabase Docs — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Source: Supabase Docs — Creating SSR Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed Prisma import path: `@/generated/prisma` → `@/generated/prisma/client` (no index.ts in generated directory)
- React strict mode causes double rendering in tests — used `getAllBy*` queries

### Completion Notes List

- **Task 1:** Created login page as client component with centered layout (max-width 480px), TimeTap brand heading, gradient CTA button, and warm error message display from `?error=auth_failed` URL param
- **Task 2:** Implemented `signInWithGoogle` server action using Supabase `signInWithOAuth` with Google provider, PKCE flow, and `redirectTo` callback URL. Returns `ActionResult<{ url: string }>` for client-side redirect
- **Task 3:** Implemented auth callback route handler that exchanges OAuth code for session, creates/finds host records via `hostService`, and redirects based on `onboardingCompleted` status. Error cases redirect to login with error param
- **Task 4:** Created `hostService` with `findByAuthId` and `createFromAuth` methods using Prisma directly (bypasses RLS via DATABASE_URL). Host ID matches Supabase auth UID for RLS compatibility
- **Task 5:** Implemented `signOut` server action that destroys Supabase session and redirects to login page
- **Task 6:** Supabase Dashboard and Google Cloud Console configuration verified by user
- **Infrastructure:** Installed Vitest + testing-library, created vitest.config.ts, Prisma client singleton

### File List

- `src/app/auth/login/page.tsx` — NEW: Login page (client component)
- `src/app/auth/login/page.test.tsx` — NEW: Login page tests (5 tests)
- `src/app/auth/actions.ts` — NEW: Server actions (signInWithGoogle, signOut)
- `src/app/auth/actions.test.ts` — NEW: Auth actions tests (3 tests)
- `src/app/auth/callback/route.ts` — NEW: OAuth callback route handler
- `src/app/auth/callback/route.test.ts` — NEW: Callback handler tests (6 tests)
- `src/services/host.service.ts` — NEW: Host service (findByAuthId, createFromAuth)
- `src/services/host.service.test.ts` — NEW: Host service tests (3 tests)
- `src/lib/prisma.ts` — NEW: Prisma client singleton
- `src/test/setup.ts` — NEW: Vitest setup (jest-dom matchers)
- `vitest.config.ts` — NEW: Vitest configuration

### Change Log

- 2026-02-13: Implemented Story 1.2 — Host Google OAuth sign-in/sign-out with login page, server actions, callback handler, host service, and full test coverage (17 tests)
