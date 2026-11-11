# DiscPlace

DiscPlace is a Next.js marketplace for community blueprints, setup services and creator listings. The storefront includes tag search, seller listing creation, 0–5 ratings, listing chat, a seller activity dashboard, safety warnings, and CSS 3D artwork.

## Run locally

1. Install Node.js 20.9+ and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Run `npm run dev` and open `http://localhost:3000`.

Without backend credentials the site runs in preview mode. Listings and chat are kept in the current browser only. Payments never report fake success.

## Configure Google sign-in and shared listings/chat

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. In Supabase Auth, enable Google and add the Supabase callback URL to the Google OAuth client.
3. Add the project URL and anon key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Add the service role key as `SUPABASE_SERVICE_ROLE_KEY`. Keep it server-only.

Google sign-in uses the Supabase SSR cookie flow. Listing writes, chat and reviews use database RLS. A buyer can rate a listing after a paid order. Messages and listings that include payment handles, payment links or phone numbers are rejected; accounts are restricted and existing listings unpublished when the database safety trigger detects this content. QR uploads are not supported.

## Configure payments and notifications

1. Activate Razorpay Route for marketplace splits and complete merchant verification.
2. Onboard each seller as a Razorpay linked account. DiscPlace retains 15% and routes the remaining 85% to the linked seller account.
3. Add the Razorpay key ID, secret and webhook secret to server environment variables. Configure `https://YOUR_DOMAIN/api/webhooks/razorpay` for `payment.captured` and `order.paid`.
4. Set `DISCORD_ORDER_WEBHOOK_URL` as a server-only Vercel environment variable to receive checkout-started and paid-order notifications.

The platform’s 15% share settles through its verified Razorpay merchant settlement account. A UPI ID by itself cannot receive Razorpay Route split settlements; link the merchant bank account associated with the UPI ID. Never place payment credentials in browser code or this repository.

## Deploy

Push the project to GitHub and import that repository into Vercel as a Next.js project. Add the server environment variables above in Vercel before enabling sign-in or live checkout. See the [Supabase Google provider guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [Razorpay Route](https://razorpay.com/route/) for account activation and provider setup.

## Scope

DiscPlace lists digital community resources and setup services. It does not broker Discord server ownership. It is an independent marketplace and is not affiliated with Discord.
