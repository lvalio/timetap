# Build Fixes Log

Tracked fixes for build errors discovered outside of story implementation.

---

## Fix #1 — Zod schema type mismatch in `updateProfileSchema`

**Date:** 2026-02-14
**File:** `src/lib/validations/host.ts`
**Error:**

```
Type 'Resolver<{ name: string; slug: string; description?: string | undefined; }, ...>'
is not assignable to type 'Resolver<{ name: string; description: string; slug: string; }, ...>'
```

**Root cause:** The `description` field used `.optional().default("")`, which makes `z.infer` produce `string | undefined` as the *input* type. The `ProfileForm` component expected `string` (non-optional) for its `defaultValues` and `useForm<UpdateProfileInput>` generic, causing a resolver type conflict.

**Fix:** Removed `.optional().default("")` — the field is now `z.string().max(500, ...)`. The form already supplies `""` as the default value via `defaultValues`, so the Zod default was redundant.

**Affected consumers:** `src/components/onboarding/profile-form.tsx`

---

## Fix #2 — Prerender error on `/auth/login`

**Date:** 2026-02-14
**File:** `src/app/auth/login/page.tsx`
**Error:**

```
Error occurred prerendering page "/auth/login".
```

**Root cause:** `useSearchParams()` was called directly in the page component. Next.js requires a `<Suspense>` boundary around any component using `useSearchParams()` to allow static prerendering — without it, the build fails during the export phase.

**Fix:** Extracted the page body into a `LoginContent` child component and wrapped it with `<Suspense>` in the default export.

**Before:**
```tsx
export default function LoginPage() {
  const searchParams = useSearchParams() // breaks prerender
  // ...
}
```

**After:**
```tsx
function LoginContent() {
  const searchParams = useSearchParams()
  // ...
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
```

---

## Fix #3 — Prisma client not generated on Vercel

**Date:** 2026-02-14
**File:** `package.json`
**Error:**

```
Module not found: Can't resolve '@/generated/prisma/client'
```

**Root cause:** The `build` script was just `next build` — no `prisma generate` step. The generated client exists locally but not on Vercel's fresh clone, so the import fails during Turbopack build.

**Fix:** Added a `postinstall` script (`"postinstall": "prisma generate"`) which Vercel runs automatically after `pnpm install`, ensuring the client is generated before the build.

---

## Fix #4 — `Invoice.subscription` removed in Stripe SDK v20

**Date:** 2026-02-14
**File:** `src/app/api/webhooks/stripe/route.ts`
**Error:**

```
Type error: Property 'subscription' does not exist on type 'Invoice'.
```

**Root cause:** Stripe SDK v20 (API version 2025+) removed `Invoice.subscription` as a top-level property. The subscription reference now lives under `Invoice.parent.subscription_details.subscription`.

**Fix:** Replaced direct `invoice.subscription` access with optional chaining through the new parent structure:

**Before:**
```tsx
const invoice = event.data.object as Stripe.Invoice
if (invoice.subscription) {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id
```

**After:**
```tsx
const invoice = event.data.object as Stripe.Invoice
const sub = invoice.parent?.subscription_details?.subscription
if (sub) {
  const subId = typeof sub === "string" ? sub : sub.id
```

**Affected consumers:** Stripe webhook handler (`invoice.payment_failed` event)

---

## Fix #5 — `window` cast fails strict TypeScript on Vercel

**Date:** 2026-02-15
**Files:** `src/app/(public)/[slug]/book/booking-flow-client.tsx`, `src/components/booking/time-slot-picker.tsx`
**Error:**

```
Type error: Conversion of type 'Window & typeof globalThis' to type 'Record<string, unknown>'
may be a mistake because neither type sufficiently overlaps with the other.
If this was intentional, convert the expression to 'unknown' first.
```

**Root cause:** `window as Record<string, unknown>` is rejected in strict mode because `Window & typeof globalThis` has no index signature, so TypeScript considers the direct cast unsafe.

**Fix:** Cast through `unknown` first: `window as unknown as Record<string, unknown>`.

**Before:**
```tsx
const refresh = (window as Record<string, unknown>)
  .__refreshAvailability as (() => void) | undefined
```

**After:**
```tsx
const refresh = (window as unknown as Record<string, unknown>)
  .__refreshAvailability as (() => void) | undefined
```

**Affected files:** 3 occurrences total (1 in `booking-flow-client.tsx`, 2 in `time-slot-picker.tsx`)
