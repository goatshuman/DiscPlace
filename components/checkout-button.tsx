"use client";

import { useState } from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { formatPrice, type Product } from "@/lib/products";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; } }

export function CheckoutButton({ product, quantity = 1 }: { product: Product; quantity?: number }) {
  const [warningOpen, setWarningOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pay = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingSlug: product.id, quantity }) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "Checkout could not start.");
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Payment checkout failed to load.")); document.body.appendChild(script);
        });
      }
      if (!window.Razorpay) throw new Error("Payment checkout is unavailable.");
      const checkout = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: order.name, description: order.description, order_id: order.orderId, prefill: { email: order.email }, theme: { color: "#a88aff" }, modal: { ondismiss: () => setBusy(false) }, handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const verified = await fetch("/api/checkout/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payment) });
        const result = await verified.json();
        if (!verified.ok) setError(result.error || "Payment is still being verified. Check your orders before retrying.");
        else window.location.assign(`/checkout/success?order=${encodeURIComponent(order.internalOrderId)}`);
        setBusy(false);
      } });
      checkout.open();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not start."); setBusy(false); }
  };
  return <><button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={busy || warningOpen} onClick={pay}>{busy ? "Connecting securely…" : `Pay ${formatPrice(product.price * quantity)}`} <ArrowRight size={14}/></button>{error && <p className="checkout-disclaimer" role="alert">{error}</p>}{warningOpen && <div className="safety-inline"><ShieldAlert size={14}/><div><strong>Before checkout</strong><p>Pay only through DiscPlace. Don’t scan QR codes or send a seller money by UPI, bank transfer or outside link. The seller’s 15% marketplace fee is deducted from their payout; your checkout total is {formatPrice(product.price * quantity)}.</p><button type="button" className="crumb" onClick={() => setWarningOpen(false)}>I understand</button></div></div>}</>;
}
