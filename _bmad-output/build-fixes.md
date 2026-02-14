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
