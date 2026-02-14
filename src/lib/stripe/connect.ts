import { stripe } from "./client"

/**
 * Generate the Stripe Connect Standard OAuth authorization URL.
 * This is a synchronous call — returns a string, not a promise.
 */
export function getStripeConnectUrl(
  state: string,
  hostEmail?: string
): string {
  return stripe.oauth.authorizeUrl({
    client_id: process.env.STRIPE_CLIENT_ID!,
    response_type: "code",
    scope: "read_write",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/stripe`,
    state,
    stripe_user: hostEmail ? { email: hostEmail } : undefined,
  })
}

/**
 * Exchange an OAuth authorization code for the connected account's stripe_user_id.
 */
export async function exchangeCodeForAccount(
  code: string
): Promise<string> {
  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  })
  return response.stripe_user_id!
}
