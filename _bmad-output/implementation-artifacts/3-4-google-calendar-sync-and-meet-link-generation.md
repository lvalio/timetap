# Story 3.4: Google Calendar Sync & Meet Link Generation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a host,
I want booked sessions to appear on my Google Calendar with a Meet link,
so that my schedule stays in sync and sessions have a video call link automatically.

## Acceptance Criteria

1. **Given** a session is successfully booked (free intro or any booking), **When** the booking is confirmed, **Then** the system creates a Google Calendar event on the host's calendar using the host's stored refresh token, **And** the event includes: title `[TimeTap] Session with {customer_email}`, start time, end time (1 hour default), description with session details, **And** the customer's email is added as a guest (they receive a Google Calendar invitation via email), **And** a Google Meet link is auto-generated and attached to the calendar event, **And** the booking record is updated with `googleEventId` and `meetLink`.

2. **Given** the Google Calendar API call fails, **When** the event creation is attempted, **Then** the booking is still confirmed (calendar sync is not blocking), **And** the error is logged server-side, **And** the `meetLink` field remains null on the booking (confirmation screen/email handles gracefully with "Meet link will be sent separately" or similar messaging).

## Tasks / Subtasks

- [ ] Task 1: Add `createCalendarEvent()` to Google Calendar library (AC: #1)
  - [ ] 1.1 Add `createCalendarEvent(refreshToken, eventData)` function to `src/lib/google/calendar.ts`
  - [ ] 1.2 Configure `conferenceDataVersion: 1` and `conferenceData.createRequest` to auto-generate Google Meet link
  - [ ] 1.3 Add customer email as attendee via `attendees` field
  - [ ] 1.4 Set event title format: `[TimeTap] Session with {customer_email}`
  - [ ] 1.5 Include session details in event description (host name, package name, TimeTap branding)
  - [ ] 1.6 Return `{ googleEventId, meetLink }` from the function
  - [ ] 1.7 Write unit tests for `createCalendarEvent`

- [ ] Task 2: Integrate calendar event creation into booking service (AC: #1, #2)
  - [ ] 2.1 After successful booking creation in `booking.service.ts`, call `createCalendarEvent()`
  - [ ] 2.2 Update the booking record with `googleEventId` and `meetLink` from the calendar response
  - [ ] 2.3 Wrap calendar call in try/catch — booking remains confirmed even if calendar fails (AC: #2)
  - [ ] 2.4 Log error server-side on calendar failure
  - [ ] 2.5 Invalidate availability cache after calendar event creation (already done for booking)
  - [ ] 2.6 Fetch host's `googleRefreshToken` in the booking flow (may need to expand host query)
  - [ ] 2.7 Write unit tests for booking-with-calendar integration (mock calendar API)

- [ ] Task 3: Update booking confirmation to include Meet link (AC: #1, #2)
  - [ ] 3.1 Add `meetLink` to `BookingConfirmation` type in `src/types/booking.ts`
  - [ ] 3.2 Return `meetLink` from `bookFreeSession` action
  - [ ] 3.3 Update `BookingConfirmation` component to display Meet link when available
  - [ ] 3.4 Handle null `meetLink` gracefully — show "Meet link will be sent via email" fallback
  - [ ] 3.5 Write tests for confirmation component with/without Meet link

- [ ] Task 4: Verify end-to-end flow and edge cases (AC: #1, #2)
  - [ ] 4.1 Test happy path: book session → calendar event created → Meet link displayed
  - [ ] 4.2 Test degraded path: book session → calendar API down → booking confirmed → no Meet link
  - [ ] 4.3 Test missing refresh token: host never connected calendar → skip calendar creation gracefully
  - [ ] 4.4 Verify cache invalidation after calendar event creation
  - [ ] 4.5 Run full regression test suite

## Dev Notes

### Architecture Patterns & Constraints

- **Service boundary:** All Google Calendar API calls MUST go through `src/lib/google/calendar.ts` — never called directly from actions or services (architecture mandate)
- **Server Action pattern:** `ActionResult<T>` return type, Zod validation, never throw from actions
- **Non-blocking calendar sync:** Calendar event creation happens AFTER the booking transaction commits. If it fails, the booking is already confirmed. This is a fire-and-forget pattern with error logging.
- **Optimistic locking:** Already implemented in `booking.service.ts` via `prisma.$transaction` — do NOT modify transaction logic

### Existing Infrastructure (from Story 2.3 & 3.2)

**Google OAuth & Token Management:**
- `src/lib/google/auth.ts` — `createOAuth2Client()`, token exchange, auth URL generation
- Only refresh tokens stored in DB (`Host.googleRefreshToken`)
- Access tokens generated on-demand via `oauth2Client.setCredentials({ refresh_token })`
- googleapis library handles automatic token refresh

**Google Calendar Read (already working):**
- `src/lib/google/calendar.ts` — `getCalendarBusyTimes(refreshToken, timeMin, timeMax)` using `calendar.freebusy.query`
- 5-minute TTL cache in `src/lib/cache.ts` (`TTLCache<T>`)
- Graceful degradation if API unavailable (availability.service.ts handles `gcalDegraded` flag)

**Booking Service (from Story 3.3):**
- `src/services/booking.service.ts` — `createFreeBooking()` with optimistic locking
- Creates booking with `googleEventId: null, meetLink: null` currently
- Invalidates availability cache after booking (`availabilityService.invalidateCache(hostId)`)
- `SlotTakenError` class for conflict handling

**Prisma Schema fields (already exist, currently null):**
- `Booking.googleEventId` (String, optional)
- `Booking.meetLink` (String, optional)
- `Host.googleRefreshToken` (String, optional)

### Key Implementation Details

**Creating Calendar Events with Meet Links (Google Calendar API v3):**
```typescript
// Pattern for creating event with auto-generated Meet link
const event = await calendar.events.insert({
  calendarId: "primary",
  conferenceDataVersion: 1,  // Required for Meet link generation
  requestBody: {
    summary: `[TimeTap] Session with ${customerEmail}`,
    start: { dateTime: startTime.toISOString(), timeZone: hostTimezone },
    end: { dateTime: endTime.toISOString(), timeZone: hostTimezone },
    attendees: [{ email: customerEmail }],
    conferenceData: {
      createRequest: {
        requestId: bookingId,  // Unique per event
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    description: "Session booked via TimeTap",
  },
})
// Meet link: event.data.conferenceData?.entryPoints?.[0]?.uri
// Event ID: event.data.id
```

**Calendar Event Creation MUST happen outside the booking transaction:**
```typescript
// In booking.service.ts:
// 1. Transaction: create booking (optimistic lock) → returns booking
// 2. AFTER transaction: try calendar event creation
// 3. If calendar succeeds: update booking with googleEventId + meetLink
// 4. If calendar fails: log error, return booking without meetLink
```

**Host query needs refresh token:**
- Current `bookFreeSession` action fetches host for confirmation details
- Extend this query to include `googleRefreshToken` and `timezone`
- Pass to booking service or call calendar directly from action

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/google/calendar.ts` | **Modify** | Add `createCalendarEvent()` function |
| `src/services/booking.service.ts` | **Modify** | Call calendar event creation after booking |
| `src/types/booking.ts` | **Modify** | Add `meetLink` to `BookingConfirmation` |
| `src/app/(public)/[slug]/book/actions.ts` | **Modify** | Include `meetLink` in response, pass refresh token |
| `src/components/booking/booking-confirmation.tsx` | **Modify** | Display Meet link or fallback message |
| `src/lib/google/calendar.test.ts` | **Create** | Tests for `createCalendarEvent` |
| `src/services/booking.service.test.ts` | **Modify** | Add tests for calendar integration |
| `src/components/booking/booking-confirmation.test.tsx` | **Modify** | Add tests for Meet link display |

### Testing Standards

- Mock `googleapis` module for calendar API tests
- Mock `calendar.ts` module when testing booking service
- Test both success and failure paths for calendar event creation
- Test `BookingConfirmation` component with `meetLink` present and null
- Maintain existing 292+ passing tests (2 pre-existing failures in `host.test.ts` and `stripe/route.test.ts`)
- Use `vi.mock` pattern established in Story 3.3

### Project Structure Notes

- All changes align with existing project structure from architecture document
- `src/lib/google/calendar.ts` is the correct location for new calendar write functions
- No new npm packages needed — `googleapis` already installed from Story 2.3
- Color tokens: `tt-primary`, `tt-text-muted` etc. for any UI changes

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — API & Communication Patterns, Integration Boundary, Slot Booking Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md — Phase 4: Google Calendar & Meet Setup, lines 445-458]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure, lib/google/calendar.ts]
- [Source: _bmad-output/planning-artifacts/prd.md — FR33, FR34, FR35]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Confirmation Screen Pattern, Meet Link in Confirmations]
- [Source: _bmad-output/implementation-artifacts/3-3-free-session-booking-flow.md — Dev Notes, Code Patterns]
- [Source: src/lib/google/calendar.ts — existing getCalendarBusyTimes implementation]
- [Source: src/lib/google/auth.ts — OAuth2Client creation, token management]
- [Source: src/services/booking.service.ts — createFreeBooking with optimistic locking]
- [Source: src/services/availability.service.ts — cache invalidation, graceful degradation pattern]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
