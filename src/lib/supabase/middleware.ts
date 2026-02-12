// Supabase session refresh helper for proxy.ts
// Will be implemented in Story 1.3: Route Protection & Dashboard Shell

import { type NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  // TODO: Implement Supabase session refresh and route protection
  // Route zones:
  // - Public: /, /[slug] — no auth required
  // - Host: /dashboard/* — requires Google OAuth session
  // - Customer: /workspace/* — requires magic link session
  // - API/Webhooks: /api/webhooks/* — signature verification, no Supabase auth
  return NextResponse.next()
}
