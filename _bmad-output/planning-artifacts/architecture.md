---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-12'
inputDocuments:
  - prd.md
  - ux-design-specification.md
workflowType: 'architecture'
project_name: 'timetap'
user_name: 'Luca'
date: '2026-02-12'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

47 functional requirements across 9 capability areas:

| Category | FRs | Architectural Significance |
|---|---|---|
| Host Account & Onboarding | FR1-6 | Google OAuth integration, profile/slug management, unique constraint on slugs |
| Availability Management | FR7-11 | Google Calendar read integration, availability computation engine, 24h window logic |
| Package & Credit Management | FR12-18 | Core domain model — packages, credits, adjustments. Business-critical consistency. |
| Host Public Page | FR19-22 | SSR/SSG rendering, Stripe Checkout integration, unauthenticated booking flow |
| Customer Authentication | FR23-26 | Magic link generation, validation, host-scoped tokens, re-request flow |
| Customer Workspace | FR27-32 | SPA experience, credit balance display, slot selection, reschedule with 24h policy |
| Booking & Calendar Sync | FR33-37 | Google Calendar write + Meet link generation, optimistic locking, event lifecycle |
| Host Dashboard | FR38-42 | Read-heavy views, client/session history, credit adjustment actions |
| Email & Notifications | FR43-47 | 7 transactional email types, automated upsell trigger, magic link delivery |

**Non-Functional Requirements:**

29 NFRs driving architectural decisions:

| Category | NFRs | Key Constraints |
|---|---|---|
| Performance | NFR1-4 | LCP < 2s mobile 4G, SPA transitions < 500ms, slot availability < 1s |
| Security | NFR5-10 | HTTPS, cryptographic magic links, hashed passwords, server-side secrets, authorization enforcement |
| GDPR & Privacy | NFR11-15 | Consent collection, right to erasure, per-host data scoping, transactional email only |
| Accessibility | NFR16-19 | WCAG 2.1 AA, keyboard navigation, 4.5:1 contrast, screen reader support |
| Integration Reliability | NFR20-22 | Graceful degradation for GCal/Stripe failures, webhook retry, no crash on outage |
| Scalability | NFR23-25 | Multi-tenant schema, isolated integrations, no server-side session state |
| Infrastructure | NFR26-29 | Staging mirrors production, managed services, database backups |

**Scale & Complexity:**

- Primary domain: Full-stack web (Next.js App Router)
- Complexity level: Medium
- Estimated architectural components: ~8-10 (auth, availability engine, booking/credit logic, calendar sync, payment integration, email service, public page rendering, dashboard API, magic link system)

### Technical Constraints & Dependencies

- **Next.js App Router** — specified in PRD, confirmed in UX spec. Server components + client components in one codebase.
- **Google Calendar API** — OAuth for permissions, read for availability, write for bookings. Two-way sync is the most failure-prone integration.
- **Stripe Connect Standard** — OAuth onboarding, Stripe Checkout for payments, webhooks for payment confirmation. Stripe handles PCI compliance.
- **Google Meet** — Link generation tied to calendar event creation. Dependent on Google Calendar integration.
- **shadcn/ui + Radix UI + Tailwind CSS** — design system specified in UX spec. Components owned in codebase, not external dependency.
- **No real-time/websocket** — explicitly excluded for MVP. Reload-on-navigate for data freshness.
- **No native apps** — responsive web only. Mobile Safari and Mobile Chrome are primary targets.
- **Solo founder** — resource constraint favoring hosted/managed services, minimal custom infrastructure.

### Cross-Cutting Concerns Identified

- **Authentication & Authorization:** Two distinct auth systems (Google OAuth for hosts, magic links for customers) that must coexist. Route-level protection must distinguish host routes, customer routes, and public routes.
- **External Service Resilience:** Three integrations that can fail independently. Architecture must isolate failures — a Google Calendar outage shouldn't prevent viewing the dashboard, and a Stripe webhook delay shouldn't block booking confirmation.
- **Email Delivery:** 7+ transactional email types triggered by different events. Needs a unified email service with template management and reliable delivery.
- **Multi-Tenancy & Data Isolation:** Every customer record is scoped to a host. API authorization must enforce this at every endpoint. Schema design must prevent cross-host data leakage.
- **GDPR Compliance:** Affects data modeling (consent tracking, erasure capability), API design (scoped data access), and email handling (transactional only, no marketing without consent).
- **Calendar Sync Reliability:** The most architecturally significant concern — availability computation depends on fresh Google Calendar data, but the API can be slow or unavailable. Needs caching strategy and graceful degradation.

## Starter Template Evaluation

### Technical Preferences

| Category | Decision | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety across full stack, standard for Next.js 16 |
| Framework | Next.js 16 (App Router) | Specified in PRD, SSR/SSG + SPA in one codebase |
| Database | PostgreSQL via Supabase | Relational data model, RLS for multi-tenant isolation, managed service |
| ORM | Prisma | Automated migrations, type-safe queries, Prisma Studio for debugging, good Supabase integration |
| Auth | Supabase Auth | Native Google OAuth + magic links, no extra dependency, integrates with Supabase RLS |
| UI System | shadcn/ui + Radix UI + Tailwind CSS | Specified in UX spec, accessible primitives, full customization ownership |
| Deployment | Vercel | Native Next.js hosting, edge functions, preview deployments |
| Email | Mailgun | Transactional email delivery for 7+ email types |
| Package Manager | pnpm | Fast installs, strict dependency resolution, Vercel-compatible |

### Starter Options Considered

**Option A: Plain `create-next-app` (Recommended)**
Start with Next.js 16 defaults and add integrations incrementally. Full control over auth patterns, no template opinions to override. Best for TimeTap's specific dual-auth requirements.

**Option B: Vercel Supabase Next.js Template**
Pre-configured Supabase Auth with cookie handling and shadcn/ui. Rejected because the generic auth patterns would need significant rework for TimeTap's host-scoped magic link system.

### Selected Starter: `create-next-app` (plain)

**Rationale:** TimeTap's dual auth model (Google OAuth for hosts, host-scoped magic links for customers) and specific integration requirements (Google Calendar, Stripe Connect, Mailgun) are better served by building on a clean foundation than adapting a template's opinions.

**Initialization Command:**

```bash
pnpm create next-app@latest timetap --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias="@/*"
```

**Post-initialization setup (in order):**

```bash
# 1. shadcn/ui
pnpm dlx shadcn@latest init

# 2. Supabase client
pnpm add @supabase/supabase-js @supabase/ssr

# 3. Prisma ORM
pnpm add prisma @prisma/client
pnpm dlx prisma init

# 4. Stripe
pnpm add stripe @stripe/stripe-js

# 5. Mailgun
pnpm add mailgun.js

# 6. Google APIs
pnpm add googleapis
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
TypeScript strict mode, Next.js 16 with React Compiler enabled, Node.js 20.9+

**Styling Solution:**
Tailwind CSS v4 with PostCSS, shadcn/ui CSS variables for design tokens, component-level styling via Tailwind utility classes

**Build Tooling:**
Turbopack (dev), Webpack (production), automatic code splitting, server/client component bundling

**Code Organization:**
`src/` directory with App Router file conventions (`page.tsx`, `layout.tsx`, `route.ts`), `@/*` import alias for clean imports

**Development Experience:**
Turbopack hot reload, TypeScript type checking, ESLint with Next.js rules

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data validation: Zod + Prisma constraints
- Auth implementation: Supabase Auth (Google OAuth for hosts, magic link OTP for customers)
- Route protection: Next.js middleware + server component checks
- API pattern: Server Actions + Route Handlers for webhooks
- RLS: Enabled on all tenant-scoped tables

**Important Decisions (Shape Architecture):**
- Caching: On-demand Google Calendar fetch with short TTL cache
- Error handling: Structured returns from Server Actions, HTTP codes from Route Handlers
- State management: Server Components for reads, no global state library
- Form handling: React Hook Form + Zod
- Monitoring: Vercel Analytics + Sentry free tier

**Deferred Decisions (Post-MVP):**
- Background calendar sync (upgrade from on-demand if needed)
- Client-side caching library (TanStack Query if needed)
- Advanced logging/observability infrastructure
- Rate limiting (evaluate after launch based on traffic patterns)

### Data Architecture

**Database:** PostgreSQL via Supabase (decided in step 3)

**ORM:** Prisma with `@prisma/client` for type-safe queries, Prisma Migrate for schema migrations. Connection via Supabase's pooled connection string (`DATABASE_URL`) for application queries, direct connection (`DIRECT_URL`) for Prisma CLI/migrations.

**Data Validation:** Zod for runtime validation at API boundaries (Server Actions, Route Handlers). Zod schemas define the shape of all user input and webhook payloads. Prisma enforces database-level constraints (unique, not-null, foreign keys) as a second safety net. Zod schemas and Prisma types coexist — Zod validates input, Prisma types validate output.

**Caching Strategy:** On-demand Google Calendar fetch with ~5 minute TTL cache. Availability computation: (host bookable hours) minus (cached Google Calendar busy times) minus (booked TimeTap sessions) minus (24h minimum window). If Google Calendar API is unavailable, gracefully degrade to computing from bookable hours + TimeTap bookings only (per NFR20). Cache invalidated on booking/reschedule actions that write to Google Calendar.

**Row Level Security (RLS):** Enabled on all tenant-scoped tables. Host policies check `host_id = auth.uid()`. Customer policies scope data to the authenticated magic link session's host relationship. RLS acts as a database-level safety net — even application bugs cannot leak data across hosts.

### Authentication & Security

**Auth Provider:** Supabase Auth for both user types.

**Host Authentication:**
- Google OAuth via `signInWithOAuth({ provider: 'google' })`
- Two-step Google permissions: basic profile on sign-in, calendar scope during onboarding
- Session managed via Supabase cookies (`@supabase/ssr`)
- Host record created in `hosts` table on first sign-in

**Customer Authentication:**
- Magic link via `signInWithOtp({ email })`
- Supabase authenticates the email identity
- Application layer scopes the session to a specific host-customer relationship
- Magic link emails customized with host branding context
- New magic link invalidates previous ones

**Route Protection:**

| Zone | Routes | Protection Layer |
|---|---|---|
| Public | `/{slug}`, `/`, landing pages | No auth — SSR/SSG rendered |
| Host | `/dashboard/*` | Middleware redirects unauthenticated → login. Server components verify host role. |
| Customer | `/workspace/{host-slug}/*` | Middleware redirects unauthenticated → magic link request. Server components verify customer-host relationship. |
| API/Webhooks | `/api/webhooks/*` | Signature verification (Stripe webhook secret), no Supabase auth. |

**Security Patterns:**
- All secrets server-side only — no `NEXT_PUBLIC_` prefix for Stripe secret, Google OAuth secret, Mailgun API key
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only client-exposed env vars
- Stripe webhook signature verification on all `/api/webhooks/stripe` requests
- CSRF protection via Server Actions (built-in to Next.js)
- Magic link tokens: cryptographically random, time-limited (handled by Supabase Auth)

### API & Communication Patterns

**Server Actions** — All user-facing mutations:
- Booking a session, rescheduling, cancelling
- Creating/editing packages, adjusting credits
- Host profile updates, onboarding steps
- Customer re-purchase flow initiation

**Route Handlers** — External-facing endpoints only:
- `POST /api/webhooks/stripe` — Stripe payment/subscription webhooks
- `GET /api/auth/callback` — OAuth callback handler (Google, Stripe Connect)
- `GET /api/cron/upsell` — Automated upsell email trigger (if using Vercel Cron)

**Error Handling Standard:**

Server Actions return structured results — never throw:
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

Route Handlers return HTTP status codes + JSON:
```typescript
// 200: success, 400: validation error, 401: unauthorized,
// 404: not found, 409: conflict (slot taken), 500: internal error
```

Client-side error display:
- Toast for transactional confirmations and recoverable errors
- Inline messages for form validation
- Redirect for auth failures
- Warm, blame-free language per UX spec

### Frontend Architecture

**Rendering Strategy:**

| Page Type | Rendering | Reason |
|---|---|---|
| Landing pages | SSG | Static content, maximum performance |
| Host public page `/{slug}` | SSR | Dynamic content, SEO/LLM indexable |
| Host dashboard | Server Components + Client Components | Fresh data on navigate, interactive elements |
| Customer workspace | Server Components + Client Components | Fresh data on navigate, booking interactions |
| Onboarding flow | Client Components | Multi-step interactive form |

**State Management:** No global state library. Server Components fetch data directly. Client-side mutations use Server Actions with `useTransition` for pending states. `reload-on-navigate` provides data freshness (per PRD). If client-side caching becomes necessary, add TanStack Query later.

**Form Handling:** React Hook Form for form state + Zod for validation. Zod schemas shared between client-side validation and Server Action validation (single source of truth). shadcn/ui `<Form>` component wraps React Hook Form integration.

**Component Architecture:**
- Server Components by default — only add `"use client"` when interactivity is needed
- Shared UI components in `src/components/ui/` (shadcn/ui)
- Custom TimeTap components in `src/components/` (gradient header, session card, etc.)
- Feature-specific components co-located with routes in `src/app/`

### Infrastructure & Deployment

**Hosting:** Vercel — native Next.js support, edge functions, preview deployments, built-in analytics.

**CI/CD:**
- Vercel automatic deployments: preview on PR branches, production on `main`
- No CI pipeline for MVP — Vercel handles builds and deploys
- Add testing infrastructure (Vitest + GitHub Actions) when needed

**Environments:**

| Environment | Vercel | Supabase | Stripe | Google OAuth |
|---|---|---|---|---|
| Development | Local (`next dev`) | Local Supabase CLI or dev project | Test mode | Test credentials |
| Staging | Vercel Preview | Separate Supabase project | Test mode | Separate credentials |
| Production | Vercel Production | Production Supabase project | Live mode | Production credentials |

**Environment Variables:**

```
# Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=

# Server-only (never exposed to client)
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
```

**Monitoring:**
- Vercel Analytics for Web Vitals and usage metrics
- Vercel Logs for serverless function logs
- Sentry (free tier) for runtime error tracking with source maps
- Supabase Dashboard for database monitoring and query performance

### Supabase Setup Guide

This checklist documents everything to configure in Supabase alongside implementation. Complete each section when the corresponding feature is being built.

#### Phase 0: Project Setup

- [ ] Create Supabase project (production)
- [ ] Create separate Supabase project (staging)
- [ ] Install Supabase CLI locally for local development (`npx supabase init`)
- [ ] Note `SUPABASE_URL` and `SUPABASE_ANON_KEY` from project Settings → API
- [ ] Note `SUPABASE_SERVICE_ROLE_KEY` from project Settings → API (server-side only — never expose)
- [ ] Note database connection strings from Settings → Database:
  - Pooled connection string → `DATABASE_URL`
  - Direct connection string → `DIRECT_URL`
- [ ] Configure Prisma `schema.prisma` with both connection strings

#### Phase 1: Authentication Setup

**Google OAuth (for hosts):**
- [ ] Go to Supabase Dashboard → Authentication → Providers → Google
- [ ] Enable Google provider
- [ ] Create Google Cloud project at console.cloud.google.com
- [ ] Enable Google Calendar API in Google Cloud Console
- [ ] Create OAuth 2.0 credentials (Web application)
  - Authorized JavaScript origins: `http://localhost:3000` (dev), `https://timetap.it` (prod)
  - Authorized redirect URIs: `https://<supabase-project>.supabase.co/auth/v1/callback`
- [ ] Copy Client ID and Client Secret into Supabase Google provider settings
- [ ] Set OAuth scopes: `openid`, `email`, `profile` (calendar scopes requested separately during onboarding)
- [ ] Configure Supabase redirect URL in Auth → URL Configuration:
  - Site URL: `https://timetap.it`
  - Redirect URLs: `http://localhost:3000/auth/callback`, `https://timetap.it/auth/callback`, `https://*.vercel.app/auth/callback`

**Magic Links (for customers):**
- [ ] Go to Authentication → Providers → Email
- [ ] Enable Email provider
- [ ] Enable "Magic Link" sign-in (disable password sign-in for customers — hosts use Google OAuth)
- [ ] Configure magic link email template at Authentication → Email Templates → Magic Link:
  - Customize subject: "Access your sessions with {{ .Data.host_name }}"
  - Customize body with TimeTap branding
  - Set magic link expiry (default 1 hour is fine)
- [ ] Set rate limits for magic link emails at Authentication → Rate Limits

**General Auth Settings:**
- [ ] Authentication → Settings:
  - Set JWT expiry (default 3600s / 1 hour)
  - Enable "Confirm email" for new sign-ups (prevents spam)
- [ ] Authentication → URL Configuration:
  - Site URL: `https://timetap.it`
  - Add all valid redirect URLs (localhost, Vercel preview, production)

#### Phase 2: Database & RLS Setup

**Enable RLS on all tables (after Prisma migration creates them):**
- [ ] For each tenant-scoped table, enable RLS via Prisma migration SQL or Supabase Dashboard:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Host policies: hosts can only access their own data
CREATE POLICY "Hosts access own data" ON hosts
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Hosts manage own packages" ON packages
  FOR ALL USING (host_id = auth.uid());

CREATE POLICY "Hosts view own customers" ON customers
  FOR ALL USING (host_id = auth.uid());

CREATE POLICY "Hosts manage own bookings" ON bookings
  FOR ALL USING (host_id = auth.uid());

CREATE POLICY "Hosts view own sessions" ON sessions
  FOR ALL USING (host_id = auth.uid());

-- Customer policies: customers access data scoped to their host relationship
CREATE POLICY "Customers view own credits" ON credits
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers view own bookings" ON bookings
  FOR SELECT USING (customer_id = auth.uid());

-- Service role bypass: server-side operations (webhooks, cron) use service role key
-- which bypasses RLS by default
```

- [ ] Test RLS policies: verify a host cannot query another host's data
- [ ] Test RLS policies: verify a customer cannot access another host's customers

**Database extensions (if needed):**
- [ ] Enable `uuid-ossp` or `pgcrypto` for UUID generation (likely already enabled)
- [ ] Enable `pg_cron` if using database-level scheduled jobs (optional — can use Vercel Cron instead)

#### Phase 3: Stripe Connect Setup

- [ ] Create Stripe account and enable Connect
- [ ] Get Stripe API keys from Stripe Dashboard → Developers → API Keys:
  - `STRIPE_SECRET_KEY` (server-side only)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-safe)
- [ ] Configure Stripe Connect settings:
  - Account type: Standard
  - Configure branding (TimeTap logo, colors)
  - Set OAuth redirect URL: `https://timetap.it/api/auth/callback/stripe`
- [ ] Set up Stripe webhook:
  - Stripe Dashboard → Developers → Webhooks → Add endpoint
  - Endpoint URL: `https://timetap.it/api/webhooks/stripe`
  - Events to listen for:
    - `checkout.session.completed` (package purchase)
    - `account.updated` (Connect account status)
    - `customer.subscription.created` (host subscription)
    - `customer.subscription.updated` (host subscription changes)
    - `customer.subscription.deleted` (host subscription cancelled)
    - `invoice.payment_failed` (subscription payment failure)
  - Copy `STRIPE_WEBHOOK_SECRET` from webhook endpoint details
- [ ] For staging: use Stripe test mode keys and separate webhook endpoint
- [ ] Install Stripe CLI for local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

#### Phase 4: Google Calendar & Meet Setup

- [ ] In Google Cloud Console (same project as OAuth):
  - Enable Google Calendar API
  - Enable Google Meet API (if separate from Calendar)
- [ ] OAuth consent screen configuration:
  - App name: TimeTap
  - Scopes requested during onboarding (not at sign-in):
    - `https://www.googleapis.com/auth/calendar.events` (read/write events)
    - `https://www.googleapis.com/auth/calendar.readonly` (read availability)
  - Set app to "Testing" initially, submit for verification before public launch
- [ ] Store host's Google Calendar refresh token securely in database (encrypted column or Supabase Vault)
- [ ] For local development: use Google OAuth playground or test account

#### Phase 5: Email (Mailgun) Setup

- [ ] Create Mailgun account
- [ ] Add and verify sending domain: `mail.timetap.it` (or similar subdomain)
- [ ] Configure DNS records (SPF, DKIM, DMARC) for deliverability:
  - Add TXT records provided by Mailgun to your domain DNS
  - Verify domain in Mailgun dashboard
- [ ] Get API credentials:
  - `MAILGUN_API_KEY`
  - `MAILGUN_DOMAIN` (e.g., `mail.timetap.it`)
- [ ] Set up email templates for 7 transactional types:
  1. Booking confirmation (to customer)
  2. Booking notification (to host)
  3. Rescheduling confirmation (to customer and host)
  4. Magic link (to customer)
  5. Post-free-session upsell (to customer)
  6. Package purchase confirmation (to customer)
  7. Session cancellation (to customer and host)
- [ ] For staging: use Mailgun sandbox domain or separate subdomain
- [ ] Configure Supabase to use custom SMTP (Mailgun) for auth emails:
  - Supabase Dashboard → Settings → Auth → SMTP Settings
  - Enable custom SMTP
  - Host: `smtp.mailgun.org`
  - Port: 587
  - Username/password from Mailgun SMTP credentials
  - Sender: `noreply@timetap.it`

#### Phase 6: Vercel Deployment Setup

- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables in Vercel Dashboard → Settings → Environment Variables:
  - Add all env vars listed in the Environment Variables section above
  - Set per-environment (Production, Preview, Development)
- [ ] Configure custom domain: `timetap.it`
  - Add domain in Vercel → Settings → Domains
  - Update DNS records (A record or CNAME) at your domain registrar
- [ ] Enable Vercel Analytics (Settings → Analytics)
- [ ] Configure Vercel Cron Jobs (if using for upsell email trigger):
  - Add `vercel.json` with cron schedule
- [ ] Set up Sentry:
  - Create Sentry project (Next.js)
  - Add `SENTRY_DSN` to Vercel environment variables
  - Install `@sentry/nextjs` and configure

#### Phase 7: Pre-Launch Checklist

- [ ] Verify Google OAuth consent screen submitted for verification (required for >100 users)
- [ ] Switch Stripe from test mode to live mode, update all keys
- [ ] Verify Mailgun domain is fully verified and out of sandbox
- [ ] Verify Supabase RLS policies on all tables
- [ ] Test webhook endpoints with live Stripe events
- [ ] Verify all environment variables set in Vercel production
- [ ] Test Google Calendar sync with real Google account
- [ ] Verify magic link emails arrive and are not flagged as spam
- [ ] Confirm HTTPS on custom domain
- [ ] Test full flow: host onboarding → package creation → customer purchase → booking

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization (create-next-app + dependencies)
2. Supabase project + Prisma schema + initial migration
3. Auth (Google OAuth for hosts, then magic links for customers)
4. Host onboarding flow (profile, Stripe Connect, calendar, packages)
5. Public host page + free session booking
6. Stripe Checkout + package purchase + credit system
7. Customer workspace + booking engine
8. Email system (Mailgun integration + templates)
9. Host dashboard (schedule, clients, credit management)
10. Automated upsell flow

**Cross-Component Dependencies:**
- Auth must be implemented before any protected routes
- Prisma schema must be designed before any data access code
- Stripe Connect OAuth must work before package purchase flow
- Google Calendar integration must work before availability computation
- Email service must work before magic links, booking confirmations, and upsell
- RLS policies must be tested before any multi-tenant data access goes live

## Implementation Patterns & Consistency Rules

### Naming Conventions

**Database (Prisma):**
- Model names: PascalCase singular (`Host`, `Package`, `Booking`, `Session`)
- Table names: snake_case plural via `@@map` (`hosts`, `packages`, `bookings`, `sessions`)
- Fields: camelCase in Prisma, auto-mapped to snake_case in PostgreSQL via `@map`
- Primary keys: UUID v4 via `@default(uuid())`
- Foreign keys: `{modelName}Id` in Prisma (e.g., `hostId`), `{table_name}_id` in PostgreSQL
- Indexes: `idx_{table}_{columns}` (e.g., `idx_bookings_host_id_date`)
- Timestamps: `createdAt`, `updatedAt` on all models

**Code:**
- Files: kebab-case (`booking-actions.ts`, `credit-balance-card.tsx`, `use-booking.ts`)
- React components: PascalCase (`CreditBalanceCard`, `SessionCard`, `GradientHeader`)
- Functions/variables: camelCase (`getAvailableSlots`, `hostId`, `creditBalance`)
- Server Actions: camelCase verbs (`createPackage`, `bookSession`, `rescheduleSession`)
- Zod schemas: camelCase with `Schema` suffix (`createPackageSchema`, `bookSessionSchema`)
- Types/interfaces: PascalCase, no prefix (`Host`, `BookingSlot`, not `IHost` or `TBookingSlot`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_CREDITS_PER_PACKAGE`, `MAGIC_LINK_EXPIRY_HOURS`)
- Custom hooks: `use` prefix, camelCase (`useAvailableSlots`, `useBookingForm`)
- Event handlers: `handle` prefix (`handleBookSession`, `handleReschedule`)

**Routes (Next.js App Router):**
- Directory names: kebab-case (`/dashboard/client-list/`)
- Route groups: parentheses with descriptive name (`(public)`, `(host)`, `(customer)`)
- Dynamic segments: `[paramName]` in camelCase (`[slug]`, `[bookingId]`)

### Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public pages — no auth required
│   │   ├── [slug]/               # Host public page (SSR)
│   │   │   ├── page.tsx
│   │   │   └── actions.ts        # Free session booking action
│   │   ├── page.tsx              # Landing page (SSG)
│   │   └── layout.tsx
│   ├── (host)/                   # Host dashboard — Google OAuth required
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home
│   │       ├── schedule/
│   │       ├── clients/
│   │       ├── packages/
│   │       ├── settings/
│   │       ├── onboarding/
│   │       └── layout.tsx
│   ├── (customer)/               # Customer workspace — magic link required
│   │   └── workspace/
│   │       └── [hostSlug]/
│   │           ├── page.tsx      # Workspace home
│   │           ├── book/
│   │           ├── reschedule/
│   │           └── layout.tsx
│   ├── api/                      # Route Handlers
│   │   ├── auth/callback/        # OAuth callbacks (Google, Stripe)
│   │   ├── webhooks/stripe/      # Stripe webhook handler
│   │   └── cron/                 # Vercel Cron endpoints
│   ├── auth/                     # Auth pages (login, magic link request)
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Root loading state
│   └── not-found.tsx
├── components/
│   ├── ui/                       # shadcn/ui (auto-generated, don't edit directly)
│   ├── booking/                  # Time slot picker, booking confirmation
│   ├── dashboard/                # Gradient header, session card, activity feed
│   ├── packages/                 # Package card (public + host variants)
│   ├── clients/                  # Client list item, credit balance card
│   ├── onboarding/               # Stepper, slug input, weekly hours grid
│   └── shared/                   # Confirmation screen, bottom tab bar, sidebar
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts         # Auth middleware helper
│   ├── stripe/
│   │   ├── client.ts             # Stripe instance
│   │   └── webhooks.ts           # Webhook verification + handlers
│   ├── google/
│   │   ├── calendar.ts           # Calendar API helpers
│   │   └── auth.ts               # Google OAuth token management
│   ├── email/
│   │   ├── client.ts             # Mailgun client
│   │   └── templates/            # Email template functions
│   ├── validations/              # Zod schemas (shared client + server)
│   │   ├── package.ts
│   │   ├── booking.ts
│   │   ├── host.ts
│   │   └── customer.ts
│   └── utils.ts                  # cn(), formatDate(), formatCurrency()
├── services/                     # Data access layer (Prisma queries)
│   ├── host.service.ts
│   ├── booking.service.ts
│   ├── package.service.ts
│   ├── credit.service.ts
│   ├── customer.service.ts
│   ├── session.service.ts
│   └── availability.service.ts   # Availability computation logic
├── types/                        # Shared TypeScript types
│   ├── index.ts
│   └── actions.ts                # ActionResult<T> type
├── hooks/                        # Custom React hooks
│   ├── use-available-slots.ts
│   └── use-booking-form.ts
└── middleware.ts                  # Next.js middleware (auth routing)
```

**Structural rules:**
- **Services layer:** All Prisma queries go in `src/services/`. Server Actions call services — never write Prisma queries directly in actions or components.
- **Tests:** Co-located with source files (`booking.service.test.ts` next to `booking.service.ts`). No separate `__tests__/` directory.
- **Zod schemas:** Always in `src/lib/validations/`. Shared between client-side React Hook Form validation and server-side Server Action validation.
- **One export per file for components.** Services and lib files may export multiple related functions.
- **No barrel exports** (`index.ts` re-exports) except in `src/types/`. Direct imports everywhere else.

### Data Format Standards

**Date/Time:**
- Database: UTC `timestamptz` (Prisma `DateTime`)
- Server Actions / API: ISO 8601 strings (`"2026-02-13T10:00:00Z"`)
- Display: Formatted to host's timezone using `Intl.DateTimeFormat`
- Timezone source: Host profile (derived from Google Calendar settings)
- Booking slots: Computed and displayed in host's local timezone

**IDs:**
- All primary keys: UUID v4
- Public-facing URLs: slugs (`timetap.it/sofia-coaching`)
- Internal references: UUIDs
- Never expose sequential IDs

**JSON:**
- Field names: camelCase
- Absent values: `null` (not `undefined`)
- Empty lists: `[]` (not `null`)
- Money: Integer cents (e.g., `80000` for €800.00) — avoids floating point issues. Format for display only at the UI layer.

**Currency:**
- Store: integer cents in database
- Stripe: already uses cents
- Display: `Intl.NumberFormat` with host's currency locale
- Default currency: EUR (configurable per host in future)

### Server Action Patterns

**Every Server Action follows this pattern:**
```typescript
"use server"

import { z } from "zod"
import { createPackageSchema } from "@/lib/validations/package"
import { createClient } from "@/lib/supabase/server"
import { packageService } from "@/services/package.service"
import type { ActionResult } from "@/types/actions"

export async function createPackage(
  input: z.infer<typeof createPackageSchema>
): Promise<ActionResult<Package>> {
  // 1. Validate input
  const parsed = createPackageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } }
  }

  // 2. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }
  }

  // 3. Business logic via service
  try {
    const result = await packageService.create(user.id, parsed.data)
    return { success: true, data: result }
  } catch (error) {
    // 4. Log to Sentry, return user-friendly error
    console.error("createPackage failed:", error)
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Could not create package. Please try again." } }
  }
}
```

**Rules:**
1. Always validate input with Zod first
2. Always check authentication
3. Always use service layer for data access
4. Never throw — always return `ActionResult`
5. Log errors server-side, return warm messages client-side

### Import Order Convention

```typescript
// 1. React / Next.js
import { useState, useTransition } from "react"
import { redirect } from "next/navigation"

// 2. External packages
import { z } from "zod"
import { useForm } from "react-hook-form"

// 3. Internal absolute imports (@/)
import { Button } from "@/components/ui/button"
import { createPackageSchema } from "@/lib/validations/package"
import { cn } from "@/lib/utils"

// 4. Relative imports (same feature)
import { PackageFormFields } from "./package-form-fields"
```

### Enforcement Guidelines

**All AI agents MUST:**
- Follow naming conventions exactly — no exceptions for "just this one file"
- Use the services layer for all database access — never write Prisma queries in actions or components
- Return `ActionResult<T>` from all Server Actions — never throw
- Store money as integer cents — never floating point
- Store dates as UTC — format to timezone only at display layer
- Use Zod schemas from `lib/validations/` — never inline validation
- Use `@/` imports — never relative paths crossing more than one directory up

**Anti-patterns to reject:**
- Prisma queries in React components or Server Actions (use services)
- `any` type annotations (use `unknown` and narrow)
- Inline styles (use Tailwind classes)
- `console.log` for production logging (use Sentry)
- Floating point for currency (`799.99` — use `79999` cents)
- Direct `process.env` access in client components (use `NEXT_PUBLIC_` or pass via props)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
timetap/
├── prisma/
│   ├── schema.prisma                 # Database schema (single file)
│   ├── migrations/                   # Prisma Migrate output
│   └── seed.ts                       # Development seed data
├── public/
│   ├── logo/
│   │   ├── timetap_full_logo.svg     # Full wordmark
│   │   └── timetap_icon_only.svg     # Icon only
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── (public)/                 # No auth required
│   │   │   ├── [slug]/               # Host public page (SSR)
│   │   │   │   ├── page.tsx          # Host profile, packages, booking
│   │   │   │   ├── actions.ts        # Free session booking, package purchase initiation
│   │   │   │   └── loading.tsx
│   │   │   ├── page.tsx              # Landing page (SSG)
│   │   │   └── layout.tsx            # Public layout (minimal header, footer)
│   │   ├── (host)/                   # Google OAuth required
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          # Dashboard home (gradient header, today's sessions, activity)
│   │   │   │   ├── actions.ts        # Dashboard-specific actions
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── schedule/
│   │   │   │   │   ├── page.tsx      # Schedule view (day picker + timeline)
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── clients/
│   │   │   │   │   ├── page.tsx      # Client list
│   │   │   │   │   ├── [customerId]/
│   │   │   │   │   │   ├── page.tsx  # Client detail (credits, history)
│   │   │   │   │   │   └── actions.ts # Gift credit, refund, cancel session
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── packages/
│   │   │   │   │   ├── page.tsx      # Package list
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx  # Create package form
│   │   │   │   │   ├── [packageId]/
│   │   │   │   │   │   └── page.tsx  # Edit package
│   │   │   │   │   ├── actions.ts    # Create, edit, deactivate package
│   │   │   │   │   └── loading.tsx
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx      # Profile, hours, integrations
│   │   │   │       └── actions.ts    # Update profile, update hours
│   │   │   ├── onboarding/
│   │   │   │   ├── page.tsx          # Onboarding stepper (client component)
│   │   │   │   ├── actions.ts        # Save profile, connect Stripe, set hours, create package, start trial
│   │   │   │   └── layout.tsx        # Centered narrow layout, no dashboard nav
│   │   │   └── layout.tsx            # Host layout (sidebar desktop, tab bar mobile)
│   │   ├── (customer)/               # Magic link required
│   │   │   ├── workspace/
│   │   │   │   └── [hostSlug]/
│   │   │   │       ├── page.tsx      # Workspace home (credits, upcoming sessions)
│   │   │   │       ├── book/
│   │   │   │       │   ├── page.tsx  # Slot picker + confirm
│   │   │   │       │   └── actions.ts # Book session action
│   │   │   │       ├── reschedule/
│   │   │   │       │   └── [bookingId]/
│   │   │   │       │       ├── page.tsx  # Reschedule slot picker
│   │   │   │       │       └── actions.ts # Reschedule action
│   │   │   │       ├── packages/
│   │   │   │       │   └── page.tsx  # Re-purchase packages (Stripe Checkout)
│   │   │   │       ├── actions.ts    # Shared workspace actions
│   │   │   │       ├── loading.tsx
│   │   │   │       └── layout.tsx    # Customer layout (host context header)
│   │   │   └── layout.tsx
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Host login (Google OAuth button)
│   │   │   ├── magic-link/
│   │   │   │   └── page.tsx          # Customer magic link request
│   │   │   ├── callback/
│   │   │   │   └── route.ts          # Auth callback handler (Google OAuth + magic link)
│   │   │   └── actions.ts            # Sign in, sign out, request magic link
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/
│   │   │   │       └── route.ts      # Stripe webhook handler
│   │   │   ├── auth/
│   │   │   │   └── callback/
│   │   │   │       └── stripe/
│   │   │   │           └── route.ts  # Stripe Connect OAuth callback
│   │   │   └── cron/
│   │   │       └── upsell/
│   │   │           └── route.ts      # Automated upsell email trigger
│   │   ├── globals.css               # Tailwind base + shadcn/ui CSS variables
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   ├── loading.tsx               # Root loading skeleton
│   │   └── not-found.tsx             # 404 page
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── form.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   └── textarea.tsx
│   │   ├── booking/
│   │   │   ├── time-slot-picker.tsx   # Day pills + vertical slot list + confirm bar
│   │   │   ├── booking-confirmation.tsx
│   │   │   └── slot-list.tsx
│   │   ├── dashboard/
│   │   │   ├── gradient-header.tsx    # Mobile gradient header with stats
│   │   │   ├── session-card.tsx       # Session with client info + time
│   │   │   ├── activity-feed-item.tsx
│   │   │   └── attention-alert.tsx
│   │   ├── packages/
│   │   │   ├── package-card-public.tsx  # Public-facing (with CTA)
│   │   │   └── package-card-host.tsx    # Host-facing (with stats)
│   │   ├── clients/
│   │   │   ├── client-list-item.tsx
│   │   │   └── credit-balance-card.tsx  # Gradient credit display
│   │   ├── onboarding/
│   │   │   ├── onboarding-stepper.tsx   # 5-step progress bar
│   │   │   ├── slug-input.tsx           # timetap.it/ prefix + validation
│   │   │   ├── weekly-hours-grid.tsx    # Visual availability editor
│   │   │   └── package-quick-create.tsx # One-tap free intro creation
│   │   └── shared/
│   │       ├── confirmation-screen.tsx  # Reusable success screen
│   │       ├── bottom-tab-bar.tsx       # Mobile host navigation
│   │       ├── sidebar-nav.tsx          # Desktop host navigation
│   │       ├── page-header.tsx          # Desktop page header
│   │       └── empty-state.tsx          # Reusable empty state
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # createBrowserClient()
│   │   │   ├── server.ts              # createServerClient()
│   │   │   └── middleware.ts          # updateSession() for middleware
│   │   ├── stripe/
│   │   │   ├── client.ts             # Stripe instance (server-side)
│   │   │   ├── checkout.ts           # createCheckoutSession helpers
│   │   │   └── webhooks.ts           # verifyWebhookSignature + event handlers
│   │   ├── google/
│   │   │   ├── calendar.ts           # getAvailability, createEvent, updateEvent, deleteEvent
│   │   │   └── auth.ts               # Token storage, refresh, revocation
│   │   ├── email/
│   │   │   ├── client.ts             # Mailgun client instance
│   │   │   └── templates/
│   │   │       ├── booking-confirmation.ts
│   │   │       ├── booking-notification.ts
│   │   │       ├── reschedule-confirmation.ts
│   │   │       ├── magic-link.ts
│   │   │       ├── upsell.ts
│   │   │       ├── purchase-confirmation.ts
│   │   │       └── cancellation.ts
│   │   ├── validations/
│   │   │   ├── package.ts            # createPackageSchema, updatePackageSchema
│   │   │   ├── booking.ts            # bookSessionSchema, rescheduleSchema
│   │   │   ├── host.ts               # updateProfileSchema, updateHoursSchema
│   │   │   └── customer.ts           # requestMagicLinkSchema
│   │   └── utils.ts                  # cn(), formatDate(), formatCurrency(), formatRelativeTime()
│   ├── services/
│   │   ├── host.service.ts           # CRUD host profile, slug management
│   │   ├── booking.service.ts        # Create, reschedule, cancel bookings + calendar sync
│   │   ├── package.service.ts        # CRUD packages
│   │   ├── credit.service.ts         # Credit balance, gift, refund, deduct
│   │   ├── customer.service.ts       # Customer lookup, list by host
│   │   ├── session.service.ts        # Session history, upcoming sessions
│   │   └── availability.service.ts   # Compute available slots (hours - GCal - booked - 24h)
│   ├── types/
│   │   ├── index.ts                  # Shared domain types
│   │   └── actions.ts                # ActionResult<T>
│   ├── hooks/
│   │   ├── use-available-slots.ts
│   │   └── use-booking-form.ts
│   └── middleware.ts                 # Auth routing (public/host/customer zones)
├── .env.local                        # Local dev env vars (git-ignored)
├── .env.example                      # Template with all required vars
├── .gitignore
├── .eslintrc.json
├── components.json                   # shadcn/ui config
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── package.json
├── pnpm-lock.yaml
└── vercel.json                       # Cron job configuration
```

### Architectural Boundaries

**Authentication Boundary:**
- `src/middleware.ts` — First checkpoint. Checks Supabase session, redirects unauthenticated users based on route zone.
- `src/lib/supabase/middleware.ts` — Session refresh helper called by middleware.
- `src/app/(host)/layout.tsx` — Second checkpoint. Server component verifies user is a host (has host record).
- `src/app/(customer)/workspace/[hostSlug]/layout.tsx` — Second checkpoint. Server component verifies customer-host relationship.
- `src/app/api/webhooks/stripe/route.ts` — No Supabase auth. Verifies Stripe webhook signature instead.

**Data Access Boundary:**
- **Only `src/services/*.service.ts` files import Prisma client.** No other files may query the database directly.
- Services return plain objects/arrays — never Prisma model instances (prevents leaking Prisma internals).
- Server Actions validate input (Zod) → check auth (Supabase) → call service → return `ActionResult`.

**External Integration Boundary:**
- All Google Calendar API calls go through `src/lib/google/calendar.ts` — never called directly from actions or services.
- All Stripe operations go through `src/lib/stripe/` — never import `stripe` package elsewhere.
- All email sending goes through `src/lib/email/client.ts` — never import `mailgun.js` elsewhere.
- Integration modules handle their own error wrapping — services receive clean results or thrown errors with meaningful types.

**UI Component Boundary:**
- `src/components/ui/` — shadcn/ui primitives. Modified only via shadcn CLI or when customizing themes. Never add custom business logic here.
- `src/components/{feature}/` — TimeTap custom components. May import from `ui/` but never import from other feature directories (prevents circular dependencies).
- `src/app/**/page.tsx` — Page components compose feature components. Business-specific layouts live here.

### Requirements to Structure Mapping

| FR Category | Primary Location | Supporting Files |
|---|---|---|
| **Host Account & Onboarding** (FR1-6) | `src/app/(host)/onboarding/` | `services/host.service.ts`, `lib/supabase/`, `lib/validations/host.ts` |
| **Availability Management** (FR7-11) | `src/services/availability.service.ts` | `lib/google/calendar.ts`, `components/onboarding/weekly-hours-grid.tsx` |
| **Package & Credit Management** (FR12-18) | `src/app/(host)/dashboard/packages/`, `src/app/(host)/dashboard/clients/` | `services/package.service.ts`, `services/credit.service.ts` |
| **Host Public Page** (FR19-22) | `src/app/(public)/[slug]/` | `services/host.service.ts`, `services/package.service.ts`, `components/packages/package-card-public.tsx` |
| **Customer Authentication** (FR23-26) | `src/app/auth/magic-link/`, `src/lib/supabase/` | `lib/email/templates/magic-link.ts`, `middleware.ts` |
| **Customer Workspace** (FR27-32) | `src/app/(customer)/workspace/[hostSlug]/` | `services/credit.service.ts`, `services/booking.service.ts`, `components/booking/`, `components/clients/credit-balance-card.tsx` |
| **Booking & Calendar Sync** (FR33-37) | `src/services/booking.service.ts` | `lib/google/calendar.ts`, `services/availability.service.ts` |
| **Host Dashboard** (FR38-42) | `src/app/(host)/dashboard/` | `services/session.service.ts`, `services/customer.service.ts`, `components/dashboard/` |
| **Email & Notifications** (FR43-47) | `src/lib/email/` | `lib/email/templates/`, `src/app/api/cron/upsell/` |

### Integration Points

**External Service Integration Map:**

| Service | Entry Points | Data Flow |
|---|---|---|
| **Supabase Auth** | `middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts` | Browser ↔ Supabase ↔ middleware ↔ Server Components |
| **Google Calendar** | `lib/google/calendar.ts` called by `booking.service.ts` and `availability.service.ts` | Service → Google API → cache (5min TTL) → availability computation |
| **Stripe Connect** | `lib/stripe/checkout.ts` (payment initiation), `api/webhooks/stripe/route.ts` (confirmation) | Client → Stripe Checkout → webhook → service → database |
| **Stripe Connect OAuth** | `onboarding/actions.ts` → `api/auth/callback/stripe/route.ts` | Host → Stripe OAuth → callback → save connected account ID |
| **Mailgun** | `lib/email/client.ts` called by actions and cron | Action/cron → email template → Mailgun API → customer inbox |

**Internal Data Flow:**
```
User Action → Server Action → Zod Validation → Auth Check → Service Layer → Prisma → PostgreSQL
                                                              ↓
                                                    External APIs (Google, Stripe, Mailgun)
                                                              ↓
                                                    ActionResult<T> → Client → Toast/Redirect
```

### Development Workflow

**Local development:**
```bash
pnpm dev                    # Next.js dev server with Turbopack
npx supabase start          # Local Supabase (if using CLI) or use remote dev project
stripe listen --forward-to localhost:3000/api/webhooks/stripe  # Stripe webhook forwarding
```

**Database changes:**
```bash
pnpm dlx prisma migrate dev --name describe_change   # Create + apply migration
pnpm dlx prisma generate                              # Regenerate client types
pnpm dlx prisma studio                                # Visual data browser
```

**Adding UI components:**
```bash
pnpm dlx shadcn@latest add button card dialog         # Add shadcn components
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices are compatible and well-tested together. Next.js 16 + Supabase + Prisma + shadcn/ui + Vercel is a standard production stack with no version conflicts. Supabase Auth integrates natively with `@supabase/ssr` for Next.js cookie-based sessions. Prisma connects to Supabase PostgreSQL via pooled + direct connection strings.

**Pattern Consistency:** Naming conventions are internally consistent — camelCase in TypeScript, snake_case in PostgreSQL (auto-mapped by Prisma), PascalCase for React components, kebab-case for files. The Server Action → Service → Prisma data flow pattern is applied uniformly. All API boundaries use the same `ActionResult<T>` return type.

**Structure Alignment:** Project structure supports all architectural decisions. Route groups `(public)`, `(host)`, `(customer)` map directly to the three auth zones. Service layer isolates data access. Integration modules (`lib/google/`, `lib/stripe/`, `lib/email/`) enforce external service boundaries.

### Scope Amendment

**Host Subscription Billing: Added to MVP.** The PRD listed "Host subscription billing (TimeTap monetization)" as excluded from MVP. The UX specification subsequently added onboarding Step 5 — free trial with card capture (20-day trial, €14.99/month). The UX spec takes precedence. The architecture supports this: Stripe subscription webhooks are configured, onboarding includes trial step, and the Supabase setup guide covers subscription-related webhook events.

### Requirements Coverage

**Functional Requirements (47/47 covered):**

| FR Category | Coverage | Notes |
|---|---|---|
| Host Account & Onboarding (FR1-6) | ✅ Complete | Google OAuth, profile, slug, 5-step onboarding including trial |
| Availability Management (FR7-11) | ✅ Complete | availability.service.ts, Google Calendar integration, 24h window |
| Package & Credit Management (FR12-18) | ✅ Complete | package.service.ts, credit.service.ts, gift/refund actions |
| Host Public Page (FR19-22) | ✅ Complete | SSR at `/{slug}`, Stripe Checkout, free session booking |
| Customer Authentication (FR23-26) | ✅ Complete | Supabase magic link, host-scoped at application layer |
| Customer Workspace (FR27-32) | ✅ Complete | Workspace routes, booking, reschedule, re-purchase |
| Booking & Calendar Sync (FR33-37) | ✅ Complete | booking.service.ts, Google Calendar write, optimistic locking |
| Host Dashboard (FR38-42) | ✅ Complete | Dashboard routes, session/customer services, credit management |
| Email & Notifications (FR43-47) | ✅ Complete | 7 Mailgun templates, automated upsell via Vercel Cron |

**Non-Functional Requirements (29/29 addressed):**

| NFR Category | Coverage | Implementation |
|---|---|---|
| Performance (NFR1-4) | ✅ | SSG/SSR, Turbopack, availability caching, Stripe redirect |
| Security (NFR5-10) | ✅ | HTTPS via Vercel, Supabase Auth, server-side secrets, RLS, authorization middleware |
| GDPR & Privacy (NFR11-15) | ✅ | RLS for data isolation, CASCADE DELETE for erasure, consent tracking in schema, transactional email only |
| Accessibility (NFR16-19) | ✅ | Radix UI primitives, shadcn/ui, WCAG 2.1 AA color palette verified in UX spec |
| Integration Reliability (NFR20-22) | ✅ | Graceful degradation for GCal, Stripe webhook retry built-in, error isolation per integration |
| Scalability (NFR23-25) | ✅ | Multi-tenant RLS, isolated integrations, no server-side session state |
| Infrastructure (NFR26-29) | ✅ | Staging via Supabase + Vercel preview, managed services, Supabase backups |

### Implementation Details for Flagged Issues

**GDPR Right to Erasure (NFR12):**
Prisma schema must define `onDelete: Cascade` on all foreign key relationships from host-scoped tables. A `deleteCustomerData` service method handles the complete deletion chain:
1. Delete all bookings/sessions for the customer-host relationship
2. Delete credit records and transactions
3. Delete the customer record itself
4. Cascade handles dependent records automatically
5. Log deletion event (anonymized) for audit trail

**Slot Booking Optimistic Locking (FR36):**
The `booking.service.ts` creates bookings within a Prisma transaction using `SELECT FOR UPDATE`:
```typescript
await prisma.$transaction(async (tx) => {
  // Lock: check slot is still available
  const existing = await tx.booking.findFirst({
    where: { hostId, startTime, status: "confirmed" },
  })
  if (existing) {
    throw new SlotTakenError("This slot was just booked")
  }
  // Insert booking + deduct credit
  const booking = await tx.booking.create({ data: { ... } })
  await tx.credit.update({ where: { id: creditId }, data: { balance: { decrement: 1 } } })
  return booking
})
```
The calling Server Action catches `SlotTakenError` and returns a user-friendly message: "That slot was just booked by someone else — here are other times that work."

**Testing (deferred):**
No CI pipeline for MVP. Recommended framework when ready: Vitest + React Testing Library. Tests co-located with source files. Priority test targets: availability computation, credit deduction logic, booking transaction, RLS policy verification.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (47 FRs, 29 NFRs)
- [x] Scale and complexity assessed (medium complexity, full-stack web)
- [x] Technical constraints identified (3 external integrations, solo founder)
- [x] Cross-cutting concerns mapped (auth, resilience, email, multi-tenancy, GDPR, calendar sync)

**Architectural Decisions**
- [x] Critical decisions documented (auth, data, API, deployment)
- [x] Technology stack fully specified with versions (Next.js 16, Supabase, Prisma, etc.)
- [x] Integration patterns defined (Google Calendar, Stripe Connect, Mailgun)
- [x] Performance considerations addressed (caching, SSR/SSG, availability computation)
- [x] Security architecture defined (RLS, auth zones, webhook verification)

**Implementation Patterns**
- [x] Naming conventions established (database, code, routes)
- [x] Structure patterns defined (services layer, integration boundaries)
- [x] Data format standards specified (dates, IDs, currency, JSON)
- [x] Server Action pattern with examples
- [x] Import order convention
- [x] Enforcement guidelines and anti-patterns

**Project Structure**
- [x] Complete directory structure defined (every file and directory)
- [x] Component boundaries established (auth, data access, UI, integration)
- [x] Integration points mapped (external services, data flow)
- [x] Requirements to structure mapping complete (all 9 FR categories)

**Operational Readiness**
- [x] Supabase setup guide (7 phases, complete checklist)
- [x] Environment variables documented
- [x] Development workflow commands
- [x] Pre-launch checklist

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level:** High — all requirements are covered, decisions are coherent, patterns are comprehensive, and the structure is specific enough for AI agents to implement consistently.

**Key Strengths:**
- Clear separation of auth zones with layered protection (middleware + layout)
- Service layer enforces data access boundaries — prevents accidental cross-host data leaks
- Comprehensive Supabase setup guide eliminates guesswork on external configuration
- Server Action pattern with `ActionResult<T>` eliminates ambiguity in error handling
- Integration modules isolate external service complexity from business logic

**Areas for Future Enhancement:**
- Testing infrastructure (Vitest + React Testing Library when ready)
- Background calendar sync (upgrade from on-demand caching if latency becomes an issue)
- Rate limiting on public endpoints (evaluate after launch based on traffic)
- Observability upgrade (structured logging, distributed tracing if needed at scale)
