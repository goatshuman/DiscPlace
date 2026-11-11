# DiscPlace

DiscPlace is a Next.js marketplace for community blueprints, setup services and creator listings. The storefront includes tag search, seller listing creation, 0–5 ratings, listing chat, a seller activity dashboard, safety warnings, and CSS 3D artwork.

## Run locally

1. Install Node.js 20.9+ and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Run `npm run dev` and open `http://localhost:3000`.

Without backend credentials the storefront stays empty and read-only: it will not invent listings, accept local-only listings, or show fake chat/reviews. Sign-in is required before publishing, messaging or checkout.

## Configure Google sign-in and shared listings/chat

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor. This creates the catalogue tables, RLS rules and public `listing-images` storage bucket.
2. In Google Cloud Console, create an OAuth web client. Add the Supabase callback URL shown in Supabase → Authentication → Providers → Google as an authorized redirect URI. Paste the client ID and secret into that Google provider in Supabase and enable it.
3. In Supabase → Authentication → URL Configuration, set the site URL to `https://disc-place.vercel.app` and allow `https://disc-place.vercel.app/auth/callback` plus `http://localhost:3000/auth/callback` for local development.
4. In Vercel → DiscPlace → Settings → Environment Variables, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Supabase → Project Settings → API. The service role key must stay server-only.
5. Redeploy the Vercel project after setting the variables. Google sign-in returns users to their original marketplace page.

Google sign-in uses the Supabase SSR cookie flow. Listing writes, owner deletes, chat and reviews use database RLS. Sellers must upload a product photo (4:3 recommended, 1200 × 900 px, PNG/JPG/WebP, up to 8 MB). A buyer can rate a listing after a paid order. Messages and listing text that include payment handles, payment links or phone numbers are rejected; accounts are restricted and existing listings unpublished when the database safety trigger detects this content. The listing form warns against QR/payment images; image contents are not automatically OCR-scanned.

## Configure payments and notifications

1. Activate Razorpay Route and complete merchant verification. Route/split payouts require Razorpay to approve the platform and linked accounts; a UPI VPA by itself cannot receive a split settlement.
2. Onboard each seller as a Razorpay linked account and store its account ID in `seller_payouts`. DiscPlace retains 15% and routes the remaining 85% to the linked seller account.
3. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to Vercel. Configure `https://disc-place.vercel.app/api/webhooks/razorpay` for `payment.captured` and `order.paid`.
4. Set `DISCORD_ORDER_WEBHOOK_URL` as a server-only Vercel environment variable to receive checkout-started and paid-order notifications. If the webhook URL previously shared in chat is still active, rotate it before adding the new URL.
5. Redeploy. Checkout deliberately reports unavailable until the database, server keys, and the specific seller's linked payout account are present. The platform's 15% share settles to the verified merchant settlement account, not directly to a UPI ID.

Never place payment credentials in browser code or this repository. Use `.env.example` for variable names; keep actual values in Vercel's encrypted environment settings.

## Deploy

Push the project to GitHub and import that repository into Vercel as a Next.js project. Add the server environment variables above in Vercel before enabling sign-in or live checkout. See the [Supabase Google provider guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [Razorpay Route](https://razorpay.com/route/) for account activation and provider setup.

## Scope

DiscPlace lists digital community resources and setup services. It does not broker Discord server ownership. It is an independent marketplace and is not affiliated with Discord.
