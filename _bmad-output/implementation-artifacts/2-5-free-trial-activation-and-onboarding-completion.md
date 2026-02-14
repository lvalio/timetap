# Story 2.5: Free Trial Activation & Onboarding Completion (Step 5/5)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a host,
I want to start my free trial and go live,
So that my public page is active and I can start receiving bookings.

## Acceptance Criteria

1. **Given** the host is on onboarding step 5, **When** the page loads, **Then** they see "Start your free trial" heading, **And** subtext: "Try TimeTap free for 20 days. No charge until your trial ends.", **And** price clearly shown: "€14.99/month after trial", **And** Stripe Elements card input (card number, expiry, CVC) with Stripe branding visible, **And** gradient CTA button: "Start free trial", **And** below CTA: "Cancel anytime. You won't be charged until {concrete date 20 days from now}.", **And** no skip option — card is required to go live, **And** the progress bar shows step 5 active.

2. **Given** the host enters valid card details and clicks "Start free trial", **When** the subscription is created via Stripe, **Then** a Stripe Customer is created (or retrieved if one already exists for this host), **And** the card is attached as the default payment method, **And** a Stripe Subscription is created with a 20-day trial period using the TimeTap monthly price, **And** the host's record is updated: `subscriptionId`, `subscriptionStatus = "trialing"`, `trialEndsAt = 20 days from now`, **And** the host sees the "You're live!" confirmation screen.

3. **Given** the card is declined, **When** Stripe returns an error, **Then** the host sees: "Card didn't go through. Try a different card?" with warm, no-blame tone, **And** they can re-enter card details and try again.

4. **Given** the "You're live!" confirmation screen is shown, **When** the host views it, **Then** they see a success icon with "You're live!" heading, **And** their public link prominently displayed: `timetap.it/{slug}`, **And** a "Copy link" button and share options, **And** clear next action: "Share this link with your clients or add it to your Instagram bio", **And** the host's `onboardingCompleted` is set to `true`, **And** clicking the CTA takes them to their dashboard.

5. **Given** Stripe subscription webhooks arrive (`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`), **When** the webhook handler at `/api/webhooks/stripe` processes them, **Then** the webhook signature is verified using `STRIPE_WEBHOOK_SECRET`, **And** the host's `subscriptionStatus` is updated accordingly (`trialing`, `active`, `past_due`, `canceled`), **And** webhook processing is idempotent (reprocessing the same event has no side effects).

## Tasks / Subtasks

- [x] Task 1: Add Stripe billing utilities (AC: #2)
  - [x]1.1 Create `src/lib/stripe/billing.ts` with:
    - `createTrialSubscription(params: { hostEmail: string, hostId: string, paymentMethodId: string })`: Creates a Stripe Customer (or retrieves existing by email), attaches the payment method as default, creates a Subscription with `trial_period_days: 20` on the `STRIPE_PRICE_ID` price. Returns `{ subscriptionId, customerId, trialEnd }`.
    - `constructWebhookEvent(body: string, signature: string)`: Wraps `stripe.webhooks.constructEvent()` with the `STRIPE_WEBHOOK_SECRET`. Returns `Stripe.Event`.
  - [x]1.2 Add `STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET` to `.env.example`

- [x] Task 2: Add host service methods for trial and onboarding completion (AC: #2, #4, #5)
  - [x]2.1 Add to `src/services/host.service.ts`:
    - `activateTrial(hostId: string, data: { subscriptionId: string, subscriptionStatus: string, trialEndsAt: Date })`: Updates the host record with subscription fields
    - `completeOnboarding(hostId: string)`: Sets `onboardingCompleted = true`
    - `updateSubscriptionStatus(hostId: string, data: { subscriptionStatus: string, subscriptionId?: string, trialEndsAt?: Date })`: Updates subscription fields (used by webhook handler)
    - `findBySubscriptionId(subscriptionId: string)`: Finds a host by their Stripe subscription ID (used by webhook handler to look up the host)

- [x] Task 3: Create Zod validation schema for trial activation (AC: #2)
  - [x]3.1 Add to `src/lib/validations/host.ts`:
    - `activateTrialSchema`: validates `{ paymentMethodId: string }` (the Stripe PaymentMethod ID from the card element)

- [x] Task 4: Create `activateTrial` server action (AC: #2, #3)
  - [x]4.1 Add `activateTrial` action to `src/app/(host)/onboarding/actions.ts`:
    - Validates input with `activateTrialSchema`
    - Auth check via Supabase
    - Fetches host record via `hostService.findByAuthId(user.id)` to get email
    - Calls `createTrialSubscription({ hostEmail: host.email, hostId: user.id, paymentMethodId })` from `lib/stripe/billing.ts`
    - Calls `hostService.activateTrial(user.id, { subscriptionId, subscriptionStatus: "trialing", trialEndsAt })`
    - Calls `hostService.completeOnboarding(user.id)`
    - Returns `ActionResult<{ trialEndsAt: string, slug: string }>`
  - [x]4.2 If Stripe throws (card declined, etc.), catch the error and return a warm user-facing message in `ActionResult`

- [x] Task 5: Create FreeTrialStep onboarding component (AC: #1, #2, #3, #4)
  - [x]5.1 Create `src/components/onboarding/free-trial-step.tsx` — client component with:
    - **Trial info section:** "Start your free trial" heading (h2), subtext "Try TimeTap free for 20 days. No charge until your trial ends.", price display "€14.99/month after trial"
    - **Stripe Elements card input:** Use `@stripe/react-stripe-js` `<CardElement>` embedded in the form. Requires wrapping the component in `<Elements>` provider with the Stripe publishable key via `loadStripe()`. The `<CardElement>` provides card number, expiry, and CVC in one unified input with Stripe branding.
    - **CTA button:** Full-width gradient primary "Start free trial". Disabled while processing. Shows loading spinner during submission.
    - **Below CTA:** "Cancel anytime. You won't be charged until {date}." where `{date}` is a concrete date 20 days from now, formatted with `Intl.DateTimeFormat`.
    - **Submission flow:** On click, call `stripe.createPaymentMethod({ type: 'card', card: cardElement })` to get the `paymentMethodId`, then call the `activateTrial` server action with the `paymentMethodId`.
    - **Error handling:** If card is declined or Stripe returns an error, show inline error below the card input: "Card didn't go through. Try a different card?" in warm tone. Clear error when user modifies card input.
    - **Success:** On success, call `onComplete(data)` prop to show the confirmation screen.
    - Props: `onComplete: (data: { trialEndsAt: string, slug: string }) => void`
  - [x]5.2 Install `@stripe/react-stripe-js` package: `pnpm add @stripe/react-stripe-js`
  - [x]5.3 Create `src/lib/stripe/elements.ts` — exports `getStripe()` which calls `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)` with memoization (singleton pattern to avoid re-loading).

- [x] Task 6: Create "You're live!" confirmation screen (AC: #4)
  - [x]6.1 Create `src/components/onboarding/onboarding-complete.tsx` — client component:
    - Success icon: `primary-light` circle with checkmark
    - Heading: "You're live!" (h1)
    - Public link prominently displayed: `timetap.it/{slug}` as a styled card
    - "Copy link" button: copies `https://timetap.it/{slug}` to clipboard, toast "Link copied"
    - Next action text: "Share this link with your clients or add it to your Instagram bio"
    - CTA button (gradient primary): "Go to dashboard" — navigates to `/dashboard`
    - Props: `slug: string`

- [x] Task 7: Update onboarding page for step 5 (AC: #1, #4)
  - [x]7.1 Update `src/app/(host)/onboarding/page.tsx`:
    - Import `FreeTrialStep` and `OnboardingComplete` components
    - Replace the step 5 placeholder block with `<FreeTrialStep onComplete={handleTrialComplete} />`
    - Add state: `const [isComplete, setIsComplete] = useState(false)` and `const [completionData, setCompletionData] = useState<{ slug: string } | null>(null)`
    - `handleTrialComplete` sets `isComplete = true` and `completionData` with the slug
    - When `isComplete`, render `<OnboardingComplete slug={completionData.slug} />` instead of the stepper
    - Update `STEP_TITLES[5].description` to "Start your free trial to go live."
  - [x]7.2 Update `/api/host/me` route to include `subscriptionStatus` and `trialEndsAt` in the response (for potential auto-advance if trial already activated)

- [x] Task 8: Create Stripe webhook handler (AC: #5)
  - [x]8.1 Create `src/app/api/webhooks/stripe/route.ts`:
    - `POST` handler that reads the raw request body
    - Calls `constructWebhookEvent(body, signature)` from `lib/stripe/billing.ts` to verify signature
    - Handles events:
      - `customer.subscription.created`: Extract `subscriptionId` and `status`, find host by subscription ID, update `subscriptionStatus`
      - `customer.subscription.updated`: Extract `subscriptionId` and `status`, find host by subscription ID, update `subscriptionStatus`. If `status === "active"` and previous was `"trialing"`, update accordingly.
      - `customer.subscription.deleted`: Find host by subscription ID, set `subscriptionStatus = "canceled"`
      - `invoice.payment_failed`: Find host by subscription ID (via the invoice's subscription), set `subscriptionStatus = "past_due"`
    - Returns `NextResponse.json({ received: true })` with status 200 for all handled events
    - Returns 400 for signature verification failures
    - Idempotent: uses the subscription status from the event directly (re-processing same event results in same DB state)
  - [x]8.2 Important: The webhook handler must NOT use Supabase auth — it authenticates via Stripe webhook signature only. Use the `prisma` singleton directly via `hostService` methods.
  - [x]8.3 Note: The webhook handler needs to find the host by `subscriptionId`. The `activateTrial` action stores `subscriptionId` on the host record, so the webhook can use `hostService.findBySubscriptionId()` to look up the host.

- [x] Task 9: Write tests (all ACs)
  - [x]9.1 Create `src/lib/stripe/billing.test.ts` — test `createTrialSubscription`: mocks Stripe SDK, verifies customer creation with email, payment method attachment, subscription creation with 20-day trial. Test error handling for card declines.
  - [x]9.2 Create `src/components/onboarding/free-trial-step.test.tsx` — test: renders trial info text, renders Stripe card element, shows "Start free trial" button, button disabled during processing, shows error on card decline, calls onComplete on success
  - [x]9.3 Create `src/components/onboarding/onboarding-complete.test.tsx` — test: renders "You're live!" heading, shows public link with slug, copy button copies to clipboard, "Go to dashboard" navigates to /dashboard
  - [x]9.4 Create `src/app/api/webhooks/stripe/route.test.ts` — test: returns 400 for invalid signature, handles `customer.subscription.created` event, handles `customer.subscription.updated` event, handles `customer.subscription.deleted` event, handles `invoice.payment_failed` event, idempotent processing
  - [x]9.5 Add to `src/services/host.service.test.ts` — test `activateTrial`, `completeOnboarding`, `updateSubscriptionStatus`, `findBySubscriptionId`
  - [x]9.6 Update `src/app/(host)/onboarding/page.test.tsx` — add tests for step 5: renders FreeTrialStep when `currentStep === 5`, shows OnboardingComplete after trial activation

## Dev Notes

### Architecture Patterns & Constraints

**Stripe Elements Integration (Client-Side):**

Story 2.5 introduces client-side Stripe for the first time. Previous Stripe work was all server-side (Connect OAuth). The key difference:

```tsx
// Client-side: wrap component in Elements provider
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

// Memoize to avoid re-creating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// In parent component:
<Elements stripe={stripePromise}>
  <FreeTrialStep onComplete={handleComplete} />
</Elements>

// Inside FreeTrialStep:
const stripe = useStripe()
const elements = useElements()

const handleSubmit = async () => {
  const cardElement = elements!.getElement(CardElement)!
  const { paymentMethod, error } = await stripe!.createPaymentMethod({
    type: "card",
    card: cardElement,
  })
  if (error) {
    setError(error.message || "Card didn't go through. Try a different card?")
    return
  }
  // Call server action with paymentMethod.id
  const result = await activateTrial({ paymentMethodId: paymentMethod.id })
  // ...
}
```

**Server-Side Stripe Subscription Creation:**

```typescript
// src/lib/stripe/billing.ts
import { stripe } from "./client"

export async function createTrialSubscription(params: {
  hostEmail: string
  hostId: string
  paymentMethodId: string
}) {
  // 1. Create or retrieve Stripe Customer
  const existingCustomers = await stripe.customers.list({ email: params.hostEmail, limit: 1 })
  let customer: Stripe.Customer
  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0]
  } else {
    customer = await stripe.customers.create({
      email: params.hostEmail,
      metadata: { hostId: params.hostId },
    })
  }

  // 2. Attach payment method and set as default
  await stripe.paymentMethods.attach(params.paymentMethodId, { customer: customer.id })
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: params.paymentMethodId },
  })

  // 3. Create subscription with 20-day trial
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID! }],
    trial_period_days: 20,
    metadata: { hostId: params.hostId },
  })

  return {
    subscriptionId: subscription.id,
    customerId: customer.id,
    trialEnd: new Date(subscription.trial_end! * 1000),
  }
}
```

**Stripe Webhook Handler Pattern:**

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent } from "@/lib/stripe/billing"
import { hostService } from "@/services/host.service"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = constructWebhookEvent(body, signature)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const host = await hostService.findBySubscriptionId(subscription.id)
      if (host) {
        await hostService.updateSubscriptionStatus(host.id, {
          subscriptionStatus: subscription.status,
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : undefined,
        })
      }
      break
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const host = await hostService.findBySubscriptionId(subscription.id)
      if (host) {
        await hostService.updateSubscriptionStatus(host.id, {
          subscriptionStatus: "canceled",
        })
      }
      break
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.subscription) {
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription.id
        const host = await hostService.findBySubscriptionId(subId)
        if (host) {
          await hostService.updateSubscriptionStatus(host.id, {
            subscriptionStatus: "past_due",
          })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

**Important: No Supabase auth in webhook handler** — Stripe server-to-server calls don't carry Supabase session tokens. Authentication is via Stripe webhook signature verification only. The webhook endpoint path (`/api/webhooks/stripe`) is not gated by the middleware auth check (only `/dashboard` and `/onboarding` paths redirect unauthenticated users).

### Critical Implementation Details

**Onboarding Step 5 UI Specs (from UX spec):**

- Progress bar: segments 1-4 completed (gradient fill), segment 5 active (gradient fill)
- Centered column (max-width 480px), no sidebar/tab bar (onboarding layout handles this)
- **Heading:** "Start your free trial" (h2)
- **Subtext:** "Try TimeTap free for 20 days. No charge until your trial ends." in `text-tt-text-secondary`
- **Price:** "€14.99/month after trial" — prominent but not aggressive
- **Card input:** Stripe Elements `<CardElement>` — Stripe handles styling and validation. Use Stripe's appearance API to match TimeTap's style:

```typescript
const cardElementOptions: StripeCardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#2d3748", // text-body
      "::placeholder": { color: "#718096" }, // text-muted
    },
    invalid: {
      color: "#e53e3e", // error
    },
  },
}
```

- **CTA:** Full-width gradient primary "Start free trial" button
- **Below CTA:** "Cancel anytime. You won't be charged until {date}." — `{date}` is 20 days from now, formatted as "March 6, 2026" (use `Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })`)
- **No skip option** — the button is the only way forward
- "Step 5 of 5" label in caption text

**"You're live!" Confirmation Screen (from UX spec Component #14):**

- Success icon: `primary-light` circle with gradient inner element (or checkmark)
- Headline: "You're live!" (h1)
- Public link in a styled card: `timetap.it/{slug}`
- "Copy link" button — copies full URL to clipboard, toast "Link copied"
- Next action: "Share this link with your clients or add it to your Instagram bio"
- CTA (gradient primary): "Go to dashboard" → `router.push("/dashboard")`
- **The stepper is NOT shown on this screen** — it's a full-screen confirmation replacing the onboarding layout

**Environment Variables Needed:**

```env
# Add to .env.local and .env.example:
STRIPE_PRICE_ID=price_xxx           # Monthly €14.99 plan price ID from Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_xxx     # From Stripe Dashboard → Developers → Webhooks
```

**Stripe Setup Required (before running):**

1. In Stripe Dashboard, create a Product "TimeTap Monthly" with Price €14.99/month (recurring)
2. Copy the Price ID → `STRIPE_PRICE_ID`
3. Create a Webhook endpoint pointing to `{APP_URL}/api/webhooks/stripe`
4. Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy the Webhook Secret → `STRIPE_WEBHOOK_SECRET`
6. For local dev: use `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Color Tokens (CRITICAL — use tt- prefix):**

- Gradient button: `bg-gradient-to-r from-[#4facfe] to-[#00f2fe]`
- Success icon background: `bg-tt-primary-light`
- Error text: `text-tt-error`
- Body text: `text-tt-text-body`
- Muted text: `text-tt-text-muted`
- Secondary text: `text-tt-text-secondary`
- Surface card: `bg-tt-surface`

### Previous Story Intelligence

**From Story 2.4 (most recent, completed):**
- 178/179 tests pass (1 pre-existing failure in `host.test.ts` — "allows description to be omitted") — no new regressions allowed
- `PackageStep` is the component pattern to follow for `FreeTrialStep` (client component with `onComplete` prop, internal state, calls server action via `startTransition`)
- Onboarding page now handles steps 1-4 with real components; step 5 is the last placeholder
- The placeholder block to replace is in `page.tsx` at the `{currentStep === 5 && (...)}` section
- Step titles object needs `description` updated from "Coming in Story 2.5" to real text

**From Story 2.4 — Debug Learnings:**
- Fake timers in Vitest need `shouldAdvanceTime: true`
- `useSearchParams()` mock: use `mockSearchParams = new URLSearchParams()` and mutate per test
- Test pattern for form components: render, fill inputs, click submit, use `waitFor` for async state updates
- Prisma `update({ where: { id, hostId } })` doesn't work — use `findFirst` + `update` pattern

**From Story 2.2 (Stripe Connect):**
- `StripeConnectStep` is a simple one-CTA component — good pattern for the Stripe-specific test mocking
- The Stripe Connect test file (`src/lib/stripe/connect.test.ts`) shows how to mock the Stripe SDK
- Stripe OAuth state is managed via cookies — the subscription flow won't need cookies (it's a direct API call)

**From Story 2.1:**
- `ProfileForm` established the pattern for form submission → `startTransition` → action call → advance step
- Sonner toast available globally via `toast.success("...")` from `sonner`

### Git Intelligence

**Recent commits (most recent first):**
1. `c0d173e` — "to review: Story 2.4: Package Creation & Management (Step 4/5)"
2. `f07b314` — "vercel build fix after 2.3"
3. `483ca26` — "Story 2.3: Google Calendar Connection & Bookable Hours"
4. `ba97836` — "Story 2.2: Stripe Connect Integration (Step 2/5)"
5. `195220b` — "Story 2.1: Onboarding Flow & Profile Setup (Step 1/5)"

**Patterns established:**
- Service pattern: `xxxService` as plain object with methods using Prisma client singleton
- Server Action pattern: validate → auth → service → `ActionResult<T>`
- Onboarding component pattern: client component with props (`onComplete: () => void`), internal state management, calls server actions via `startTransition`
- shadcn components available: button, card, avatar, badge, skeleton, separator, input, textarea, form, label, sonner, dialog
- Tests: Vitest + testing-library, mocked Supabase and Prisma, co-located `.test.ts(x)` files

### Dependencies to Install

```bash
# Stripe React Elements for client-side card input
pnpm add @stripe/react-stripe-js
```

Note: `@stripe/stripe-js` (browser-side Stripe loader) is already installed (`^8.7.0`). `stripe` (server SDK) is already installed (`^20.3.1`).

### Testing Notes

**Mocking Stripe Elements in tests:**

Stripe Elements cannot render in jsdom. Mock the entire `@stripe/react-stripe-js` module:

```typescript
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({
    createPaymentMethod: vi.fn(),
  }),
  useElements: () => ({
    getElement: vi.fn(),
  }),
}))
```

**Mocking Stripe webhook verification in tests:**

```typescript
vi.mock("@/lib/stripe/billing", () => ({
  constructWebhookEvent: vi.fn(),
}))

// Then in tests:
const mockEvent = {
  type: "customer.subscription.updated",
  data: {
    object: {
      id: "sub_123",
      status: "active",
      trial_end: null,
    },
  },
}
vi.mocked(constructWebhookEvent).mockReturnValue(mockEvent as any)
```

### Project Structure Notes

**Files to create:**
- `src/lib/stripe/billing.ts` — Trial subscription creation, webhook event construction
- `src/lib/stripe/billing.test.ts` — Tests for billing utilities
- `src/lib/stripe/elements.ts` — `getStripe()` singleton for client-side Stripe loader
- `src/components/onboarding/free-trial-step.tsx` — Onboarding step 5 UI with Stripe Elements
- `src/components/onboarding/free-trial-step.test.tsx` — Tests for FreeTrialStep
- `src/components/onboarding/onboarding-complete.tsx` — "You're live!" confirmation screen
- `src/components/onboarding/onboarding-complete.test.tsx` — Tests for OnboardingComplete
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook handler (replaces `.gitkeep`)
- `src/app/api/webhooks/stripe/route.test.ts` — Tests for webhook handler

**Files to modify:**
- `src/app/(host)/onboarding/page.tsx` — Replace step 5 placeholder with `<FreeTrialStep>`, add completion state
- `src/app/(host)/onboarding/page.test.tsx` — Add step 5 test cases
- `src/app/(host)/onboarding/actions.ts` — Add `activateTrial` server action
- `src/services/host.service.ts` — Add `activateTrial`, `completeOnboarding`, `updateSubscriptionStatus`, `findBySubscriptionId`
- `src/services/host.service.test.ts` — Add tests for new methods
- `src/lib/validations/host.ts` — Add `activateTrialSchema`
- `src/app/api/host/me/route.ts` — Include `subscriptionStatus` and `trialEndsAt` in response
- `.env.example` — Add `STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET`

**Existing files to use (do not modify unless listed above):**
- `src/lib/prisma.ts` — Prisma singleton
- `src/lib/stripe/client.ts` — Server-side Stripe instance
- `src/lib/supabase/server.ts` — Server Supabase client (for auth checks in actions)
- `src/types/actions.ts` — `ActionResult<T>` type
- `src/lib/utils.ts` — `cn()` utility
- `src/components/onboarding/onboarding-stepper.tsx` — Reused as-is
- `src/app/(host)/onboarding/layout.tsx` — Handles auth + onboarding redirect, no modification needed
- All existing shadcn UI components

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Action Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Supabase Setup Guide — Phase 3: Stripe Connect Setup]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1: Host Onboarding — Step 5]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Confirmation Screen Component (#14)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form & Input Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy]
- [Source: _bmad-output/implementation-artifacts/2-4-package-creation-and-management.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- clipboard mock in jsdom: `Object.defineProperty(window.navigator, "clipboard", ...)` + `fireEvent.click` (not `userEvent`) needed for clipboard tests
- `@testing-library/user-event` was not installed — added as devDependency

### Completion Notes List

- ✅ Task 1: Created `src/lib/stripe/billing.ts` with `createTrialSubscription` and `constructWebhookEvent` utilities
- ✅ Task 2: Added `activateTrial`, `completeOnboarding`, `updateSubscriptionStatus`, `findBySubscriptionId` to host service
- ✅ Task 3: Added `activateTrialSchema` Zod validation to `src/lib/validations/host.ts`
- ✅ Task 4: Created `activateTrial` server action in onboarding actions with Stripe error handling
- ✅ Task 5: Created `FreeTrialStep` component with Stripe Elements CardElement, installed `@stripe/react-stripe-js`, created `src/lib/stripe/elements.ts` singleton
- ✅ Task 6: Created `OnboardingComplete` "You're live!" screen with copy link, share text, and dashboard CTA
- ✅ Task 7: Updated onboarding page — replaced step 5 placeholder with FreeTrialStep, added completion state, updated step 5 description, added subscriptionStatus/trialEndsAt to /api/host/me
- ✅ Task 8: Created Stripe webhook handler at `/api/webhooks/stripe` handling subscription.created/updated/deleted and invoice.payment_failed
- ✅ Task 9: Wrote 33 new tests across 6 test files — all pass. No regressions (pre-existing 1 failure in host.test.ts unchanged)

### Change Log

- 2026-02-14: Story 2.5 implemented — Free trial activation with Stripe Elements, webhook handler, onboarding completion flow

### File List

**New files:**
- `src/lib/stripe/billing.ts`
- `src/lib/stripe/billing.test.ts`
- `src/lib/stripe/elements.ts`
- `src/components/onboarding/free-trial-step.tsx`
- `src/components/onboarding/free-trial-step.test.tsx`
- `src/components/onboarding/onboarding-complete.tsx`
- `src/components/onboarding/onboarding-complete.test.tsx`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/webhooks/stripe/route.test.ts`

**Modified files:**
- `src/services/host.service.ts` — added 4 new methods
- `src/services/host.service.test.ts` — added tests for new methods
- `src/lib/validations/host.ts` — added activateTrialSchema
- `src/app/(host)/onboarding/actions.ts` — added activateTrial action
- `src/app/(host)/onboarding/page.tsx` — replaced step 5 placeholder, added completion state
- `src/app/(host)/onboarding/page.test.tsx` — added step 5 test, Stripe Elements mocks
- `src/app/api/host/me/route.ts` — added subscriptionStatus and trialEndsAt to response
- `.env.example` — added STRIPE_PRICE_ID
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status update
- `package.json` — added @stripe/react-stripe-js and @testing-library/user-event
