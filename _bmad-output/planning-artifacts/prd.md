---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation-skipped', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
completedAt: '2026-02-11'
inputDocuments: ['context.txt']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  projectDocs: 0
  projectContext: 1
classification:
  projectType: 'Web App (responsive/mobile-first)'
  domain: 'General / Service Marketplace'
  complexity: 'low'
  projectContext: 'greenfield'
  domainName: 'timetap.it'
  integrations: ['Google Calendar', 'Stripe Connect Standard']
  auth:
    hosts: 'Standard auth (email/password) → web dashboard'
    customers: 'No account. Host public link at timetap.it/{host-slug}. Magic link scoped per host for credit/booking management.'
    future: 'Directory page to find hosts'
  monetization: 'Host subscription'
  design:
    style: 'Minimalist, mobile-first'
    primaryGradient: '#4facfe → #00f2fe'
    darkText: '#2d3748'
    accent: 'white'
    logoFiles: ['logo/timetap_full_logo.svg', 'logo/timetap_icon_only.svg']
---

# Product Requirements Document — TimeTap

**Author:** Luca
**Date:** 2026-02-11

## Executive Summary

**Product:** TimeTap — a credit-based booking system for service providers who sell session packages.

**Problem:** Service providers (life coaches, personal trainers, tutors, consultants) selling multi-session packages currently stitch together Stripe/PayPal + Calendly + spreadsheets. This causes friction, revenue leakage, and 3–5 hours/week of administrative overhead. Calendly has no concept of packages or credits.

**Solution:** TimeTap replaces this duct tape with a single integrated flow: hosts create packages, customers buy credits, and book sessions by spending credits. Think "Calendly but you pay with credits instead of booking for free."

**Key Differentiator:** End-to-end package lifecycle — from lead capture (free intro session) through automated upsell, credit purchase, session booking, and ongoing credit management — in one tool. The free session → upsell email → package purchase loop is a built-in conversion engine.

**Target Users:**
- **Hosts:** Service providers selling session-based packages (initially life coaches). Manage everything via web dashboard.
- **Customers:** People buying and consuming sessions. Access via magic link — no account, no password.

**Domain:** `timetap.it`
**Platform:** Mobile-first responsive web app (Next.js). Google Meet only for MVP (virtual sessions).
**Integrations:** Google Calendar (availability + booking sync), Stripe Connect Standard (host payments).
**Monetization:** Host subscription (TimeTap revenue). No transaction fees on package sales.

**Design:** Minimalist, clean. Color palette from logo — sky blue/cyan gradient (`#4facfe` → `#00f2fe`), dark slate text (`#2d3748`), white.

## Success Criteria

### User Success

**Host:**
- Onboarding (profile → Stripe → Google Cal → first package live) in under 10 minutes
- End-to-end package management from one place — create, share, track credits, view schedule
- Zero spreadsheets, zero link juggling

**Customer:**
- Buy credits → book first session in under 5 minutes (excluding Stripe processing time)
- Reschedule in under 1 minute
- Magic link access — no passwords, no accounts, no friction
- Re-purchase credits independently without host intervention

### Business Success

- **3-month target:** 10-20 active hosts (at least one customer with a completed booking)
- **Host retention:** 70%+ at 3 months
- **Growth:** 15-20% MoM with active acquisition
- **Key leading indicator:** Package purchase rate per host

### Technical Success

- Mobile-first responsive — fully functional on phone for both hosts and customers
- Sub-2s page loads on mobile
- Google Calendar sync reliable — no double bookings, no stale availability
- Stripe Connect payments land correctly every time
- Magic links secure and scoped per host-customer relationship

### Measurable Outcomes

| Metric | Target | Timeframe |
|---|---|---|
| Host onboarding time | < 10 minutes | MVP launch |
| Customer buy-to-book flow | < 5 minutes | MVP launch |
| Active hosts | 10-20 | 3 months post-launch |
| Host retention | > 70% | 3 months post-launch |
| MoM host growth | 15-20% | Ongoing |
| Package purchases per active host | > 1 customer buying | First 30 days per host |

## User Journeys

### Journey 1: Sofia the Life Coach — Onboarding & First Package (Host Happy Path)

Sofia is a life coach in Rome with ~12 active clients. She's tired of juggling Calendly + Stripe + spreadsheets every Sunday evening.

**Opening Scene:** Sofia signs up on `timetap.it`, picks her slug (`timetap.it/sofia-coaching`). She connects her Google Calendar and Stripe account — two OAuth flows, done in minutes. She sets bookable hours: Monday–Friday 9am–6pm, Saturday mornings.

**Rising Action:** She creates two packages: "Free Intro Call" (1 session, €0) and "Growth Path — 10 Sessions" (€800). She copies her public link and drops it in her Instagram bio. One link handles both the free intro and paid packages.

**Climax:** Next morning, a new lead has booked a free intro call through TimeTap. After the session, the lead receives an automated email presenting Sofia's paid packages. The lead buys "Growth Path" directly from the email. Credits appear. The client books their next session. Sofia did nothing.

**Resolution:** Two weeks in, Sofia hasn't opened her spreadsheet once. She checks TimeTap on her phone between sessions — 3 active clients with credits, schedule clean, Google Calendar in sync. Sunday evening reconciliation is over.

### Journey 2: The Customer — Free Session to Ongoing Booking (Customer Happy Path)

Marco clicks a life coach's link in her Instagram bio: `timetap.it/sofia-coaching`. He sees Sofia's profile, packages, and the free intro call option.

**Opening Scene:** Marco taps "Book Free Intro Call." Picks a slot (minimum 24h out), enters his email. Gets a confirmation email with Google Meet link. No account, no password, no app.

**Rising Action:** The call goes great. An hour later, Marco gets an email: "Ready to continue? Here are Sofia's packages." He taps "Growth Path — 10 Sessions, €800," completes payment through Stripe Checkout, and receives a magic link to his personal workspace with Sofia.

**Climax:** Marco opens his magic link. 10 credits available. Books his next session in two taps. Google Calendar event appears on both calendars with a Meet link.

**Resolution:** Over the next months, Marco books sessions, reschedules once (two taps, 24h+ before session), and when down to 1 credit, buys another package directly from his workspace. Sofia never sent a reminder or payment link.

### Journey 3: Sofia — Managing Ongoing Clients (Host Operations)

**Opening Scene:** Wednesday morning. Sofia has 8 active clients. She opens TimeTap on her phone between sessions.

**Rising Action:** Today's schedule — 4 sessions, all with Meet links. She notices Anna has 1 credit left after 9 completed sessions. A new client booked a free intro for tomorrow.

**Climax:** A client asks to cancel due to illness. Sofia gifts a credit back. The slot opens on Google Calendar automatically. She blocks next Friday — just blocks it in Google Calendar, TimeTap removes availability.

**Resolution:** End of month, Sofia checks her client list — credit balances, session history, who's active, who's running low. No spreadsheet. She knows where every client stands.

### Journey 4: The Customer — Rescheduling & Edge Cases (Customer Edge Case)

**Opening Scene:** Lucia has 6 credits. Booked Thursday at 2pm but has a conflict.

**Rising Action:** Opens magic link on phone. Taps "Reschedule," picks Friday at 10am. Confirmed. Credit moved, not consumed.

**Edge case:** Lucia tries to reschedule within 24 hours. Clear message: "Rescheduling available up to 24 hours before your session. Contact your coach for last-minute changes."

**Resolution:** Rescheduling took 30 seconds. The freed slot is immediately available for other clients.

### Journey Requirements Summary

| Capability Area | Revealed By |
|---|---|
| Host onboarding (OAuth, profile, slug) | J1 |
| Package creation & management (including free) | J1, J3 |
| Public host page | J1, J2 |
| Bookable hours configuration | J1 |
| Free session → automated upsell email | J1, J2 |
| Stripe Checkout & Connect | J1, J2 |
| Magic link auth for customers | J2, J4 |
| Customer workspace (balance, book, reschedule, re-buy) | J2, J4 |
| Google Calendar two-way sync | J1, J2, J3 |
| Google Meet link generation | J1, J2 |
| Mobile schedule & client dashboard (host) | J3 |
| Credit management (view, gift, refund) | J3 |
| Client history & activity overview | J3 |
| Reschedule flow with 24h policy | J4 |
| 24h minimum booking window | J2 |

## Web App Technical Requirements

### Rendering Strategy

- SSR/SSG for public pages: landing pages, host profiles (`timetap.it/{slug}`) — optimized for search engines and LLM discoverability
- CSR (SPA) for authenticated views: host dashboard, customer workspace — optimized for speed and interactivity
- Next.js App Router (server components + client components in one codebase)

### Browser Support

- Modern browsers only: Chrome, Safari, Firefox, Edge (latest 2 versions)
- Primary targets: Mobile Safari (iOS), Mobile Chrome (Android)

### SEO & LLM Discoverability

- **Target audience for SEO: hosts (service providers), not their customers**
- Landing pages optimized for LLM recommendation engines (ChatGPT, Perplexity) — clear problem-solution framing, structured data, explicit value propositions
- Host public profiles SSR-rendered and indexable
- Customer workspaces and host dashboards: no-index

### Conflict Resolution

- No real-time/websocket features for MVP
- Server-side optimistic locking on slot booking — second attempt gets "slot just taken" message
- Data freshness: reload-on-navigate sufficient

### Implementation Considerations

- API routes co-located in Next.js app for MVP simplicity
- Google Calendar API and Stripe Connect SDK integrated server-side
- Magic link tokens generated and validated server-side
- Email sending for magic links, booking confirmations, upsell emails

## Product Scope

### MVP (Phase 1)

**Host:**
- Sign up / login (email + password)
- Connect Stripe account (Stripe Connect Standard)
- Connect Google Calendar
- Set bookable hours (recurring availability template)
- Create packages (name, sessions, price — including free intro at €0)
- Share public link (`timetap.it/{slug}`)
- View upcoming schedule and past sessions
- Manage customer credits (view, refund, gift)
- View customer history

**Customer:**
- Browse host's public page and packages
- Book free intro session (no auth required)
- Purchase paid package (Stripe Checkout)
- Receive magic link via email
- View credit balance, book sessions, reschedule (24h policy)
- Re-purchase credits from workspace

**Platform:**
- Google Calendar two-way sync (read availability, write bookings)
- Stripe Connect Standard (host payouts)
- Magic link auth for customers
- Google Meet link generation for virtual sessions
- Post-free-session upsell email (packages only, no feedback)
- Booking/rescheduling confirmation emails
- 24h minimum for booking and rescheduling
- Server-side slot conflict handling

**Explicitly excluded from MVP:**
- Post-session feedback collection
- Physical location / in-person session support
- Host subscription billing (TimeTap monetization)
- Customer notifications / reminders beyond transactional emails
- Admin dashboard (DB management for now)
- Outlook calendar integration
- Analytics

### Phase 2 (Growth)

- Post-session feedback in emails
- Physical location support for in-person sessions
- Host subscription billing (TimeTap revenue)
- Customer notifications & session reminders
- Host analytics dashboard
- Customer directory page ("find your host")
- Configurable cancellation/rescheduling policies

### Phase 3 (Expansion)

- Outlook calendar integration
- Multi-host customer view
- Subscription/recurring packages
- CRM capabilities
- Public marketplace for discovering hosts
- API for host integrations

## Risk Mitigation

**Technical Risks:**
- Google Calendar sync reliability → thorough testing, clear error states, "last synced" indicator, graceful degradation
- Slot double-booking → server-side optimistic locking, clear "slot just taken" UX
- Three external integrations (GCal, Stripe, Meet) → hosted/managed solutions wherever possible, isolated integration code

**Market Risks:**
- Host adoption depends on link sharing → onboarding explicitly guides hosts to copy/share link
- Free session conversion rate unknown → track funnel metrics from day one
- Competing with "good enough" spreadsheets → emphasize time savings and professionalism

**Resource Risks:**
- Solo founder → ruthless scope discipline, hosted services over custom builds
- Integration edge cases → timebox each integration, launch with happy path, harden post-launch

## Functional Requirements

### Host Account & Onboarding

- **FR1:** Host can sign up with email and password
- **FR2:** Host can log in and log out
- **FR3:** Host can connect their Google Calendar via OAuth
- **FR4:** Host can connect their Stripe account via Stripe Connect Standard OAuth
- **FR5:** Host can set up their profile (name, description, slug for public URL)
- **FR6:** Host can choose a unique slug for their public page (`timetap.it/{slug}`)

### Availability Management

- **FR7:** Host can define recurring bookable hours (day-of-week + time ranges)
- **FR8:** Host can modify their bookable hours at any time
- **FR9:** System reads host's Google Calendar to detect blocked/busy time
- **FR10:** System excludes Google Calendar busy slots from available booking times
- **FR11:** Available slots enforce a 24-hour minimum booking window

### Package & Credit Management

- **FR12:** Host can create packages with a name, number of sessions, and price
- **FR13:** Host can create free intro packages (price = €0, sessions = 1)
- **FR14:** Host can view all their packages
- **FR15:** Host can edit or deactivate packages
- **FR16:** Host can view a customer's credit balance
- **FR17:** Host can gift additional credits to a customer
- **FR18:** Host can refund/return credits to a customer (credit adjustment, not monetary refund)

### Host Public Page

- **FR19:** Visitors can view a host's public profile page at `timetap.it/{slug}`
- **FR20:** Visitors can see the host's available packages on their public page
- **FR21:** Visitors can book a free intro session from the public page without authentication
- **FR22:** Visitors can purchase a paid package from the public page via Stripe Checkout

### Customer Authentication & Access

- **FR23:** Customer receives a magic link via email after booking a free session or purchasing a package
- **FR24:** Customer can access their host-scoped workspace via magic link (no password, no account)
- **FR25:** Magic links are scoped to a specific customer-host relationship
- **FR26:** Customer can request a new magic link via email

### Customer Workspace

- **FR27:** Customer can view their credit balance with a specific host
- **FR28:** Customer can view available time slots and book a session (spending one credit)
- **FR29:** Customer can view their upcoming booked sessions
- **FR30:** Customer can reschedule a booked session to a different available slot (24h+ before original)
- **FR31:** Customer sees a clear message when attempting to reschedule within 24 hours
- **FR32:** Customer can purchase additional credits (re-buy packages) from their workspace

### Booking & Calendar Sync

- **FR33:** System creates a Google Calendar event on the host's calendar when a session is booked, with the customer added as a guest (receives calendar invitation via email)
- **FR34:** System generates a Google Meet link for each booked session and includes it in the calendar event
- **FR35:** System removes/updates Google Calendar events when a session is rescheduled
- **FR36:** System prevents double-booking — if a slot is taken, subsequent attempts are rejected with a clear message
- **FR37:** Rescheduled sessions do not consume additional credits (credit moves with the booking)

### Host Dashboard

- **FR38:** Host can view their upcoming schedule (booked sessions with client details)
- **FR39:** Host can view past sessions history
- **FR40:** Host can view a list of all customers with current credit balances
- **FR41:** Host can view session history for a specific customer
- **FR42:** Host can cancel a booked session (frees the slot, host manually decides on credit return)

### Email & Notifications

- **FR43:** System sends booking confirmation email to customer (with Meet link and session details)
- **FR44:** System sends booking notification to host when a customer books
- **FR45:** System sends post-free-session email to customer with host's paid package offerings (upsell)
- **FR46:** System sends magic link email to customer after free session booking or package purchase
- **FR47:** System sends rescheduling confirmation email to customer and host

## Non-Functional Requirements

### Performance

- **NFR1:** Public pages achieve LCP under 2 seconds on mobile 4G
- **NFR2:** SPA views transition between screens in under 500ms after initial load
- **NFR3:** Booking slot availability loads within 1 second
- **NFR4:** Stripe Checkout redirect initiates within 1 second (Stripe processing time excluded)

### Security

- **NFR5:** All traffic over HTTPS
- **NFR6:** Magic link tokens cryptographically random, time-limited, scoped to customer-host relationship
- **NFR7:** Host passwords hashed with bcrypt or equivalent
- **NFR8:** Stripe keys and Google OAuth credentials never exposed to client
- **NFR9:** API endpoints enforce authorization — hosts access only their data, customers only their workspace
- **NFR10:** No sensitive data in browser local storage

### GDPR & Privacy

- **NFR11:** Customer consent collected before storing personal data
- **NFR12:** Customers can request deletion of personal data (right to erasure)
- **NFR13:** Privacy policy accessible from all public pages
- **NFR14:** Customer data scoped per host — no cross-host sharing without consent
- **NFR15:** Emails used only for transactional purposes — no marketing without consent

### Accessibility

- **NFR16:** WCAG 2.1 AA for public-facing pages (host profile, booking flow)
- **NFR17:** All interactive elements keyboard-navigable
- **NFR18:** Color contrast minimum 4.5:1 for text
- **NFR19:** Form inputs with proper labels and error messages for screen readers

### Integration Reliability

- **NFR20:** Google Calendar sync failures handled gracefully — error logged, status indicator shown, booking works using bookable hours alone
- **NFR21:** Stripe webhook failures retried — payment state eventually consistent
- **NFR22:** External service outages do not crash application — graceful degradation with clear messaging

### Scalability (Design Principles)

- **NFR23:** Database schema designed for multi-tenant growth (proper indexing, no single-tenant assumptions)
- **NFR24:** External integrations isolated behind service boundaries — swappable without core rewrites
- **NFR25:** No architectural decisions preventing horizontal scaling (no server-side session state, no local file storage)

### Infrastructure & Environments

- **NFR26:** Staging environment mirrors production (separate database, Stripe test mode, separate OAuth credentials)
- **NFR27:** Production and staging deployed as managed services
- **NFR28:** Database backups handled by managed provider
- **NFR29:** Availability: best effort for MVP, architecture supports HA if needed later
