import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyMarketplace } from "@/lib/marketplace-notify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Sign in with Google to check out." }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "The marketplace database is not configured yet." }, { status: 503 });

  const body = await request.json().catch(() => null) as { listingSlug?: string; quantity?: number } | null;
  const slug = body?.listingSlug?.trim();
  const quantity = Number(body?.quantity ?? 1);
  if (!slug || slug.length > 100) return NextResponse.json({ error: "Choose a valid listing." }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return NextResponse.json({ error: "Choose a valid quantity." }, { status: 400 });

  const { data: listing } = await admin.from("products").select("slug,title,price_inr,seller_id,is_published").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!listing) return NextResponse.json({ error: "This listing is no longer available." }, { status: 404 });
  if (listing.seller_id === user.id) return NextResponse.json({ error: "You can’t purchase your own listing." }, { status: 400 });
  const { data: profile } = await admin.from("profiles").select("is_suspended").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_suspended) return NextResponse.json({ error: "This account can’t make purchases." }, { status: 403 });

  const total = Number(listing.price_inr) * quantity;
  const fee = Math.round(Number(listing.price_inr) * 0.15) * quantity;
  const sellerPayout = total - fee;
  await notifyMarketplace("Checkout started", { listing: listing.title, amount: `₹${total}`, "platform fee 15%": `₹${fee}`, "seller payout": `₹${sellerPayout}` });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ error: "Secure payment checkout is not configured yet. No payment was taken." }, { status: 503 });

  const { data: payout } = await admin.from("seller_payouts").select("razorpay_linked_account_id").eq("seller_id", listing.seller_id).maybeSingle();
  if (!payout?.razorpay_linked_account_id) return NextResponse.json({ error: "This seller’s protected payout account is not connected yet. No payment was taken." }, { status: 409 });

  const { data: order, error: saveError } = await admin.from("orders").insert({ buyer_id: user.id, buyer_email: user.email ?? "", seller_id: listing.seller_id, listing_slug: listing.slug, quantity, amount_inr: total, platform_fee_inr: fee, seller_payout_inr: sellerPayout, status: "pending" }).select("id").single();
  if (saveError || !order) return NextResponse.json({ error: "Could not reserve this order. Please try again." }, { status: 500 });

  const gateway = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}` }, cache: "no-store",
    body: JSON.stringify({ amount: total * 100, currency: "INR", receipt: order.id, notes: { discplace_order_id: order.id, listing_slug: listing.slug }, transfers: [{ account: payout.razorpay_linked_account_id, amount: sellerPayout * 100, currency: "INR", notes: { order_id: order.id, fee_percent: "15" } }] }),
  });
  const result = await gateway.json().catch(() => null) as { id?: string } | null;
  if (!gateway.ok || !result?.id) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json({ error: "The payment provider couldn’t create checkout. No payment was taken." }, { status: 502 });
  }
  await admin.from("orders").update({ razorpay_order_id: result.id }).eq("id", order.id);
  return NextResponse.json({ keyId: process.env.RAZORPAY_KEY_ID, orderId: result.id, amount: total * 100, currency: "INR", name: "DiscPlace", description: listing.title, internalOrderId: order.id, email: user.email ?? "" });
}
