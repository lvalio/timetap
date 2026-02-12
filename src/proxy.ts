// Next.js 16: proxy.ts replaces middleware.ts
// Route protection zones:
// - Public: /, /[slug] — no auth required
// - Host: /dashboard/* — requires Google OAuth session
// - Customer: /workspace/* — requires magic link session
// - API/Webhooks: /api/webhooks/* — signature verification, no Supabase auth

export { proxy } from "@/lib/supabase/middleware"
