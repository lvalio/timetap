# Story 3.3: Free Session Booking Flow

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to book a free intro session with a host without creating an account,
So that I can try the host's services with zero friction.

## Acceptance Criteria

1. **Given** a visitor clicks "Book free session" on the public host page, **When** the booking flow loads at `/{slug}/book?package={packageId}`, **Then** they see the time slot picker: horizontal scrollable day pills (starting from tomorrow, format: "Thu 13") and vertical slot list for the selected day, **And** the first day pill with available slots is auto-selected, **And** each slot is a full-width button with centered time text (format: "10:00"), **And** minimum 44px touch targets with 14px vertical gap between slots.

2. **Given** the visitor selects a time slot, **When** they tap a slot, **Then** the slot shows selected state: `bg-tt-primary-light` background, `border-tt-primary` border (2px), checkmark icon, **And** a sticky confirm bar appears at the bottom with the selected context: "Confirm booking — Thu Feb 13, 11:00", **And** below the confirm bar: an email input field (only required field).

3. **Given** the visitor enters their email and taps "Confirm booking", **When** the booking action executes, **Then** the system uses optimistic locking within a database transaction to check the slot is still available, **And** if available: a `customers` record is created (or found) for this host-email pair, **And** a `bookings` record is created with status = "confirmed", googleEventId = null, meetLink = null, **And** the availability cache is invalidated for this host, **And** the visitor sees the confirmation screen: success icon, "Session booked!" heading, date/time details, "We sent a confirmation to your email" message.

4. **Given** the slot was just taken by another visitor, **When** the booking transaction detects a conflict, **Then** the visitor sees a warm message: "That slot was just booked by someone else — here are other times that work.", **And** they are returned to the slot picker with refreshed availability.

5. **Given** the email input is invalid, **When** the visitor tries to confirm, **Then** an inline error appears below the email field.

6. **Given** a day has no available slots, **When** that day is selected in the slot picker, **Then** the slot area shows "No available times on this day. Try another day." in `text-tt-text-muted`.

7. **Given** the visitor navigates to `/{slug}/book` without a valid free intro `package` query parameter, **When** the page loads, **Then** they are redirected back to the public host page `/{slug}`.

8. **Given** the visitor navigates to `/{slug}/book?package={id}` where the package is not a free intro package (paid or inactive), **When** the page validates the package, **Then** they are redirected back to the public host page `/{slug}`.

## Tasks / Subtasks

- [x] Task 1: Create Zod validation schema for free session booking (AC: #3, #5)
  - [x] 1.1 Create `src/lib/validations/booking.ts` with `bookFreeSessionSchema`:
    - `email`: `z.string().email("Please enter a valid email address")`
    - `packageId`: `z.string().uuid()`
    - `hostId`: `z.string().uuid()`
    - `startTime`: `z.string().datetime()` (ISO 8601 UTC)
  - [x] 1.2 Export `BookFreeSessionInput` type from the schema via `z.infer`.

- [x] Task 2: Create customer service (AC: #3)
  - [x] 2.1 Create `src/services/customer.service.ts` with:
    - `findOrCreate(hostId: string, email: string, name?: string): Promise<{ id: string; email: string; name: string | null; hostId: string }>` — Uses Prisma `upsert` with `where: { hostId_email: { hostId, email } }`. On create: sets email, hostId, name. On update: no-op (returns existing). Returns plain object.
  - [x] 2.2 Create `src/services/customer.service.test.ts` — tests:
    - Creates new customer when none exists for host-email pair.
    - Returns existing customer when one already exists (upsert no-op).
    - Handles different hosts with same email as separate customers.

- [x] Task 3: Create booking service (AC: #3, #4)
  - [x] 3.1 Create `src/services/booking.service.ts` with:
    - `createFreeBooking(input: { hostId: string; customerId: string; packageId: string; startTime: Date; endTime: Date }): Promise<{ id: string; startTime: Date; endTime: Date; status: string }>` — Uses Prisma `$transaction`:
      1. Check for existing confirmed booking at same `hostId` + `startTime` (optimistic locking).
      2. If conflict exists, throw `SlotTakenError`.
      3. Create booking record with `status: "confirmed"`, `googleEventId: null`, `meetLink: null`.
      4. Return created booking as plain object.
    - Export `SlotTakenError` class extending `Error` with `code = "SLOT_TAKEN"`.
  - [x] 3.2 After booking creation, call `availabilityService.invalidateCache(hostId)` to invalidate GCal cache.
  - [x] 3.3 Create `src/services/booking.service.test.ts` — tests:
    - Creates booking successfully when slot is available.
    - Throws `SlotTakenError` when slot already has a confirmed booking.
    - Calls `availabilityService.invalidateCache` after successful booking.
    - Uses transaction (mocks `prisma.$transaction`).

- [x] Task 4: Create `bookFreeSession` Server Action (AC: #3, #4, #5, #7, #8)
  - [x] 4.1 Create `src/app/(public)/[slug]/book/actions.ts` with:
    ```typescript
    "use server"
    export async function bookFreeSession(
      input: BookFreeSessionInput
    ): Promise<ActionResult<BookingConfirmation>>
    ```
    - Validate input with `bookFreeSessionSchema`.
    - Verify package exists, `isFreeIntro === true`, `isActive === true`, and belongs to `hostId`.
    - Look up host to get `timezone` for display purposes.
    - Call `customerService.findOrCreate(hostId, email)`.
    - Call `bookingService.createFreeBooking(...)`.
    - Catch `SlotTakenError` → return `{ success: false, error: { code: "SLOT_TAKEN", message: "That slot was just booked by someone else — here are other times that work." } }`.
    - On success → return `{ success: true, data: { bookingId, startTime, endTime, hostName, hostTimezone } }`.
    - **NO auth check** — this is a public action (anonymous visitors).
  - [x] 4.2 Define `BookingConfirmation` type in `src/types/booking.ts`:
    ```typescript
    export interface BookingConfirmation {
      bookingId: string
      startTime: string  // ISO 8601 UTC
      endTime: string    // ISO 8601 UTC
      hostName: string
      hostTimezone: string
    }
    ```

- [x] Task 5: Create TimeSlotPicker component (AC: #1, #2, #6)
  - [x] 5.1 Create `src/components/booking/time-slot-picker.tsx` — `"use client"` component:
    - **Props:** `slug: string`, `onSlotSelected: (slot: TimeSlot, dayLabel: string) => void`, `onSlotDeselected: () => void`
    - **State:** `selectedDay` (index), `selectedSlot` (TimeSlot | null), `availability` (AvailabilityResult | null), `loading` (boolean), `error` (string | null)
    - **Data fetching:** On mount + when `slug` changes, fetch `/${slug}/availability` endpoint. Show skeleton loading state while fetching.
    - **Day pills row:** Horizontal scrollable container (`overflow-x-auto`, `flex`, `gap-2`). Each pill: date label format "Thu 13". Active pill: `bg-tt-primary text-white`. Inactive: `bg-tt-surface border border-tt-border`. Auto-select first day with available slots. Arrow key navigation between pills.
    - **Slot list:** Vertical stack of full-width buttons. Format: "10:00" (start time only). Gap: 14px (`gap-3.5`). Min height 44px. Selected slot: `bg-tt-primary-light border-2 border-tt-primary` + checkmark icon. Default: `bg-tt-surface border border-tt-border`. Use `role="radiogroup"` with `role="radio"` on each slot.
    - **Empty day:** "No available times on this day. Try another day." in `text-tt-text-muted`.
    - When a slot is selected, call `onSlotSelected(slot, dayLabel)`. When deselected (tap again or tap different slot on different day), call accordingly.
  - [x] 5.2 Add a `refreshAvailability()` method/function that re-fetches availability data — called after a `SLOT_TAKEN` error to show updated slots.

- [x] Task 6: Create BookingConfirmation component (AC: #3)
  - [x] 6.1 Create `src/components/booking/booking-confirmation.tsx` — component:
    - **Props:** `hostName: string`, `startTime: string` (ISO), `endTime: string` (ISO), `hostTimezone: string`
    - Renders: success checkmark icon (green circle with check), "Session booked!" heading (h1), formatted date/time in host timezone (e.g., "Thursday, February 13, 2026 at 11:00"), host name, "We sent a confirmation to your email" message, "Back to {hostName}" link → `/{slug}`.
    - Note: `meetLink` is null at this point (Story 3.4 adds GCal sync). Show "Meet link will be sent via email" as a graceful placeholder.

- [x] Task 7: Create booking page (AC: #1, #2, #3, #4, #5, #7, #8)
  - [x] 7.1 Create `src/app/(public)/[slug]/book/page.tsx` — server component wrapper:
    - Receives `params: Promise<{ slug: string }>` and `searchParams: Promise<{ package?: string }>`.
    - `await params` and `await searchParams` (Next.js 16 Promise pattern).
    - If no `package` query param → `redirect(`/${slug}`)`.
    - Look up host via `hostService.findBySlugPublic(slug)` → if null, `redirect(`/${slug}`)`.
    - Look up package via `packageService.findById(packageId)` → if null, not `isFreeIntro`, not `isActive`, or doesn't belong to this host → `redirect(`/${slug}`)`.
    - Render the `BookingFlowClient` component passing `slug`, `hostId`, `hostName`, `packageId`, `packageName`.
  - [x] 7.2 Create `src/app/(public)/[slug]/book/booking-flow-client.tsx` — `"use client"` component:
    - **State:** `step` ("select-slot" | "confirmation"), `selectedSlot` (TimeSlot | null), `selectedDayLabel` (string), `email` (string), `emailError` (string | null), `isSubmitting` (boolean), `slotTakenError` (boolean), `confirmationData` (BookingConfirmation | null)
    - **Step "select-slot":**
      - Page header: host name + "Book free session" subheading.
      - `<TimeSlotPicker>` component.
      - When slot selected → show sticky confirm bar at bottom:
        - Selected context text: "Confirm booking — {dayLabel}, {time}" (e.g., "Confirm booking — Thu Feb 13, 11:00")
        - Email input with label "Your email" (required).
        - "Confirm booking" gradient button — disabled until email is valid and slot is selected. Shows loading spinner when submitting.
      - On submit: call `bookFreeSession` Server Action.
      - If `SLOT_TAKEN` error: show toast with warm message, re-fetch availability, clear selected slot.
      - If validation error: show inline error on email field.
      - If success: transition to "confirmation" step.
    - **Step "confirmation":**
      - Render `<BookingConfirmation>` with returned data.
  - [x] 7.3 Create `src/app/(public)/[slug]/book/loading.tsx` — skeleton loading state.

- [x] Task 8: Add `findById` method to package service (AC: #7, #8)
  - [x] 8.1 If `packageService.findById` does not already exist with the needed fields, add/update it in `src/services/package.service.ts` to return `{ id, name, sessionCount, priceInCents, isFreeIntro, isActive, hostId }`.
  - [x] 8.2 Add test for `findById` in `src/services/package.service.test.ts`.

- [x] Task 9: Write component and page tests (all ACs)
  - [x] 9.1 Create `src/components/booking/time-slot-picker.test.tsx` — tests:
    - Renders day pills from availability data.
    - Auto-selects first day with available slots.
    - Shows slot list for selected day.
    - Shows selected state on slot click.
    - Shows "No available times" message for empty day.
    - Calls `onSlotSelected` callback when slot is selected.
  - [x] 9.2 Create `src/components/booking/booking-confirmation.test.tsx` — tests:
    - Renders "Session booked!" heading.
    - Displays formatted date/time in host timezone.
    - Shows "We sent a confirmation to your email" message.
  - [x] 9.3 Create `src/app/(public)/[slug]/book/page.test.tsx` — tests:
    - Redirects when no package param provided.
    - Redirects when package is not found.
    - Redirects when package is not free intro.
    - Redirects when package is inactive.
    - Redirects when host slug is invalid.
    - Renders booking flow for valid free intro package.

## Dev Notes

### Architecture Patterns & Constraints

**Public Server Action (No Auth Required):**
This is the first Server Action that does NOT require authentication. Unlike all previous Server Actions that check `supabase.auth.getUser()`, `bookFreeSession` is called by anonymous visitors. Do NOT add any auth check.

```typescript
// src/app/(public)/[slug]/book/actions.ts
"use server"

import { z } from "zod"
import { bookFreeSessionSchema } from "@/lib/validations/booking"
import { customerService } from "@/services/customer.service"
import { bookingService, SlotTakenError } from "@/services/booking.service"
import { packageService } from "@/services/package.service"
import { hostService } from "@/services/host.service"
import type { ActionResult } from "@/types/actions"
import type { BookingConfirmation } from "@/types/booking"

export async function bookFreeSession(
  input: z.infer<typeof bookFreeSessionSchema>
): Promise<ActionResult<BookingConfirmation>> {
  // 1. Validate input
  const parsed = bookFreeSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } }
  }

  // 2. NO AUTH CHECK — public action

  // 3. Verify package is free intro, active, and belongs to host
  const pkg = await packageService.findById(parsed.data.packageId)
  if (!pkg || !pkg.isFreeIntro || !pkg.isActive || pkg.hostId !== parsed.data.hostId) {
    return { success: false, error: { code: "INVALID_PACKAGE", message: "This package is not available." } }
  }

  // 4. Get host info for confirmation
  const host = await hostService.findByAuthId(parsed.data.hostId)

  // 5. Find or create customer
  const customer = await customerService.findOrCreate(parsed.data.hostId, parsed.data.email)

  // 6. Create booking with optimistic locking
  const startTime = new Date(parsed.data.startTime)
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour

  try {
    const booking = await bookingService.createFreeBooking({
      hostId: parsed.data.hostId,
      customerId: customer.id,
      packageId: parsed.data.packageId,
      startTime,
      endTime,
    })

    return {
      success: true,
      data: {
        bookingId: booking.id,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        hostName: host?.name ?? "",
        hostTimezone: host?.timezone ?? "UTC",
      },
    }
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return { success: false, error: { code: "SLOT_TAKEN", message: "That slot was just booked by someone else — here are other times that work." } }
    }
    console.error("bookFreeSession failed:", error)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Could not complete your booking. Please try again." } }
  }
}
```

**Optimistic Locking Pattern (from architecture.md):**
```typescript
// src/services/booking.service.ts
import { prisma } from "@/lib/prisma"
import { availabilityService } from "@/services/availability.service"

export class SlotTakenError extends Error {
  code = "SLOT_TAKEN"
  constructor(message = "This slot was just booked") {
    super(message)
    this.name = "SlotTakenError"
  }
}

export const bookingService = {
  async createFreeBooking(input: {
    hostId: string
    customerId: string
    packageId: string
    startTime: Date
    endTime: Date
  }) {
    const booking = await prisma.$transaction(async (tx) => {
      // Check slot is still available
      const existing = await tx.booking.findFirst({
        where: {
          hostId: input.hostId,
          startTime: input.startTime,
          status: "confirmed",
        },
      })
      if (existing) {
        throw new SlotTakenError()
      }

      return tx.booking.create({
        data: {
          hostId: input.hostId,
          customerId: input.customerId,
          packageId: input.packageId,
          startTime: input.startTime,
          endTime: input.endTime,
          status: "confirmed",
        },
        select: { id: true, startTime: true, endTime: true, status: true },
      })
    })

    // Invalidate availability cache after successful booking
    availabilityService.invalidateCache(input.hostId)

    return booking
  },
}
```

**Customer Upsert Pattern:**
```typescript
// src/services/customer.service.ts
import { prisma } from "@/lib/prisma"

export const customerService = {
  async findOrCreate(hostId: string, email: string, name?: string) {
    return prisma.customer.upsert({
      where: { hostId_email: { hostId, email } },
      create: { email, hostId, name: name ?? null },
      update: {},  // no-op on existing
      select: { id: true, email: true, name: true, hostId: true },
    })
  },
}
```

**Client-Side Availability Fetching:**
```typescript
// Inside TimeSlotPicker — fetch availability from existing route
useEffect(() => {
  setLoading(true)
  fetch(`/${slug}/availability`)
    .then(res => res.json())
    .then((data: AvailabilityResult) => {
      setAvailability(data)
      // Auto-select first day with slots
      const firstDayWithSlots = data.days.findIndex(d => d.slots.length > 0)
      setSelectedDay(firstDayWithSlots >= 0 ? firstDayWithSlots : 0)
    })
    .catch(() => setError("Could not load available times. Please try again."))
    .finally(() => setLoading(false))
}, [slug])
```

**Time Display Formatting:**
```typescript
// Format slot time for display (e.g., "10:00")
const formatSlotTime = (isoString: string) => {
  // TimeSlot.start is already in host timezone (e.g., "2026-02-16T10:00:00")
  return isoString.slice(11, 16) // Extract "10:00"
}

// Format for confirmation (e.g., "Thursday, February 13, 2026 at 11:00")
const formatConfirmationDateTime = (isoUtc: string, timezone: string) => {
  const date = new Date(isoUtc)
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    hour12: false,
  }).format(date)
}
```

**startTime Conversion (Host Local → UTC):**
The availability API returns slots in host timezone (e.g., `"2026-02-16T10:00:00"`). The Server Action expects UTC. The client component must convert before calling the action:

```typescript
// The TimeSlot.start from availability is a local datetime without timezone offset
// We need to send it as-is to the server, which will interpret it in the host's timezone
// Option: Send the local string, let the server convert using the host's timezone
// Simpler: The startTime in the schema can accept the local string, and the server
// creates a proper UTC Date using the host's timezone info
```

**IMPORTANT — startTime handling approach:**
The availability service returns slots as local time strings (e.g., `"2026-02-16T10:00:00"` in `Europe/Rome`). The booking action should:
1. Receive the `startTime` as the local ISO string from the client.
2. Look up the host's timezone.
3. Convert to UTC using timezone-aware parsing before storing in the database.

Use the approach from `availability.service.ts` which already handles timezone conversions (`zonedToUtc` helper function if one exists, or use `Intl.DateTimeFormat` for conversion).

### Critical Implementation Details

**Prisma Schema — Already Complete:**
`Customer` and `Booking` models already exist from Story 3.2. No schema changes needed.

**Sticky Confirm Bar (UX spec):**
```tsx
{selectedSlot && (
  <div className="fixed bottom-0 left-0 right-0 bg-tt-surface border-t border-tt-border p-4 shadow-lg z-10">
    <div className="mx-auto max-w-[640px]">
      <p className="text-sm font-medium text-tt-text-primary mb-3">
        Confirm booking — {selectedDayLabel}, {formatSlotTime(selectedSlot.start)}
      </p>
      <div className="mb-3">
        <label htmlFor="email" className="text-sm text-tt-text-secondary mb-1 block">
          Your email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
          placeholder="you@example.com"
          className={emailError ? "border-tt-error" : ""}
        />
        {emailError && (
          <p className="text-sm text-tt-error mt-1">{emailError}</p>
        )}
      </div>
      <Button
        onClick={handleConfirmBooking}
        disabled={!email || isSubmitting}
        className="w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white"
      >
        {isSubmitting ? "Booking..." : "Confirm booking"}
      </Button>
    </div>
  </div>
)}
```

**Day Pills Row:**
```tsx
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
  {availability.days.map((day, index) => (
    <button
      key={day.date}
      onClick={() => { setSelectedDay(index); setSelectedSlot(null) }}
      className={cn(
        "flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors min-h-[44px]",
        selectedDay === index
          ? "bg-tt-primary text-white"
          : "bg-tt-surface border border-tt-border text-tt-text-primary hover:bg-tt-bg-subtle"
      )}
    >
      {day.dayLabel}
    </button>
  ))}
</div>
```

**Slot Selection (radio pattern):**
```tsx
<div role="radiogroup" aria-label="Available time slots" className="space-y-3.5">
  {currentDay.slots.map((slot) => (
    <button
      key={slot.start}
      role="radio"
      aria-checked={selectedSlot?.start === slot.start}
      onClick={() => handleSlotClick(slot)}
      className={cn(
        "w-full rounded-lg px-4 py-3 text-center font-medium transition-colors min-h-[44px]",
        selectedSlot?.start === slot.start
          ? "bg-tt-primary-light border-2 border-tt-primary text-tt-primary"
          : "bg-tt-surface border border-tt-border text-tt-text-primary hover:bg-tt-bg-subtle"
      )}
    >
      <span className="flex items-center justify-center gap-2">
        {selectedSlot?.start === slot.start && <CheckIcon className="h-4 w-4" />}
        {formatSlotTime(slot.start)}
      </span>
    </button>
  ))}
</div>
```

### Previous Story Intelligence

**From Story 3.2 (Availability Engine — review):**
- Availability service fully implemented at `src/services/availability.service.ts`.
- `getAvailableSlots(hostId, { from, to })` returns `AvailabilityResult` with `days[]` containing `TimeSlot[]`.
- `invalidateCache(hostId)` exists — MUST be called after booking creation.
- Public GET route exists at `/(public)/[slug]/availability/route.ts` — returns JSON with `Cache-Control: no-store`.
- `AvailabilityResult`, `DayAvailability`, `TimeSlot` types defined in `src/types/availability.ts`.
- 262/264 tests pass (2 pre-existing failures in `host.test.ts` and `stripe/route.test.ts`).
- Fixed timezone conversion issue: `zonedToUtc` function was corrected in 3.2 — reuse this pattern.

**From Story 3.1 (Public Host Page — done):**
- `PackageCardPublic` already links to `/{slug}/book?package={packageId}` — this route MUST be created.
- `hostService.findBySlugPublic(slug)` returns `{ id, name, slug, description, avatarUrl }` for onboarded hosts.
- `packageService.findActiveByHostId(hostId)` returns active packages ordered with free intro first.
- `formatCurrency` utility exists in `src/lib/utils.ts`.
- Server component testing pattern: mock services with `vi.mock`, mock `next/navigation`.

**From Story 2.3 (Google Calendar):**
- `src/lib/google/auth.ts` has `createOAuth2Client()` — used by the availability service for GCal fetching.
- Host model has `timezone` field (IANA format, e.g., "Europe/Rome").

**Established Code Patterns:**
- Service pattern: plain object with methods, uses `prisma` singleton from `@/lib/prisma`.
- Import: `import { prisma } from "@/lib/prisma"` in services.
- Prisma client: imported from `@/generated/prisma/client` (NOT `@/generated/prisma`).
- Tests: co-located with source files, use `vi.mock("@/lib/prisma")`.
- shadcn components available: button, card, avatar, badge, skeleton, separator, input, textarea, form, label, sonner (toast), dialog.
- Color tokens use `tt-` prefix (e.g., `text-tt-primary`, `bg-tt-surface`).

### Git Intelligence

**Recent commits (most recent first):**
1. `a8639ee` — Review Story 3.2: Availability Engine
2. `ac51ec7` — Story 3.1: Public Host Page
3. `cf090a0` — Deploy fix Story 2.5
4. `32959f0` — Story 2.5: Free Trial Activation
5. `c0d173e` — Story 2.4: Package Creation

**Patterns:** Service → Action → Component pattern consistent across all stories. `googleapis` already installed. All dependencies needed for Story 3.3 are already in `package.json`.

### Project Structure Notes

**Files to create:**
- `src/lib/validations/booking.ts` — Zod schema for free session booking
- `src/types/booking.ts` — `BookingConfirmation` type
- `src/services/customer.service.ts` — Customer find/create
- `src/services/customer.service.test.ts` — Customer service tests
- `src/services/booking.service.ts` — Booking creation with optimistic locking
- `src/services/booking.service.test.ts` — Booking service tests
- `src/components/booking/time-slot-picker.tsx` — Day pills + slot list component
- `src/components/booking/time-slot-picker.test.tsx` — Slot picker tests
- `src/components/booking/booking-confirmation.tsx` — Success screen
- `src/components/booking/booking-confirmation.test.tsx` — Confirmation tests
- `src/app/(public)/[slug]/book/page.tsx` — Server component wrapper
- `src/app/(public)/[slug]/book/booking-flow-client.tsx` — Client booking flow
- `src/app/(public)/[slug]/book/actions.ts` — `bookFreeSession` Server Action
- `src/app/(public)/[slug]/book/loading.tsx` — Loading skeleton
- `src/app/(public)/[slug]/book/page.test.tsx` — Page tests

**Files to modify:**
- `src/services/package.service.ts` — Add/update `findById` method if needed (check existing)

**Existing files to use (do not modify):**
- `src/lib/prisma.ts` — Prisma singleton
- `src/services/availability.service.ts` — Call `invalidateCache` after booking, fetch availability from API
- `src/services/host.service.ts` — Use `findBySlugPublic` and `findByAuthId`
- `src/types/availability.ts` — Reuse `AvailabilityResult`, `TimeSlot`, `DayAvailability` types
- `src/types/actions.ts` — `ActionResult<T>` type
- `src/app/(public)/[slug]/availability/route.ts` — Client fetches this for slot data
- `src/components/ui/*` — shadcn primitives (button, input, card, skeleton, sonner)

### Dependencies

No new npm packages needed. All required dependencies are already installed.

### Testing Notes

**Mock Patterns:**
```typescript
// Mock Prisma for service tests
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { upsert: vi.fn() },
    booking: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn) => fn({
      booking: { findFirst: vi.fn(), create: vi.fn() },
    })),
  },
}))

// Mock services for action tests
vi.mock("@/services/customer.service", () => ({
  customerService: { findOrCreate: vi.fn() },
}))
vi.mock("@/services/booking.service", () => ({
  bookingService: { createFreeBooking: vi.fn() },
  SlotTakenError: class extends Error { code = "SLOT_TAKEN" },
}))
vi.mock("@/services/package.service", () => ({
  packageService: { findById: vi.fn() },
}))

// Mock fetch for TimeSlotPicker tests
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve(mockAvailabilityResult),
  })
) as any
```

**Key Edge Cases:**
- Double-click on "Confirm booking" button → disable button during submission
- Slot taken during submission → show warm error, refresh availability
- Invalid package ID in URL → redirect to public page
- Paid package ID in URL → redirect to public page
- Host with no available slots → show empty states per day
- Very long email address → Zod validation handles max length

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Free Session Booking Flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Slot Booking Optimistic Locking (FR36)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Action Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Format Standards — Date/Time]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure — (public) routes]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component 4: Time Slot Picker]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2: Customer Conversion Funnel]
- [Source: _bmad-output/planning-artifacts/prd.md#FR21 — Book free intro from public page without auth]
- [Source: _bmad-output/planning-artifacts/prd.md#FR36 — Double-booking prevention]
- [Source: _bmad-output/implementation-artifacts/3-2-availability-engine.md — Previous story learnings]
- [Source: _bmad-output/implementation-artifacts/3-1-public-host-page.md — Previous story learnings]
- [Source: src/services/availability.service.ts — Availability computation and cache invalidation]
- [Source: src/types/availability.ts — TimeSlot, DayAvailability, AvailabilityResult types]
- [Source: src/app/(public)/[slug]/availability/route.ts — Public availability API]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Created Zod validation schema (`bookFreeSessionSchema`) with email, packageId, hostId, startTime fields. Exported `BookFreeSessionInput` type.
- Task 2: Created `customerService.findOrCreate()` using Prisma upsert on `hostId_email` composite unique. 4 tests passing.
- Task 3: Created `bookingService.createFreeBooking()` with `$transaction` for optimistic locking. Throws `SlotTakenError` on conflict. Calls `availabilityService.invalidateCache()` after success. 6 tests passing.
- Task 4: Created `bookFreeSession` server action — NO auth check (public). Validates input, verifies package is free+active, finds/creates customer, creates booking. Returns `ActionResult<BookingConfirmation>`. Also created `BookingConfirmation` type in `src/types/booking.ts`.
- Task 5: Created `TimeSlotPicker` component with horizontal scrollable day pills, vertical slot list, radiogroup accessibility, skeleton loading, auto-select first day with slots, arrow key navigation. Exposes `__refreshAvailability` on window for SLOT_TAKEN recovery.
- Task 6: Created `BookingConfirmation` component with success icon, formatted date/time in host timezone, "Meet link will be sent via email" placeholder, back link.
- Task 7: Created booking page (server component with redirect guards), `BookingFlowClient` (client component with slot selection, sticky confirm bar, email input, toast errors), and loading skeleton.
- Task 8: Existing `packageService.findById(id, hostId)` already has all needed fields — no changes required. Adapted server action to pass both params.
- Task 9: Created 30 new tests across 5 test files — all passing. Full regression suite: 292 passed, 2 failed (pre-existing failures in `host.test.ts` and `stripe/route.test.ts`).

### Change Log

- 2026-02-15: Implemented Story 3.3 — Free Session Booking Flow. Created booking validation, customer service, booking service with optimistic locking, public server action, TimeSlotPicker, BookingConfirmation, booking page with client flow. 30 new tests, 0 regressions.

### File List

**New files:**
- src/lib/validations/booking.ts
- src/types/booking.ts
- src/services/customer.service.ts
- src/services/customer.service.test.ts
- src/services/booking.service.ts
- src/services/booking.service.test.ts
- src/components/booking/time-slot-picker.tsx
- src/components/booking/time-slot-picker.test.tsx
- src/components/booking/booking-confirmation.tsx
- src/components/booking/booking-confirmation.test.tsx
- src/app/(public)/[slug]/book/page.tsx
- src/app/(public)/[slug]/book/booking-flow-client.tsx
- src/app/(public)/[slug]/book/actions.ts
- src/app/(public)/[slug]/book/loading.tsx
- src/app/(public)/[slug]/book/page.test.tsx

**Modified files:**
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-3-free-session-booking-flow.md
