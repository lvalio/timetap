# Story 3.2: Availability Engine

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system component,
I want to compute available booking slots accurately,
So that customers only see times when the host is genuinely free.

## Acceptance Criteria

1. **Given** a request for available slots for a specific host and date range, **When** the availability service computes slots, **Then** it starts with the host's bookable hours template for each requested day, **And** subtracts Google Calendar busy times (fetched from Google Calendar API), **And** subtracts existing TimeTap confirmed bookings for the host, **And** subtracts any slots within the 24-hour minimum booking window from now, **And** returns a list of available time slots in the host's timezone, **And** slots start from tomorrow (never today).

2. **Given** Google Calendar data is requested, **When** the API call is made, **Then** the response is cached with approximately 5-minute TTL, **And** cache is invalidated when a booking or reschedule writes to Google Calendar, **And** the fetch uses the host's stored Google refresh token.

3. **Given** the Google Calendar API is unavailable or returns an error, **When** the availability service runs, **Then** it gracefully degrades: computes availability from bookable hours minus TimeTap bookings only (NFR20), **And** a warning is logged server-side, **And** availability still loads within 1 second (NFR3).

4. **Given** a day has no available slots, **When** the slot list is displayed, **Then** that day shows no slots (day pill is still visible but slot area shows "No available times on this day. Try another day." in text-muted).

## Tasks / Subtasks

- [x] Task 1: Add Booking and Customer models to Prisma schema (AC: #1)
  - [x] 1.1 Add `Customer` model to `prisma/schema.prisma`: `id` (UUID, PK), `email` (String), `name` (String?), `hostId` (UUID FK → Host), `createdAt`, `updatedAt`. Unique constraint on `@@unique([hostId, email])`. Map to `customers` table.
  - [x] 1.2 Add `Booking` model to `prisma/schema.prisma`: `id` (UUID, PK), `hostId` (UUID FK → Host), `customerId` (UUID FK → Customer), `packageId` (UUID FK → Package), `startTime` (DateTime), `endTime` (DateTime), `status` (String, default "confirmed"), `googleEventId` (String?), `meetLink` (String?), `createdAt`, `updatedAt`. Map to `bookings` table.
  - [x] 1.3 Add relations: Host → Customer[], Host → Booking[], Customer → Booking[], Package → Booking[].
  - [x] 1.4 Run `pnpm prisma db push` to apply schema changes.
  - [x] 1.5 Regenerate Prisma client: `pnpm prisma generate`.

- [x] Task 2: Create Google Calendar integration module (AC: #1, #2, #3)
  - [x] 2.1 Create `src/lib/google/calendar.ts` with:
    - `getCalendarBusyTimes(refreshToken: string, timeMin: Date, timeMax: Date): Promise<{ start: Date; end: Date }[]>` — Uses `googleapis` to call `calendar.freebusy.query` for the primary calendar. Exchanges refresh token for access token via the existing `createOAuth2Client()` from `auth.ts`.
    - Returns array of busy time ranges.
    - Throws on API error (caller handles graceful degradation).
  - [x] 2.2 Create `src/lib/google/calendar.test.ts` — tests: returns busy times array, handles API error by throwing, uses refresh token correctly.

- [x] Task 3: Create in-memory cache for Google Calendar data (AC: #2)
  - [x] 3.1 Create `src/lib/cache.ts` with a simple `TTLCache<T>` class:
    - `get(key: string): T | undefined` — returns cached value if not expired.
    - `set(key: string, value: T, ttlMs: number): void` — stores value with expiry.
    - `invalidate(key: string): void` — removes cached value.
    - Uses a `Map<string, { value: T; expiresAt: number }>` internally.
    - Default TTL: 5 minutes (300_000 ms). Constant: `GCAL_CACHE_TTL_MS = 300_000`.
  - [x] 3.2 Create `src/lib/cache.test.ts` — tests: get returns undefined for missing key, set+get returns value, get returns undefined for expired key, invalidate removes key.

- [x] Task 4: Create availability service (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `src/services/availability.service.ts` with:
    - `getAvailableSlots(hostId: string, dateRange: { from: Date; to: Date }): Promise<AvailabilityResult>` — Main entry point.
    - **Step 1:** Fetch host record (need `bookableHours`, `timezone`, `googleRefreshToken`).
    - **Step 2:** Fetch Google Calendar busy times (cached, graceful degradation on failure).
    - **Step 3:** Fetch existing confirmed bookings from database for the date range.
    - **Step 4:** For each day in the range, compute available 1-hour slots by:
      a. Start with bookable hours template for that day-of-week.
      b. Subtract Google Calendar busy times (any overlap removes the slot).
      c. Subtract confirmed TimeTap bookings (any overlap removes the slot).
      d. Subtract slots within 24 hours from now.
    - **Step 5:** Return `AvailabilityResult` (see types below).
    - `invalidateCache(hostId: string): void` — Invalidates Google Calendar cache for this host. Called after booking/reschedule.
  - [x] 4.2 Create `src/types/availability.ts` with:
    ```typescript
    export interface TimeSlot {
      start: string  // ISO 8601 datetime in host timezone (e.g., "2026-02-16T09:00:00")
      end: string    // ISO 8601 datetime in host timezone (e.g., "2026-02-16T10:00:00")
    }

    export interface DayAvailability {
      date: string       // ISO date (e.g., "2026-02-16")
      dayLabel: string   // Short label (e.g., "Mon 16")
      slots: TimeSlot[]  // Available slots for this day (empty if none)
    }

    export interface AvailabilityResult {
      hostTimezone: string          // IANA timezone (e.g., "Europe/Rome")
      days: DayAvailability[]       // One entry per day in range
      gcalDegraded: boolean         // true if Google Calendar was unavailable
    }
    ```
  - [x] 4.3 Create `src/services/availability.service.test.ts` — tests:
    - Returns slots from bookable hours when no conflicts exist.
    - Subtracts Google Calendar busy times correctly.
    - Subtracts existing confirmed bookings correctly.
    - Enforces 24-hour minimum booking window (slots within 24h are excluded).
    - Slots start from tomorrow, never today.
    - Returns empty slots array for days with no bookable hours.
    - Gracefully degrades when Google Calendar API fails (sets `gcalDegraded: true`).
    - Handles host with no Google refresh token (skips GCal fetch, no error).
    - Returns correct day labels in host timezone.
    - Handles overlapping busy times (partial and full slot overlap).
    - Caches Google Calendar results (second call uses cache).
    - `invalidateCache` causes fresh Google Calendar fetch.

- [x] Task 5: Create availability API route for public access (AC: #1)
  - [x] 5.1 Create `src/app/(public)/[slug]/availability/route.ts` — GET route handler:
    - Query params: `from` (ISO date), `to` (ISO date). Defaults: `from` = tomorrow, `to` = 14 days from now.
    - Look up host by slug (using `hostService.findBySlugPublic`).
    - If host not found → 404 JSON response.
    - Call `availabilityService.getAvailableSlots(host.id, { from, to })`.
    - Return JSON response with `AvailabilityResult`.
    - Response headers: `Cache-Control: no-store` (availability is dynamic, must not be cached by CDN).
  - [x] 5.2 Create `src/app/(public)/[slug]/availability/route.test.ts` — tests: returns availability JSON, 404 for unknown slug, uses default date range when no params, validates date params.

## Dev Notes

### Architecture Patterns & Constraints

**Availability Computation Formula (from architecture.md):**
```
Available slots = (host bookable hours) - (Google Calendar busy times) - (TimeTap confirmed bookings) - (24h minimum window)
```

**BookableHours JSON format** (stored as `Json` field on Host model):
```typescript
// Shape: Record<DayName, { start: string; end: string }[]>
// Example:
{
  "monday": [{ "start": "09:00", "end": "17:00" }],
  "tuesday": [{ "start": "09:00", "end": "12:00" }, { "start": "14:00", "end": "18:00" }],
  "wednesday": [],  // No bookable hours
  "thursday": [{ "start": "10:00", "end": "16:00" }],
  "friday": [{ "start": "09:00", "end": "15:00" }],
  "saturday": [{ "start": "09:00", "end": "12:00" }],
  "sunday": []
}
```
Times are in `HH:00` format, between `08:00` and `20:00`. Each range generates 1-hour slots (e.g., `09:00-17:00` → 8 slots: 09:00, 10:00, ..., 16:00).

**Slot Duration:** 1 hour. Each slot is a 1-hour block starting at the hour mark. A bookable range `09:00-12:00` produces slots at 09:00, 10:00, 11:00 (3 slots, each ending 1 hour later).

**Host Timezone:** Stored on the `hosts` table as `timezone` (IANA format, e.g., `"Europe/Rome"`). All slot computation and display happens in the host's timezone. Dates stored in the database as UTC — convert at computation time.

**CRITICAL: Service Layer Pattern:**
```typescript
// src/services/availability.service.ts
import { prisma } from "@/lib/prisma"
import { getCalendarBusyTimes } from "@/lib/google/calendar"
import { TTLCache } from "@/lib/cache"
import type { AvailabilityResult, DayAvailability, TimeSlot } from "@/types/availability"

const gcalCache = new TTLCache<{ start: Date; end: Date }[]>()
const GCAL_CACHE_TTL_MS = 300_000 // 5 minutes

export const availabilityService = {
  async getAvailableSlots(hostId: string, dateRange: { from: Date; to: Date }): Promise<AvailabilityResult> {
    // 1. Fetch host
    const host = await prisma.host.findUniqueOrThrow({
      where: { id: hostId },
      select: { bookableHours: true, timezone: true, googleRefreshToken: true },
    })
    // 2. Fetch GCal busy times (cached, graceful degradation)
    // 3. Fetch confirmed bookings
    // 4. Compute slots per day
    // 5. Return AvailabilityResult
  },

  invalidateCache(hostId: string): void {
    gcalCache.invalidate(hostId)
  },
}
```

**Google Calendar FreeBusy API:**
```typescript
// src/lib/google/calendar.ts
import { google } from "googleapis"
import { createOAuth2Client } from "./auth"

export async function getCalendarBusyTimes(
  refreshToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<{ start: Date; end: Date }[]> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  })

  const busySlots = response.data.calendars?.primary?.busy ?? []
  return busySlots.map((slot) => ({
    start: new Date(slot.start!),
    end: new Date(slot.end!),
  }))
}
```

**Cache Implementation:**
```typescript
// src/lib/cache.ts
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>()

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }
}
```

**Slot Overlap Detection:**
A slot (e.g., 09:00-10:00) is considered blocked if ANY busy/booking time overlaps with it. Two ranges overlap if: `busyStart < slotEnd && busyEnd > slotStart`.

**24-Hour Minimum Window:**
Filter out any slot where `slotStart` is less than `Date.now() + 24 hours`. Additionally, since slots start from tomorrow, today's slots are never included regardless.

**Route Handler Pattern (NOT a Server Action — this is a GET endpoint):**
```typescript
// src/app/(public)/[slug]/availability/route.ts
import { NextRequest, NextResponse } from "next/server"
import { hostService } from "@/services/host.service"
import { availabilityService } from "@/services/availability.service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const host = await hostService.findBySlugPublic(slug)
  if (!host) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const defaultTo = new Date(tomorrow)
  defaultTo.setDate(defaultTo.getDate() + 13) // 14 days total

  const result = await availabilityService.getAvailableSlots(host.id, {
    from: from ? new Date(from) : tomorrow,
    to: to ? new Date(to) : defaultTo,
  })

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}
```

### Critical Implementation Details

**Prisma Schema Additions:**
```prisma
model Customer {
  id        String   @id @default(uuid()) @db.Uuid
  email     String
  name      String?
  hostId    String   @map("host_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  host     Host      @relation(fields: [hostId], references: [id], onDelete: Cascade)
  bookings Booking[]

  @@unique([hostId, email])
  @@map("customers")
}

model Booking {
  id            String   @id @default(uuid()) @db.Uuid
  hostId        String   @map("host_id") @db.Uuid
  customerId    String   @map("customer_id") @db.Uuid
  packageId     String   @map("package_id") @db.Uuid
  startTime     DateTime @map("start_time")
  endTime       DateTime @map("end_time")
  status        String   @default("confirmed")
  googleEventId String?  @map("google_event_id")
  meetLink      String?  @map("meet_link")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  host     Host     @relation(fields: [hostId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  package  Package  @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@map("bookings")
}
```

Also add reverse relations to existing models:
```prisma
// In Host model, add:
customers Customer[]
bookings  Booking[]

// In Package model, add:
bookings Booking[]
```

**Day-of-Week Mapping:**
```typescript
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
// JavaScript Date.getDay() returns 0=Sunday, 1=Monday, ...
// Map: date.getDay() → DAY_NAMES[date.getDay()] → bookableHours[dayName]
```

**Graceful Degradation Log:**
```typescript
console.warn(`[availability] Google Calendar unavailable for host ${hostId}: ${error.message}`)
```
Use `console.warn` (not `console.error`) — this is expected behavior per NFR20, not an application error.

### Previous Story Intelligence

**From Story 3.1 (most recent — done):**
- 234/236 tests pass (2 pre-existing failures in `host.test.ts` and `stripe/route.test.ts` — no new regressions allowed).
- `hostService.findBySlugPublic(slug)` already exists — returns `{ id, name, slug, description, avatarUrl }` for onboarded hosts. Use this for the availability route to look up hosts.
- `(public)` route group and layout already exist — `src/app/(public)/layout.tsx` is minimal, no auth.
- `formatCurrency` utility exists in `src/lib/utils.ts` (EUR format).
- Server component testing pattern established: mock services with `vi.mock`, mock `next/navigation`.

**From Story 2.3 (Google Calendar + Bookable Hours):**
- `src/lib/google/auth.ts` already has `createOAuth2Client()` and `exchangeCodeForTokens()` — reuse `createOAuth2Client()` in the new `calendar.ts` module.
- `googleRefreshToken` stored on Host model — the availability service reads this to authenticate Google Calendar API calls.
- `bookableHoursSchema` validation exists in `src/lib/validations/host.ts` — defines the `BookableHoursInput` type which matches the JSON structure stored in the database.
- `updateBookableHours` and `updateGoogleRefreshToken` methods exist on `hostService`.

**Established Code Patterns:**
- Service pattern: plain object with methods, uses `prisma` singleton from `@/lib/prisma`.
- Test pattern: mock Prisma with `vi.mock("@/lib/prisma")`, test happy path + edge cases.
- Tests co-located with source files.
- Import: `import { PrismaClient } from "@/generated/prisma/client"` (NOT `@/generated/prisma`).
- Prisma singleton: `src/lib/prisma.ts` uses driver adapter pattern with `PrismaPg` + `pg.Pool`.

**shadcn components available:** button, card, avatar, badge, skeleton, separator, input, textarea, form, label, sonner, dialog.

### Git Intelligence

**Recent commits:**
1. `ac51ec7` — Story 3.1: Public Host Page (latest)
2. `cf090a0` — Deploy fix Story 2.5
3. `32959f0` — Story 2.5: Free Trial Activation
4. `c0d173e` — Story 2.4: Package Creation
5. `483ca26` — Story 2.3: Google Calendar Connection & Bookable Hours

**Patterns:** Consistent service + action + component pattern. `googleapis` npm package is already installed (used in `src/lib/google/auth.ts`).

### Project Structure Notes

**Files to create:**
- `src/lib/google/calendar.ts` — Google Calendar FreeBusy API integration
- `src/lib/google/calendar.test.ts` — Tests for calendar integration
- `src/lib/cache.ts` — TTL cache utility
- `src/lib/cache.test.ts` — Tests for cache
- `src/services/availability.service.ts` — Core availability computation engine
- `src/services/availability.service.test.ts` — Comprehensive availability tests
- `src/types/availability.ts` — Availability-related type definitions
- `src/app/(public)/[slug]/availability/route.ts` — Public GET endpoint for availability data
- `src/app/(public)/[slug]/availability/route.test.ts` — Route handler tests

**Files to modify:**
- `prisma/schema.prisma` — Add Customer and Booking models, add relations to Host and Package

**Existing files to use (do not modify):**
- `src/lib/prisma.ts` — Prisma singleton
- `src/lib/google/auth.ts` — Reuse `createOAuth2Client()`
- `src/services/host.service.ts` — Use `findBySlugPublic` for route handler
- `src/lib/validations/host.ts` — `BookableHoursInput` type for reference

### Dependencies

No new npm packages needed. `googleapis` is already installed (used in `src/lib/google/auth.ts`).

### Testing Notes

**Priority Test Targets (from architecture.md):** Availability computation is #1 priority for testing.

**Mock Patterns:**
```typescript
// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    host: { findUniqueOrThrow: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}))

// Mock Google Calendar
vi.mock("@/lib/google/calendar", () => ({
  getCalendarBusyTimes: vi.fn(),
}))

// Mock cache (test cache behavior separately)
vi.mock("@/lib/cache", () => {
  const MockCache = vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
  }))
  return { TTLCache: MockCache }
})
```

**Key Edge Cases to Test:**
- Host with no bookable hours for a day → empty slots
- Host with no `googleRefreshToken` → skip GCal, no error
- Booking that partially overlaps a slot → slot removed
- GCal busy time spanning multiple slots → all overlapping slots removed
- Multiple bookable hour ranges in a day (e.g., morning + afternoon)
- All slots in 24h window → filtered out
- Date range spanning a weekend with no Saturday/Sunday hours

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Availability Engine]
- [Source: _bmad-output/planning-artifacts/architecture.md#Caching Strategy — On-demand Google Calendar fetch with ~5 minute TTL]
- [Source: _bmad-output/planning-artifacts/architecture.md#File Organization — availability.service.ts]
- [Source: _bmad-output/planning-artifacts/architecture.md#Slot Booking Optimistic Locking (FR36)]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS Policies — bookings and customers tables]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Conventions]
- [Source: _bmad-output/planning-artifacts/prd.md#FR7-FR11 — Availability Management]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR3 — Booking slot availability loads within 1 second]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR20 — Google Calendar sync failures handled gracefully]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component 4: Time Slot Picker]
- [Source: _bmad-output/implementation-artifacts/3-1-public-host-page.md — Previous story learnings]
- [Source: src/lib/validations/host.ts#bookableHoursSchema — BookableHours JSON shape]
- [Source: src/lib/google/auth.ts#createOAuth2Client — Reusable OAuth2 client]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Fixed `zonedToUtc` function: initial implementation used `new Date(string)` which parses in system local timezone, causing incorrect UTC conversions. Replaced with `Date.UTC()` + `toLocaleString` offset calculation approach where system timezone cancels out.
- Fixed `getDayLabel` to use `formatToParts` for consistent "Mon 2" format instead of locale-dependent ordering.

### Completion Notes List

- **Task 1:** Added `Customer` and `Booking` models to Prisma schema with all required fields, relations, and constraints. Ran `db push` and `generate` successfully.
- **Task 2:** Created `src/lib/google/calendar.ts` with `getCalendarBusyTimes` using Google Calendar FreeBusy API. 6 tests passing.
- **Task 3:** Created `src/lib/cache.ts` with generic `TTLCache<T>` class and `GCAL_CACHE_TTL_MS` constant. 6 tests passing.
- **Task 4:** Created availability service with full slot computation engine: bookable hours → subtract GCal busy → subtract bookings → subtract 24h window. Includes caching and graceful degradation. Created availability types. 12 tests passing.
- **Task 5:** Created public GET route at `/(public)/[slug]/availability` with default 14-day range, host lookup, and `Cache-Control: no-store`. 4 tests passing.
- **Full suite:** 262/264 tests pass. 2 pre-existing failures (host.test.ts, stripe/route.test.ts) — no new regressions.

### Change Log

- 2026-02-15: Story 3.2 implementation complete — availability engine with GCal integration, caching, graceful degradation, and public API route.

### File List

**New files:**
- `src/lib/google/calendar.ts` — Google Calendar FreeBusy API integration
- `src/lib/google/calendar.test.ts` — Calendar integration tests (6 tests)
- `src/lib/cache.ts` — Generic TTL cache utility
- `src/lib/cache.test.ts` — Cache tests (6 tests)
- `src/types/availability.ts` — TimeSlot, DayAvailability, AvailabilityResult types
- `src/services/availability.service.ts` — Core availability computation engine
- `src/services/availability.service.test.ts` — Availability service tests (12 tests)
- `src/app/(public)/[slug]/availability/route.ts` — Public GET endpoint for availability data
- `src/app/(public)/[slug]/availability/route.test.ts` — Route handler tests (4 tests)

**Modified files:**
- `prisma/schema.prisma` — Added Customer and Booking models, added relations to Host and Package
