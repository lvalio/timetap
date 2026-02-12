---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# TimeTap - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TimeTap, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Host Account & Onboarding**
- FR1: Host can sign up with email and password
- FR2: Host can log in and log out
- FR3: Host can connect their Google Calendar via OAuth
- FR4: Host can connect their Stripe account via Stripe Connect Standard OAuth
- FR5: Host can set up their profile (name, description, slug for public URL)
- FR6: Host can choose a unique slug for their public page (timetap.it/{slug})

**Availability Management**
- FR7: Host can define recurring bookable hours (day-of-week + time ranges)
- FR8: Host can modify their bookable hours at any time
- FR9: System reads host's Google Calendar to detect blocked/busy time
- FR10: System excludes Google Calendar busy slots from available booking times
- FR11: Available slots enforce a 24-hour minimum booking window

**Package & Credit Management**
- FR12: Host can create packages with a name, number of sessions, and price
- FR13: Host can create free intro packages (price = €0, sessions = 1)
- FR14: Host can view all their packages
- FR15: Host can edit or deactivate packages
- FR16: Host can view a customer's credit balance
- FR17: Host can gift additional credits to a customer
- FR18: Host can refund/return credits to a customer (credit adjustment, not monetary refund)

**Host Public Page**
- FR19: Visitors can view a host's public profile page at timetap.it/{slug}
- FR20: Visitors can see the host's available packages on their public page
- FR21: Visitors can book a free intro session from the public page without authentication
- FR22: Visitors can purchase a paid package from the public page via Stripe Checkout

**Customer Authentication & Access**
- FR23: Customer receives a magic link via email after booking a free session or purchasing a package
- FR24: Customer can access their host-scoped workspace via magic link (no password, no account)
- FR25: Magic links are scoped to a specific customer-host relationship
- FR26: Customer can request a new magic link via email

**Customer Workspace**
- FR27: Customer can view their credit balance with a specific host
- FR28: Customer can view available time slots and book a session (spending one credit)
- FR29: Customer can view their upcoming booked sessions
- FR30: Customer can reschedule a booked session to a different available slot (24h+ before original)
- FR31: Customer sees a clear message when attempting to reschedule within 24 hours
- FR32: Customer can purchase additional credits (re-buy packages) from their workspace

**Booking & Calendar Sync**
- FR33: System creates a Google Calendar event on the host's calendar when a session is booked, with the customer added as a guest (receives calendar invitation via email)
- FR34: System generates a Google Meet link for each booked session and includes it in the calendar event
- FR35: System removes/updates Google Calendar events when a session is rescheduled
- FR36: System prevents double-booking — if a slot is taken, subsequent attempts are rejected with a clear message
- FR37: Rescheduled sessions do not consume additional credits (credit moves with the booking)

**Host Dashboard**
- FR38: Host can view their upcoming schedule (booked sessions with client details)
- FR39: Host can view past sessions history
- FR40: Host can view a list of all customers with current credit balances
- FR41: Host can view session history for a specific customer
- FR42: Host can cancel a booked session (frees the slot, host manually decides on credit return)

**Email & Notifications**
- FR43: System sends booking confirmation email to customer (with Meet link and session details)
- FR44: System sends booking notification to host when a customer books
- FR45: System sends post-free-session email to customer with host's paid package offerings (upsell)
- FR46: System sends magic link email to customer after free session booking or package purchase
- FR47: System sends rescheduling confirmation email to customer and host

**Scope Amendment — Host Subscription (added by UX spec, confirmed in Architecture)**
- FR48: Host must provide payment card during onboarding to start a 20-day free trial
- FR49: Host is billed €14.99/month after trial ends
- FR50: System handles subscription webhooks (created, updated, deleted, payment failed)

### NonFunctional Requirements

**Performance**
- NFR1: Public pages achieve LCP under 2 seconds on mobile 4G
- NFR2: SPA views transition between screens in under 500ms after initial load
- NFR3: Booking slot availability loads within 1 second
- NFR4: Stripe Checkout redirect initiates within 1 second (Stripe processing time excluded)

**Security**
- NFR5: All traffic over HTTPS
- NFR6: Magic link tokens cryptographically random, time-limited, scoped to customer-host relationship
- NFR7: Host passwords hashed with bcrypt or equivalent
- NFR8: Stripe keys and Google OAuth credentials never exposed to client
- NFR9: API endpoints enforce authorization — hosts access only their data, customers only their workspace
- NFR10: No sensitive data in browser local storage

**GDPR & Privacy**
- NFR11: Customer consent collected before storing personal data
- NFR12: Customers can request deletion of personal data (right to erasure)
- NFR13: Privacy policy accessible from all public pages
- NFR14: Customer data scoped per host — no cross-host sharing without consent
- NFR15: Emails used only for transactional purposes — no marketing without consent

**Accessibility**
- NFR16: WCAG 2.1 AA for all pages (expanded from PRD's "public-facing" to entire app per UX spec)
- NFR17: All interactive elements keyboard-navigable
- NFR18: Color contrast minimum 4.5:1 for text
- NFR19: Form inputs with proper labels and error messages for screen readers

**Integration Reliability**
- NFR20: Google Calendar sync failures handled gracefully — error logged, status indicator shown, booking works using bookable hours alone
- NFR21: Stripe webhook failures retried — payment state eventually consistent
- NFR22: External service outages do not crash application — graceful degradation with clear messaging

**Scalability**
- NFR23: Database schema designed for multi-tenant growth (proper indexing, no single-tenant assumptions)
- NFR24: External integrations isolated behind service boundaries — swappable without core rewrites
- NFR25: No architectural decisions preventing horizontal scaling (no server-side session state, no local file storage)

**Infrastructure**
- NFR26: Staging environment mirrors production (separate database, Stripe test mode, separate OAuth credentials)
- NFR27: Production and staging deployed as managed services
- NFR28: Database backups handled by managed provider
- NFR29: Availability: best effort for MVP, architecture supports HA if needed later

### Additional Requirements

**From Architecture — Starter Template & Project Setup**
- Starter: `create-next-app` (plain) with TypeScript strict, Tailwind, ESLint, App Router, src-dir, Turbopack
- Post-init dependencies: shadcn/ui, @supabase/supabase-js, @supabase/ssr, Prisma, Stripe SDK, mailgun.js, googleapis
- Package manager: pnpm
- Deployment: Vercel with automatic CI/CD from GitHub
- Monitoring: Vercel Analytics + Sentry (free tier)

**From Architecture — Data & Auth**
- Database: PostgreSQL via Supabase with Prisma ORM
- Prisma schema with snake_case table mapping, UUID primary keys, camelCase fields
- RLS enabled on all tenant-scoped tables (hosts, packages, customers, bookings, sessions, credits, credit_transactions)
- Auth: Supabase Auth — Google OAuth for hosts, magic link OTP for customers
- Two-step Google OAuth: basic profile at sign-in, calendar scope requested separately during onboarding
- Route protection via Next.js middleware + server component layout checks
- Three route zones: public (no auth), host (Google OAuth), customer (magic link)

**From Architecture — API & Patterns**
- Server Actions for all user-facing mutations; Route Handlers for webhooks and OAuth callbacks only
- ActionResult<T> return type for all Server Actions (never throw)
- Zod validation at all API boundaries, schemas shared between client and server
- Services layer (src/services/) — only files that import Prisma client
- Money stored as integer cents (not floating point)
- Dates stored as UTC, formatted to host timezone at display layer only

**From Architecture — Integrations**
- Google Calendar: on-demand fetch with ~5 min TTL cache, graceful degradation
- Availability computation: bookable hours minus GCal busy times minus TimeTap bookings minus 24h window
- Stripe Connect Standard: OAuth onboarding, Checkout for purchases, webhooks for confirmation
- Stripe webhook signature verification required
- Mailgun: 7 transactional email templates (booking confirmation, booking notification, reschedule confirmation, magic link, upsell, purchase confirmation, cancellation)
- Supabase custom SMTP via Mailgun for auth emails

**From Architecture — Implementation Sequence**
- 1. Project init → 2. Supabase + Prisma schema → 3. Auth → 4. Host onboarding → 5. Public page + free booking → 6. Stripe Checkout + credits → 7. Customer workspace + booking → 8. Email system → 9. Host dashboard → 10. Upsell automation

**From UX — Design & Interaction**
- Mobile-first responsive, single breakpoint at 768px (mobile → desktop)
- System font stack, no custom web fonts
- 44px minimum touch targets, 8px minimum gap between adjacent targets
- Skeleton loading states (no full-page spinners); skip skeleton if load < 200ms
- One primary (gradient) CTA per screen; button text always action verbs
- Warm, blame-free error language throughout
- No calendar grid on mobile — vertical time slot list pattern (Doctolib-style)
- 14 custom components defined: Gradient Header, Session Card, Credit Balance Card, Time Slot Picker, Package Card (2 variants), Bottom Tab Bar, Sidebar Navigation, Onboarding Stepper, Client List Item, Activity Feed Item, Attention Alert, Slug Input, Weekly Hours Grid, Confirmation Screen
- Progressive disclosure for customers: anonymous → free booking → magic link → workspace
- Destructive actions require two-step confirmation with consequence description
- prefers-reduced-motion respected

**From UX — Scope Amendment (confirmed in Architecture)**
- Host subscription billing added to MVP (was excluded in PRD)
- 5-step onboarding (PRD had 4; UX added Step 5: free trial with card capture)
- 20-day free trial, €14.99/month after, card required to go live
- No skip option for trial step

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 1 | Host sign up with email and password |
| FR2 | Epic 1 | Host log in and log out |
| FR3 | Epic 2 | Connect Google Calendar via OAuth |
| FR4 | Epic 2 | Connect Stripe account via Stripe Connect Standard OAuth |
| FR5 | Epic 2 | Set up profile (name, description, slug) |
| FR6 | Epic 2 | Choose unique slug for public page |
| FR7 | Epic 2 | Define recurring bookable hours |
| FR8 | Epic 2 | Modify bookable hours |
| FR9 | Epic 3 | System reads Google Calendar busy time |
| FR10 | Epic 3 | System excludes Google Calendar busy slots |
| FR11 | Epic 3 | Available slots enforce 24h minimum booking window |
| FR12 | Epic 2 | Create packages (name, sessions, price) |
| FR13 | Epic 2 | Create free intro packages (€0, 1 session) |
| FR14 | Epic 2 | View all packages |
| FR15 | Epic 2 | Edit or deactivate packages |
| FR16 | Epic 6 | View customer's credit balance |
| FR17 | Epic 6 | Gift additional credits to customer |
| FR18 | Epic 6 | Refund/return credits to customer |
| FR19 | Epic 3 | Public profile page at timetap.it/{slug} |
| FR20 | Epic 3 | Available packages on public page |
| FR21 | Epic 3 | Book free intro from public page without auth |
| FR22 | Epic 4 | Purchase paid package via Stripe Checkout |
| FR23 | Epic 3 | Customer receives magic link after free session booking |
| FR24 | Epic 5 | Customer accesses host-scoped workspace via magic link |
| FR25 | Epic 3 | Magic links scoped to customer-host relationship |
| FR26 | Epic 5 | Customer can request new magic link |
| FR27 | Epic 5 | View credit balance with specific host |
| FR28 | Epic 5 | View available slots and book session (spend credit) |
| FR29 | Epic 5 | View upcoming booked sessions |
| FR30 | Epic 5 | Reschedule booked session (24h+ before original) |
| FR31 | Epic 5 | Clear message when rescheduling within 24 hours |
| FR32 | Epic 5 | Re-purchase packages from workspace |
| FR33 | Epic 3 | Google Calendar event on booking with customer as guest |
| FR34 | Epic 3 | Google Meet link generated for booked session |
| FR35 | Epic 5 | Google Calendar events updated on reschedule |
| FR36 | Epic 3 | Double-booking prevention with clear message |
| FR37 | Epic 5 | Rescheduled sessions don't consume additional credits |
| FR38 | Epic 6 | View upcoming schedule with client details |
| FR39 | Epic 6 | View past sessions history |
| FR40 | Epic 6 | View all customers with credit balances |
| FR41 | Epic 6 | View session history for specific customer |
| FR42 | Epic 6 | Cancel booked session (host decides on credit return) |
| FR43 | Epic 3 | Booking confirmation email to customer |
| FR44 | Epic 3 | Booking notification email to host |
| FR45 | Epic 4 | Post-free-session upsell email |
| FR46 | Epic 3 | Magic link email after free session booking or purchase |
| FR47 | Epic 5 | Rescheduling confirmation email to customer and host |
| FR48 | Epic 2 | Host provides payment card for 20-day free trial |
| FR49 | Epic 2 | Host billed €14.99/month after trial |
| FR50 | Epic 2 | System handles subscription webhooks |

## Epic List

### Epic 1: Project Foundation & Host Authentication
Hosts can sign in to TimeTap with Google and land on their dashboard. This epic establishes the complete project infrastructure — database schema, authentication, route protection, and application shell.
**FRs covered:** FR1, FR2

### Epic 2: Host Onboarding & Setup
Hosts complete the full 5-step onboarding and go live with their public link — profile with slug, Stripe Connect, Google Calendar, bookable hours, package creation, and free trial with card capture.
**FRs covered:** FR3, FR4, FR5, FR6, FR7, FR8, FR12, FR13, FR14, FR15, FR48, FR49, FR50

### Epic 3: Public Host Page & Free Session Booking
Visitors discover the host at timetap.it/{slug}, see packages, and book a free intro session. The availability engine computes open slots, bookings sync to Google Calendar with Meet links, and the customer receives a magic link via email.
**FRs covered:** FR9, FR10, FR11, FR19, FR20, FR21, FR23, FR25, FR33, FR34, FR36, FR43, FR44, FR46

### Epic 4: Package Purchase & Conversion Engine
Customers buy paid packages via Stripe Checkout, receive credits, and the automated post-free-session upsell email drives the free-to-paid conversion funnel.
**FRs covered:** FR22, FR45

### Epic 5: Customer Workspace & Session Management
Customers access their workspace via magic link, view credit balance, book paid sessions (spending credits), reschedule with 24h policy, and re-purchase packages — full self-service lifecycle.
**FRs covered:** FR24, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR35, FR37, FR47

### Epic 6: Host Dashboard & Client Management
Hosts view their schedule, manage client list, view session history, adjust credits (gift/refund), and cancel sessions — full operational control from the "between sessions" dashboard.
**FRs covered:** FR16, FR17, FR18, FR38, FR39, FR40, FR41, FR42

---

## Epic 1: Project Foundation & Host Authentication

Hosts can sign in to TimeTap with Google and land on their dashboard. This epic establishes the complete project infrastructure — database schema, authentication, route protection, and application shell.

### Story 1.1: Project Initialization & Database Foundation

As a developer,
I want a fully configured TimeTap project with database schema for host accounts,
So that feature development can begin on a solid, consistent foundation.

**Acceptance Criteria:**

**Given** no project exists
**When** the initialization is complete
**Then** a Next.js 16 project exists with TypeScript strict, Tailwind CSS, ESLint, App Router, src directory, and Turbopack
**And** shadcn/ui is initialized with TimeTap's 20-color palette mapped to CSS variables
**And** all dependencies are installed via pnpm (@supabase/supabase-js, @supabase/ssr, prisma, @prisma/client, stripe, @stripe/stripe-js, mailgun.js, googleapis)
**And** Prisma is configured with Supabase pooled connection string (DATABASE_URL) and direct connection string (DIRECT_URL)
**And** the Prisma schema contains a `Host` model mapped to `hosts` table with fields: id (UUID), email (unique), name, slug (unique, nullable), description (nullable), avatarUrl (nullable), timezone (nullable), googleRefreshToken (nullable), stripeAccountId (nullable), subscriptionId (nullable), subscriptionStatus (nullable), trialEndsAt (nullable), bookableHours (JSON, nullable), onboardingCompleted (boolean, default false), createdAt, updatedAt
**And** RLS is enabled on the hosts table with policy: hosts access own data (id = auth.uid())
**And** initial Prisma migration runs successfully against Supabase
**And** `.env.example` lists all required environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MAILGUN_API_KEY, MAILGUN_DOMAIN, NEXT_PUBLIC_APP_URL)
**And** project directory structure matches Architecture spec: app/(public), app/(host), app/(customer), app/api, app/auth, components/ui, components/shared, lib/supabase, lib/stripe, lib/google, lib/email, lib/validations, services, types, hooks
**And** ActionResult<T> type is defined in src/types/actions.ts
**And** utility functions (cn) are set up in src/lib/utils.ts

### Story 1.2: Host Google OAuth Sign-In & Sign-Out

As a host,
I want to sign in with my Google account and sign out when I'm done,
So that I can securely access my TimeTap dashboard without creating a separate password.

**Acceptance Criteria:**

**Given** an unauthenticated visitor on the login page (`/auth/login`)
**When** they click "Continue with Google"
**Then** they are redirected to Google OAuth consent screen requesting openid, email, and profile scopes
**And** on successful authentication, a Supabase session is created via cookies (@supabase/ssr)
**And** a host record is created in the database on first sign-in with name and email from Google profile
**And** returning hosts are matched to their existing host record (no duplicate creation)
**And** the host is redirected to `/dashboard` (or `/onboarding` if onboardingCompleted is false)

**Given** a Google OAuth callback with an error
**When** the auth callback handler processes the response
**Then** the host sees a warm error message: "Something went wrong with Google. Try again?" with a retry button
**And** no partial records are created in the database

**Given** an authenticated host on any dashboard page
**When** they click "Sign out"
**Then** the Supabase session is destroyed
**And** they are redirected to the login page
**And** accessing `/dashboard` after sign-out redirects to login

### Story 1.3: Route Protection & Dashboard Shell

As a host,
I want my dashboard protected from unauthorized access and to see a welcoming home screen after signing in,
So that my data is secure and I know where to start.

**Acceptance Criteria:**

**Given** an unauthenticated visitor accessing any `/dashboard/*` route
**When** the Next.js middleware intercepts the request
**Then** they are redirected to `/auth/login`

**Given** an unauthenticated visitor accessing a public route (`/`, `/{slug}`)
**When** the middleware intercepts the request
**Then** access is allowed without authentication

**Given** an unauthenticated visitor accessing `/workspace/*` routes
**When** the middleware intercepts the request
**Then** they are redirected to `/auth/magic-link`

**Given** an authenticated host visiting `/dashboard`
**When** the page loads on mobile (< 768px)
**Then** they see the gradient header component with greeting ("Good morning, {name}") and current date
**And** they see the bottom tab bar with 5 tabs: Home, Schedule, Clients, Packages, Settings
**And** the Home tab is active with `primary` color
**And** the main content area shows an empty state: "Waiting for your first booking. Share your link to get started."

**Given** an authenticated host visiting `/dashboard` on desktop (>= 768px)
**When** the page loads
**Then** they see the sidebar navigation (240px) with TimeTap logo, navigation items (Home, Schedule, Clients, Packages, Settings), and "Your link" card at the bottom showing `timetap.it/{slug}`
**And** the gradient header is not visible (desktop uses page header instead)
**And** the content area shows the same empty state

**Given** any dashboard page
**When** rendered
**Then** skeleton loading states are shown while data loads
**And** all interactive elements meet 44px minimum touch target
**And** WCAG 2.1 AA compliance: keyboard navigable, proper heading hierarchy, semantic HTML (nav, main, header elements)

---

## Epic 2: Host Onboarding & Setup

Hosts complete the full 5-step onboarding and go live with their public link — profile with slug, Stripe Connect, Google Calendar, bookable hours, package creation, and free trial with card capture.

### Story 2.1: Onboarding Flow & Profile Setup (Step 1/5)

As a host,
I want to set up my profile and choose my unique public URL during onboarding,
So that customers can find and recognize me on TimeTap.

**Acceptance Criteria:**

**Given** a newly signed-in host whose onboardingCompleted is false
**When** they are redirected to `/onboarding`
**Then** they see a 5-segment progress bar at the top (segment 1 active with gradient fill)
**And** "Step 1 of 5" label in caption text
**And** a centered form (max-width 480px) with fields: Name (pre-filled from Google), Description (textarea, 3 rows), and Slug input

**Given** the host is on the slug input field
**When** they type a slug value
**Then** the input shows "timetap.it/" as a non-editable prefix
**And** after 300ms debounce, the system checks slug availability
**And** if available: green checkmark with "Available!" below the input
**And** if taken: red indicator with "Taken — try {suggestion}?" with alternative suggestions
**And** slug is validated: lowercase, alphanumeric and hyphens only, 3-30 characters

**Given** the host completes all fields with a valid, available slug
**When** they click "Continue" (gradient primary button, full-width)
**Then** the profile is saved to the hosts table (name, description, slug updated)
**And** the stepper advances to step 2 with segment 1 showing completed (gradient fill)

**Given** validation fails (empty name, invalid slug)
**When** the host tries to continue
**Then** inline error messages appear below the relevant fields in `error` color
**And** errors clear as the host starts typing

**Given** an onboarded host navigates to `/dashboard/settings`
**When** the settings page loads
**Then** they see their current profile information (name, description, slug) in an editable form using the same components as onboarding step 1
**And** they can update name and description and save changes
**And** they can update their slug (same live validation: debounce, availability check, suggestions)
**And** a toast confirms: "Profile updated" on successful save
**And** integration status is visible: Google Calendar (connected/disconnected), Stripe (connected/disconnected)

### Story 2.2: Stripe Connect Integration (Step 2/5)

As a host,
I want to connect my Stripe account during onboarding,
So that I can receive payments from customers who buy my packages.

**Acceptance Criteria:**

**Given** the host is on onboarding step 2
**When** the page loads
**Then** they see "Connect your Stripe account to receive payments" with a clear explanation of why
**And** a single "Connect Stripe" button (gradient primary)
**And** the progress bar shows step 2 active

**Given** the host clicks "Connect Stripe"
**When** the Stripe Connect Standard OAuth flow initiates
**Then** they are redirected to Stripe's OAuth page
**And** on successful connection, they return to `/api/auth/callback/stripe`
**And** the host's `stripeAccountId` is saved to their record
**And** the onboarding advances to step 3

**Given** the Stripe OAuth flow fails or the host cancels
**When** they return to the onboarding page
**Then** they see a warm message: "Stripe connection didn't go through. Let's try again." with a retry button
**And** no dead end — the host can always retry

### Story 2.3: Google Calendar Connection & Bookable Hours (Step 3/5)

As a host,
I want to connect my Google Calendar and set my bookable hours,
So that TimeTap knows when I'm available and can avoid scheduling conflicts.

**Acceptance Criteria:**

**Given** the host is on onboarding step 3
**When** the page loads
**Then** they see a "Connect Google Calendar" section explaining the benefit: "We'll check your calendar to avoid double bookings"
**And** a "Connect Calendar" button that triggers Google OAuth with calendar scopes (calendar.events, calendar.readonly)

**Given** the host grants calendar permissions
**When** the OAuth callback completes
**Then** the Google refresh token is stored securely in the host's `googleRefreshToken` field
**And** a success confirmation appears: "Calendar connected!"
**And** the bookable hours section becomes visible below

**Given** the bookable hours section is visible
**When** the host interacts with the weekly hours grid
**Then** they see a 7-column (Mon–Sun) grid with 1-hour time blocks from 8am to 8pm
**And** Mon–Fri 9:00–17:00 is pre-selected as default
**And** tapping a block toggles it between available (primary-light background, primary border) and unavailable (surface background, divider border)
**And** the grid is keyboard navigable (arrow keys move, Space/Enter toggles)

**Given** the host has set their hours and clicks "Continue"
**When** the save action runs
**Then** the bookable hours are saved as JSON to the host's `bookableHours` field
**And** the stepper advances to step 4

**Given** an onboarded host navigates to `/dashboard/settings`
**When** the settings page loads
**Then** they see their current bookable hours displayed in the same weekly hours grid component as onboarding step 3
**And** they can toggle time blocks to modify their availability at any time (FR8)
**And** clicking "Save hours" updates the bookableHours JSON field
**And** a toast confirms: "Hours updated"
**And** changes take effect immediately for future availability computations

### Story 2.4: Package Creation & Management (Step 4/5)

As a host,
I want to create my first package during onboarding and manage packages afterward,
So that customers have something to book and buy on my public page.

**Acceptance Criteria:**

**Given** the host is on onboarding step 4
**When** the page loads
**Then** they see a "Create your first package" heading
**And** a one-tap "Free Intro Call" button that pre-fills: name = "Free Intro Call", sessions = 1, price = €0
**And** an option to "Create a paid package" with fields: name, number of sessions, price (€ prefix, numeric input)

**Given** the host taps "Free Intro Call" quick-create
**When** the action completes
**Then** a package is created in a `packages` table with: id (UUID), hostId, name ("Free Intro Call"), sessionCount (1), priceInCents (0), isFreeIntro (true), isActive (true), createdAt, updatedAt
**And** the package appears in a list below the form
**And** the host can optionally create additional packages

**Given** the host creates a paid package with name, sessions, and price
**When** they submit the form
**Then** the package is saved with priceInCents as integer cents (e.g., €800 → 80000)
**And** Zod validation ensures: name is 1-100 characters, sessions is 1-100, price is >= 0
**And** the package appears in the list

**Given** the host has created at least one package and clicks "Continue"
**When** the save action runs
**Then** the stepper advances to step 5

**Given** an authenticated host visits `/dashboard/packages` after onboarding
**When** the page loads
**Then** they see all their packages as host-facing package cards with: name, session count, price, status badge (Active/Inactive)
**And** they can tap "+ New" to create additional packages
**And** they can tap a package to edit its name, sessions, price, or deactivate it
**And** deactivating a package sets isActive to false (existing credits unaffected)

### Story 2.5: Free Trial Activation & Onboarding Completion (Step 5/5)

As a host,
I want to start my free trial and go live,
So that my public page is active and I can start receiving bookings.

**Acceptance Criteria:**

**Given** the host is on onboarding step 5
**When** the page loads
**Then** they see "Start your free trial" heading
**And** subtext: "Try TimeTap free for 20 days. No charge until your trial ends."
**And** price clearly shown: "€14.99/month after trial"
**And** Stripe Elements card input (card number, expiry, CVC) with Stripe branding visible
**And** gradient CTA button: "Start free trial"
**And** below CTA: "Cancel anytime. You won't be charged until {concrete date 20 days from now}."
**And** no skip option — card is required to go live

**Given** the host enters valid card details and clicks "Start free trial"
**When** the subscription is created via Stripe
**Then** a Stripe subscription is created with a 20-day trial period on the host's connected customer account
**And** the host's record is updated: subscriptionId, subscriptionStatus = "trialing", trialEndsAt = 20 days from now
**And** the host sees the "You're live!" confirmation screen

**Given** the card is declined
**When** Stripe returns an error
**Then** the host sees: "Card didn't go through. Try a different card?" with warm, no-blame tone
**And** they can re-enter card details and try again

**Given** the "You're live!" confirmation screen is shown
**When** the host views it
**Then** they see a success icon with "You're live!" heading
**And** their public link prominently displayed: `timetap.it/{slug}`
**And** a "Copy link" button and share options
**And** clear next action: "Share this link with your clients or add it to your Instagram bio"
**And** the host's onboardingCompleted is set to true
**And** clicking the CTA takes them to their dashboard

**Given** Stripe subscription webhooks arrive (customer.subscription.created, updated, deleted, invoice.payment_failed)
**When** the webhook handler at `/api/webhooks/stripe` processes them
**Then** the webhook signature is verified using STRIPE_WEBHOOK_SECRET
**And** the host's subscriptionStatus is updated accordingly (trialing, active, past_due, canceled)
**And** webhook processing is idempotent (reprocessing the same event has no side effects)

---

## Epic 3: Public Host Page & Free Session Booking

Visitors discover the host at timetap.it/{slug}, see packages, and book a free intro session. The availability engine computes open slots, bookings sync to Google Calendar with Meet links, and the customer receives a magic link via email.

### Story 3.1: Public Host Page

As a visitor,
I want to view a host's public profile and available packages,
So that I can learn about the host and decide to book or buy.

**Acceptance Criteria:**

**Given** a visitor navigates to `timetap.it/{slug}` where the slug belongs to an active host
**When** the page loads
**Then** the page is server-side rendered (SSR) for SEO and LLM discoverability
**And** they see a gradient hero section with the host's avatar, name, and description
**And** below the hero: the free intro package (if exists) with "Start here" label and "Book free session" button (gradient primary CTA)
**And** paid packages listed below with: name, session count, price, per-session price breakdown (caption), and "Buy package" button (secondary)
**And** the page is centered column, max-width 640px on both mobile and desktop
**And** an "Already a client? Access your workspace" text link is visible but secondary
**And** "Powered by TimeTap" in the footer
**And** privacy policy link accessible from the page (NFR13)
**And** the page achieves LCP under 2 seconds on mobile 4G (NFR1)

**Given** a visitor navigates to a slug that doesn't exist
**When** the page loads
**Then** they see a 404 page with warm messaging

**Given** a visitor navigates to a slug for a host with no active packages
**When** the page loads
**Then** they see the host profile but a message: "No packages available yet"

### Story 3.2: Availability Engine

As a system component,
I want to compute available booking slots accurately,
So that customers only see times when the host is genuinely free.

**Acceptance Criteria:**

**Given** a request for available slots for a specific host and date range
**When** the availability service computes slots
**Then** it starts with the host's bookable hours template for each requested day
**And** subtracts Google Calendar busy times (fetched from Google Calendar API)
**And** subtracts existing TimeTap confirmed bookings for the host
**And** subtracts any slots within the 24-hour minimum booking window from now
**And** returns a list of available time slots in the host's timezone
**And** slots start from tomorrow (never today)

**Given** Google Calendar data is requested
**When** the API call is made
**Then** the response is cached with approximately 5-minute TTL
**And** cache is invalidated when a booking or reschedule writes to Google Calendar
**And** the fetch uses the host's stored Google refresh token

**Given** the Google Calendar API is unavailable or returns an error
**When** the availability service runs
**Then** it gracefully degrades: computes availability from bookable hours minus TimeTap bookings only (NFR20)
**And** a warning is logged server-side
**And** availability still loads within 1 second (NFR3)

**Given** a day has no available slots
**When** the slot list is displayed
**Then** that day shows no slots (day pill is still visible but slot area shows "No available times on this day. Try another day." in text-muted)

### Story 3.3: Free Session Booking Flow

As a visitor,
I want to book a free intro session with a host without creating an account,
So that I can try the host's services with zero friction.

**Acceptance Criteria:**

**Given** a visitor clicks "Book free session" on the public host page
**When** the booking flow loads
**Then** they see the time slot picker: horizontal scrollable day pills (starting from tomorrow, format: "Thu 13") and vertical slot list for the selected day
**And** the first day pill with available slots is auto-selected
**And** each slot is a full-width button with centered time text (format: "10:00")
**And** minimum 44px touch targets with 14px vertical gap between slots

**Given** the visitor selects a time slot
**When** they tap a slot
**Then** the slot shows selected state: primary-light background, primary border (2px), checkmark
**And** a sticky confirm bar appears at the bottom with the selected context: "Confirm booking — Thu Feb 13, 11:00"
**And** below the confirm bar: an email input field (only required field)

**Given** the visitor enters their email and taps "Confirm booking"
**When** the booking action executes
**Then** the system uses optimistic locking within a database transaction to check the slot is still available
**And** if available: a `customers` table record is created (id UUID, email, name nullable, hostId, createdAt, updatedAt) if not already existing for this host-email pair
**And** a `bookings` table record is created (id UUID, hostId, customerId, packageId, startTime as UTC timestamptz, endTime, status = "confirmed", googleEventId nullable, meetLink nullable, createdAt, updatedAt)
**And** the visitor sees the confirmation screen: success icon, "Session booked!" heading, date/time/Meet link details, "We sent a confirmation to your email"

**Given** the slot was just taken by another visitor
**When** the booking transaction detects a conflict
**Then** the visitor sees a warm message: "That slot was just booked by someone else — here are other times that work."
**And** they are returned to the slot picker with refreshed availability

**Given** the email input is invalid
**When** the visitor tries to confirm
**Then** an inline error appears below the email field

### Story 3.4: Google Calendar Sync & Meet Link Generation

As a host,
I want booked sessions to appear on my Google Calendar with a Meet link,
So that my schedule stays in sync and sessions have a video call link automatically.

**Acceptance Criteria:**

**Given** a session is successfully booked (free intro or any booking)
**When** the booking is confirmed
**Then** the system creates a Google Calendar event on the host's calendar using the host's stored refresh token
**And** the event includes: title ("[TimeTap] Session with {customer_email}"), start time, end time (1 hour default), description with session details
**And** the customer's email is added as a guest (they receive a Google Calendar invitation via email)
**And** a Google Meet link is auto-generated and attached to the calendar event
**And** the booking record is updated with googleEventId and meetLink

**Given** the Google Calendar API call fails
**When** the event creation is attempted
**Then** the booking is still confirmed (calendar sync is not blocking)
**And** the error is logged server-side
**And** the meetLink field remains null on the booking (confirmation email notes "Meet link will be sent separately" or similar graceful handling)

### Story 3.5: Booking Emails & Magic Link

As a customer,
I want to receive a booking confirmation and a magic link to my workspace,
So that I have session details and can manage my bookings in the future.

**Acceptance Criteria:**

**Given** a free session is booked
**When** the booking is confirmed
**Then** the system sends a booking confirmation email to the customer via Mailgun containing: host name, session date/time (formatted in host's timezone), Google Meet link (if available), and a magic link to the customer workspace
**And** the system sends a booking notification email to the host containing: customer email, session date/time, link to their dashboard

**Given** the Mailgun email client is used
**When** any email is sent
**Then** it uses the configured MAILGUN_API_KEY and MAILGUN_DOMAIN
**And** the sender address is `noreply@timetap.it` (or configured domain)
**And** emails are transactional only — no marketing content (NFR15)

**Given** a customer needs a magic link
**When** the system generates one
**Then** it uses Supabase Auth `signInWithOtp({ email })` to create a magic link
**And** the magic link is scoped to the customer-host relationship at the application layer
**And** the magic link is cryptographically random and time-limited (handled by Supabase Auth) (NFR6)
**And** a new magic link invalidates any previous ones for security

**Given** the customer clicks the magic link in their email
**When** the auth callback processes it
**Then** a Supabase session is created for the customer
**And** they are redirected to `/workspace/{host-slug}`

---

## Epic 4: Package Purchase & Conversion Engine

Customers buy paid packages via Stripe Checkout, receive credits, and the automated post-free-session upsell email drives the free-to-paid conversion funnel.

### Story 4.1: Paid Package Purchase via Stripe Checkout

As a customer,
I want to purchase a paid package using Stripe Checkout,
So that I receive credits to book sessions with my host.

**Acceptance Criteria:**

**Given** a visitor clicks "Buy package" on the public host page for a paid package
**When** the purchase action executes
**Then** a Stripe Checkout session is created using the host's connected Stripe account (Stripe Connect)
**And** the checkout session includes: package name, price, host's Stripe account as the destination
**And** the visitor is redirected to Stripe's hosted Checkout page
**And** Stripe Checkout redirect initiates within 1 second (NFR4)

**Given** the Stripe Checkout payment succeeds
**When** the `checkout.session.completed` webhook fires
**Then** the webhook handler at `/api/webhooks/stripe` verifies the Stripe signature
**And** a customer record is created (if not already existing for this host-email pair)
**And** a `credits` table record is created or updated: id (UUID), customerId, hostId, balance (integer = package sessionCount), createdAt, updatedAt
**And** a `credit_transactions` table record is created: id (UUID), creditId, type = "purchase", amount (positive, = sessionCount), packageId, stripeSessionId, createdAt
**And** a purchase confirmation email is sent to the customer via Mailgun
**And** a magic link email is sent to the customer with link to `/workspace/{host-slug}`
**And** a notification email is sent to the host about the new purchase

**Given** the Stripe Checkout payment fails or the customer cancels
**When** the customer returns to the cancel URL
**Then** they see the host's public page with no error — they can try again

**Given** the webhook is received multiple times (retry)
**When** the handler processes it
**Then** processing is idempotent — duplicate credits are not assigned

### Story 4.2: Automated Post-Free-Session Upsell Email

As a host,
I want an automated email sent to customers after their free intro session presenting my paid packages,
So that free sessions convert to paying customers without me doing anything.

**Acceptance Criteria:**

**Given** a free intro session has been completed (session time has passed)
**When** the upsell trigger fires (approximately 1 hour after the scheduled session end time)
**Then** the system sends an upsell email to the customer via Mailgun
**And** the email is framed as relationship-continuation: "Ready to continue with {host_name}?" — not a sales push
**And** the email lists the host's active paid packages with names, session counts, prices, and a direct link to purchase (Stripe Checkout)
**And** the email tone matches UX principles: warm, no pressure, natural next step

**Given** the automated trigger mechanism
**When** implemented
**Then** it uses Vercel Cron (`/api/cron/upsell`) or an event-based approach to find completed free sessions that haven't had an upsell email sent
**And** each free session booking is marked as "upsell_sent" after the email is dispatched to prevent duplicates
**And** only free sessions (isFreeIntro packages) trigger the upsell

**Given** the customer has already purchased a package before the upsell fires
**When** the cron checks for upsell eligibility
**Then** the upsell email is not sent (customer already converted)

---

## Epic 5: Customer Workspace & Session Management

Customers access their workspace via magic link, view credit balance, book paid sessions (spending credits), reschedule with 24h policy, and re-purchase packages — full self-service lifecycle.

### Story 5.1: Customer Workspace & Magic Link Access

As a customer,
I want to access my personal workspace via magic link and see my credits and sessions,
So that I can manage my relationship with my host in one place.

**Acceptance Criteria:**

**Given** a customer clicks a valid magic link
**When** the auth callback authenticates them
**Then** they are redirected to `/workspace/{host-slug}`
**And** a Supabase session is created scoped to the customer

**Given** a customer clicks an expired or invalid magic link
**When** the auth callback fails
**Then** they see: "This link has expired" with a clear prompt to request a new one
**And** an email input field to request a fresh magic link

**Given** an authenticated customer on `/workspace/{host-slug}`
**When** the workspace loads
**Then** they see a minimal header with the host's avatar and name (host context)
**And** the credit balance card: gradient background, large credit number (48px), "sessions available" subtext
**And** a "Book a session" gradient primary CTA button
**And** a list of upcoming booked sessions with date, time, and "Reschedule" link on each
**And** past sessions as a simple list below
**And** the layout is single column on mobile, centered column (max-width 640px) on desktop
**And** no tab bar, no sidebar — minimal chrome

**Given** a customer has zero credits
**When** the workspace loads
**Then** the credit balance card shows: bg-subtle background, muted number "0", "No credits — buy a package to book sessions"
**And** a "View packages" CTA replaces "Book a session"

**Given** a customer visits the host's public page and clicks "Already a client? Access your workspace"
**When** they enter their email
**Then** if the email matches an existing customer for this host: a new magic link is sent, and they see "Check your email — we sent you a new link"
**And** if the email is not found: "We couldn't find an account with that email for this coach. Double-check or book a new session."
**And** a new magic link invalidates previous ones

### Story 5.2: Customer Session Booking (Credit-Based)

As a customer,
I want to book a session using one of my credits,
So that I can schedule my next appointment with my host.

**Acceptance Criteria:**

**Given** a customer with credits > 0 clicks "Book a session" in their workspace
**When** the slot picker loads
**Then** they see the same time slot picker as the free booking flow: day pills (tomorrow onward) + vertical slot list
**And** the availability engine computes slots using the same logic as Epic 3 (bookable hours - GCal - bookings - 24h)

**Given** the customer selects a slot and taps "Confirm booking"
**When** the booking action executes within a database transaction
**Then** the system checks the slot is still available (optimistic locking)
**And** 1 credit is deducted from the customer's credit balance
**And** a credit_transaction record is created: type = "booking", amount = -1, bookingId
**And** a booking record is created with status = "confirmed"
**And** a Google Calendar event is created with Meet link (same as Story 3.4)
**And** the customer sees a confirmation screen: "Session booked!" with date, time, Meet link, and "1 credit used — {remaining} remaining"
**And** booking confirmation email sent to customer and notification to host

**Given** the customer has 0 credits and tries to book
**When** they access the booking flow
**Then** they see "No credits available" and are directed to purchase a package

**Given** a slot conflict during booking
**When** another customer books the same slot first
**Then** the customer sees: "That slot was just booked by someone else — here are other times that work."

### Story 5.3: Session Rescheduling

As a customer,
I want to reschedule a booked session to a different time,
So that I can adjust my schedule without losing a credit.

**Acceptance Criteria:**

**Given** a customer views an upcoming session that is more than 24 hours away
**When** they tap "Reschedule" on the session
**Then** they see the time slot picker with available slots (same availability engine)
**And** the current booking's slot is excluded from availability (it will be freed)

**Given** the customer selects a new slot and confirms the reschedule
**When** the reschedule action executes
**Then** the original booking's startTime and endTime are updated to the new slot
**And** no additional credit is consumed — the credit moves with the booking (FR37)
**And** the Google Calendar event is updated (old time removed, new time set) via Google Calendar API (FR35)
**And** a reschedule confirmation email is sent to both customer and host (FR47)
**And** the customer sees: "Session rescheduled!" confirmation with new date, time, and Meet link
**And** the freed original slot becomes immediately available for other customers

**Given** a customer tries to reschedule a session within 24 hours of the session time
**When** they tap "Reschedule"
**Then** they see a warm message: "Rescheduling available up to 24 hours before your session. Contact your coach for last-minute changes." (FR31)
**And** no reschedule action is available

### Story 5.4: Package Re-Purchase from Workspace

As a customer,
I want to buy more credits directly from my workspace when I'm running low,
So that I can continue booking sessions without asking my host.

**Acceptance Criteria:**

**Given** a customer has 2 or fewer credits
**When** their workspace loads
**Then** a soft prompt appears: "Need more sessions?" with a "View packages" link
**And** the prompt is visible but not aggressive — it doesn't override primary content

**Given** a customer taps "View packages" (or navigates to packages from workspace)
**When** the packages page loads at `/workspace/{host-slug}/packages`
**Then** they see the host's active paid packages as public-facing package cards
**And** each package has a "Buy package" button that initiates Stripe Checkout (same flow as Story 4.1)

**Given** the Stripe Checkout completes successfully
**When** the webhook processes the purchase
**Then** credits are added to the customer's existing balance (not replaced)
**And** a credit_transaction record is created: type = "purchase", amount = +sessionCount
**And** purchase confirmation and magic link emails are sent
**And** the customer returns to their workspace with updated balance

---

## Epic 6: Host Dashboard & Client Management

Hosts view their schedule, manage client list, view session history, adjust credits (gift/refund), and cancel sessions — full operational control from the "between sessions" dashboard.

### Story 6.1: Host Schedule View

As a host,
I want to view my upcoming and past sessions at a glance,
So that I can stay on top of my schedule between sessions.

**Acceptance Criteria:**

**Given** an authenticated host visits their dashboard home
**When** the page loads
**Then** the gradient header (mobile) shows stats: sessions today count, active clients count, new bookings count
**And** below the header: today's sessions as session cards with: left color border (primary for paid, cyan for free intro), client name, package name, time, proximity label ("in 25 min" in primary color)
**And** an activity feed section showing recent events: new purchases (success dot), bookings (primary dot), reschedules (muted dot) with description and timestamp
**And** a "needs attention" section showing low-credit clients (≤ 2 credits) as attention alerts with warning left border and "Low" badge

**Given** the host navigates to the Schedule tab
**When** the page loads
**Then** they see a day picker (horizontal, in the gradient header on mobile) defaulting to today
**And** a vertical timeline below showing sessions for the selected day as compact session cards
**And** tapping a different day updates the timeline
**And** past sessions are shown with muted styling (text-muted colors, no border accent)

**Given** the host taps a session card
**When** the session detail opens (sheet on mobile, inline on desktop)
**Then** they see: client name, email, package name, session time, Meet link, and the client's current credit balance

**Given** the host has no sessions for a day
**When** that day is selected
**Then** they see: "No sessions today. Enjoy your free time."

### Story 6.2: Client List & Detail View

As a host,
I want to view all my clients and their details,
So that I can understand where each client relationship stands.

**Acceptance Criteria:**

**Given** the host navigates to the Clients tab
**When** the page loads
**Then** they see a list of all customers associated with this host as client list items
**And** each item shows: avatar (40px, gradient background with initials), client name, package name, credit badge (right side), next session date (caption)
**And** clients with ≤ 2 credits show the credit badge in warning color
**And** clients with no upcoming session show "No session" in text-muted
**And** the entire row is tappable

**Given** the host taps a client
**When** the client detail page loads at `/dashboard/clients/{customerId}`
**Then** they see the client's credit balance card (gradient, large number)
**And** a session history list: all past and upcoming sessions with dates, times, and status
**And** action buttons for credit management (covered in Story 6.3)

**Given** the host has no clients yet
**When** the Clients tab loads
**Then** they see: "No clients yet. Share your link to attract your first booking." with a "Copy link" button

### Story 6.3: Credit Management & Session Cancellation

As a host,
I want to gift credits, refund credits, and cancel sessions for my clients,
So that I can handle exceptions and maintain good client relationships.

**Acceptance Criteria:**

**Given** the host is on a client's detail page
**When** they tap "Gift credit"
**Then** a confirmation dialog appears: "Gift 1 credit to {client_name}?"
**And** buttons: "Cancel" (secondary, left) and "Gift credit" (primary, right)
**And** on confirmation: the client's credit balance is incremented by 1
**And** a credit_transaction record is created: type = "gift", amount = +1
**And** a toast confirms: "Credit gifted to {client_name}"

**Given** the host is on a client's detail page
**When** they tap "Return credit"
**Then** a confirmation dialog appears: "Return 1 credit to {client_name}?"
**And** on confirmation: the client's credit balance is incremented by 1
**And** a credit_transaction record is created: type = "refund", amount = +1
**And** a toast confirms: "Credit returned to {client_name}"

**Given** the host views an upcoming session (from schedule or client detail)
**When** they tap "Cancel session" (error-colored text link — destructive action)
**Then** a two-step confirmation dialog appears: "Cancel this session with {client_name} on {date}?"
**And** consequence description: "The slot will be freed on your calendar."
**And** a choice: "Return the credit to {client_name}?" with yes/no
**And** buttons: "Keep session" (secondary, visually stronger) and "Cancel session" (error-colored)

**Given** the host confirms session cancellation
**When** the action executes
**Then** the booking status is set to "cancelled"
**And** if "return credit" was selected: the client's credit balance is incremented by 1 with a credit_transaction (type = "refund")
**And** the Google Calendar event is deleted
**And** the freed slot becomes available for other customers
**And** a cancellation email is sent to both customer and host
**And** a toast confirms: "Session cancelled"
