import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyMarketplace } from "@/lib/marketplace-notify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const raw = Buffer.from(await request.arrayBuffer());
  if (!secret || !eventId || !/^[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: "Invalid webhook configuration or signature." }, { status: 400 });
  const expected = createHmac("sha256", secret).update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Payment event storage is not configured." }, { status: 503 });
  const { error: duplicate } = await admin.from("payment_events").insert({ event_id: eventId });
  if (duplicate?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (duplicate) return NextResponse.json({ error: "Could not persist event." }, { status: 503 });
  const event = JSON.parse(raw.toString("utf8")) as { event?: string; payload?: { payment?: { entity?: { order_id?: string; id?: string; status?: string } }; order?: { entity?: { id?: string; notes?: { discplace_order_id?: string } } } } };
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const gatewayOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;
    if (gatewayOrderId) {
      const update = await admin.from("orders").update({ status: "paid", razorpay_payment_id: payment?.id, paid_at: new Date().toISOString() }).eq("razorpay_order_id", gatewayOrderId).eq("status", "pending").select("id,listing_slug,amount_inr,platform_fee_inr").maybeSingle();
      if (update.data) await notifyMarketplace("Payment captured", { listing: update.data.listing_slug, amount: `₹${update.data.amount_inr}`, "platform fee 15%": `₹${update.data.platform_fee_inr}`, order: update.data.id });
    }
  }
  return NextResponse.json({ ok: true });
}
