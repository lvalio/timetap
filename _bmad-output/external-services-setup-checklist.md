# TimeTap External Services Setup Checklist

Use this as a step-by-step guide to set up all external services before (and during) development. Services are ordered by dependency — do them top-to-bottom.

---

## 1. Google Cloud Console (OAuth + Calendar API)

**Used for:** Host sign-in (Google OAuth), Google Calendar sync, Google Meet link generation

### Setup Steps

- [x] Create a Google Cloud project (e.g. `timetap`)
- [x] Enable **Google Calendar API**
- [x] Go to **APIs & Services > Credentials > Create OAuth Client ID** (Web application)
- [x] Set **Authorized JavaScript origins:**
  - `http://localhost:3000` (dev)
  - `https://timetap.it` (prod — add later)
- [x] Set **Authorized redirect URIs:**
  - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
- [x] Go to **OAuth consent screen:**
  - Set app name, support email, logo
  - Add scopes: `openid`, `email`, `profile`
  - Add scopes: `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/calendar.readonly`
  - Add yourself as a test user (for dev)
- [x] Copy **Client ID** and **Client Secret**

### Keys to collect

| Key | Value | Where |
|-----|-------|-------|
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | Server `.env` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Server `.env` |

### Pre-launch

- [ ] Submit OAuth consent screen for Google verification (required for >100 users)

---

## 2. Supabase (Database + Auth)

**Used for:** PostgreSQL database, authentication (Google OAuth for hosts, magic links for customers), Row-Level Security

### Setup Steps

- [x] Create a Supabase project (e.g. `timetap-dev`)
- [x] Go to **Settings > API** — copy project URL and keys
- [x] Go to **Authentication > Providers > Google:**
  - Enable Google provider
  - Paste the Google Client ID and Client Secret from step 1
- [x] Go to **Settings > Database** — copy connection strings (pooled + direct)
- [ ] (Later) Configure custom SMTP under **Authentication > SMTP Settings** using Mailgun credentials from step 4

### Keys to collect

| Key | Value | Where |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Client `.env` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Client `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Server `.env` |
| `DATABASE_URL` | `postgresql://...?pgbouncer=true` (pooled) | Server `.env` |
| `DIRECT_URL` | `postgresql://...` (direct, for migrations) | Server `.env` |

### Pre-launch

- [ ] Create a separate `timetap-prod` Supabase project
- [ ] Verify RLS policies on all tenant-scoped tables

---

## 3. Stripe (Payments + Connect)

**Used for:** Host subscriptions (14.99/month after 20-day trial), customer package purchases via Checkout, host payouts via Connect Standard

### Setup Steps

- [ ] Create a Stripe account at [stripe.com](https://stripe.com)
- [ ] In **Developers > API keys** — copy test-mode publishable and secret keys
- [ ] Enable **Stripe Connect:**
  - Go to **Connect > Settings**
  - Choose **Standard** account type
  - Configure branding (name, logo, colors)
  - Set redirect URI: `http://localhost:3000/api/stripe/connect/callback` (dev)
- [ ] Set up a **Webhook endpoint:**
  - URL: `http://localhost:3000/api/webhooks/stripe` (dev — use Stripe CLI for local testing)
  - Events to listen for: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `account.updated`
  - Copy the webhook signing secret
- [ ] Install **Stripe CLI** for local webhook testing:
  ```bash
  brew install stripe/stripe-cli/stripe
  stripe login
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

### Keys to collect

| Key | Value | Where |
|-----|-------|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_xxxxx` | Client `.env` |
| `STRIPE_SECRET_KEY` | `sk_test_xxxxx` | Server `.env` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx` | Server `.env` |

### Pre-launch

- [ ] Switch to live-mode keys
- [ ] Update webhook endpoint to production URL (`https://timetap.it/api/webhooks/stripe`)
- [ ] Test full purchase flow with live Stripe

---

## 4. Mailgun (Transactional Email)

**Used for:** All transactional emails (booking confirmations, magic links, upsells, etc.) + Supabase Auth SMTP relay

### Setup Steps

- [ ] Create a Mailgun account at [mailgun.com](https://www.mailgun.com)
- [ ] **For development:** Use the sandbox domain provided by Mailgun (add your email as an authorized recipient)
- [ ] **For production:** Add and verify a sending domain:
  - Recommended: `mail.timetap.it`
  - Add DNS records (Mailgun provides them):
    - [ ] SPF (`TXT` record)
    - [ ] DKIM (`TXT` record)
    - [ ] CNAME tracking record
    - [ ] MX records (if receiving email)
  - [ ] Click "Verify" in Mailgun and confirm all records pass
- [ ] Go to **Domain Settings > SMTP Credentials** — note SMTP host, port, username, password
- [ ] Go back to **Supabase > Authentication > SMTP Settings** and enter:
  - Host: `smtp.mailgun.org`
  - Port: `587`
  - Username: Mailgun SMTP username
  - Password: Mailgun SMTP password
  - Sender: `noreply@mail.timetap.it`

### Keys to collect

| Key | Value | Where |
|-----|-------|-------|
| `MAILGUN_API_KEY` | `key-xxxxx` | Server `.env` |
| `MAILGUN_DOMAIN` | `mail.timetap.it` | Server `.env` |

### Pre-launch

- [ ] Verify sending domain is fully verified (out of sandbox)
- [ ] Test that magic link emails are not flagged as spam
- [ ] Confirm all 7 email templates render correctly

---

## 5. Vercel (Hosting + CI/CD)

**Used for:** Next.js hosting, preview deployments, production deployments, cron jobs (upsell emails)

### Setup Steps

- [ ] Create a Vercel account at [vercel.com](https://vercel.com)
- [ ] Connect your GitHub repo (`timetap`)
- [ ] Import the project — Vercel auto-detects Next.js
- [ ] Add **all environment variables** (from services above) in **Settings > Environment Variables:**
  - Set per environment: Development / Preview / Production
  - Add `NEXT_PUBLIC_APP_URL`:
    - Preview: auto (Vercel URL)
    - Production: `https://timetap.it`
- [ ] **Custom domain:**
  - Go to **Settings > Domains**
  - Add `timetap.it`
  - Configure DNS: A record or CNAME as Vercel instructs
  - [ ] Verify HTTPS is active

### Keys to collect

No API keys needed — Vercel uses GitHub integration for deploys.

### Pre-launch

- [ ] All env vars set for production environment
- [ ] Custom domain active with HTTPS
- [ ] Preview deployments working on PR branches

---

## 6. Sentry (Error Tracking) — Optional

**Used for:** Runtime error tracking, source maps, stack traces

### Setup Steps

- [ ] Create a Sentry account at [sentry.io](https://sentry.io) (free tier is fine)
- [ ] Create a project (Platform: Next.js)
- [ ] Copy the DSN

### Keys to collect

| Key | Value | Where |
|-----|-------|-------|
| `SENTRY_DSN` | `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` | Server `.env` |

---

## Quick Reference: Complete `.env` Template

```env
# --- Public (safe for client) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- Server-only (never expose to client) ---
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
SENTRY_DSN=
```

---

## Service Account Summary

| # | Service | Free Tier? | Account URL |
|---|---------|-----------|-------------|
| 1 | Google Cloud | Yes (OAuth + Calendar API free) | [console.cloud.google.com](https://console.cloud.google.com) |
| 2 | Supabase | Yes (free tier) | [supabase.com](https://supabase.com) |
| 3 | Stripe | Yes (test mode free, 2.9%+30c per txn live) | [stripe.com](https://stripe.com) |
| 4 | Mailgun | Yes (sandbox; paid for custom domain) | [mailgun.com](https://www.mailgun.com) |
| 5 | Vercel | Yes (Hobby tier) | [vercel.com](https://vercel.com) |
| 6 | Sentry | Yes (free tier) | [sentry.io](https://sentry.io) |
