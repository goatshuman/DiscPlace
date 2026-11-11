import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Sign in to verify this payment." }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!admin || !secret) return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string } | null;
  const orderId = body?.razorpay_order_id ?? "";
  const paymentId = body?.razorpay_payment_id ?? "";
  const signature = body?.razorpay_signature ?? "";
  if (!orderId || !paymentId || !/^[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  const { data: order } = await admin.from("orders").select("id,buyer_id,amount_inr,status").eq("razorpay_order_id", orderId).eq("buyer_id", user.id).maybeSingle();
  if (!order || order.status !== "pending") return NextResponse.json({ error: "Order not found or already processed." }, { status: 404 });
  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${secret}`).toString("base64")}` }, cache: "no-store" });
  const payment = await paymentResponse.json().catch(() => null) as { status?: string; amount?: number; order_id?: string } | null;
  if (!paymentResponse.ok || payment?.status !== "captured" || payment.order_id !== orderId || payment.amount !== order.amount_inr * 100) return NextResponse.json({ error: "Payment isn’t captured yet. Don’t retry until your bank confirms its status." }, { status: 409 });
  await admin.from("orders").update({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() }).eq("id", order.id);
  return NextResponse.json({ ok: true });
}
