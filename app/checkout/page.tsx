"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, ShoppingBag } from "lucide-react";
import { Header } from "@/components/header";
import { MotionEffects } from "@/components/motion-effects";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/products";
import { CheckoutButton } from "@/components/checkout-button";

export default function Checkout() {
  const { items, total } = useCart();
  return <><Header/><main className="page-shell" style={{ maxWidth: 1050 }}>
    <div className="eyebrow">PROTECTED MARKETPLACE CHECKOUT</div><h1 className="page-heading">Review your<br/><span className="gradient">purchase.</span></h1>
    <div className="checkout-steps" aria-label="Checkout progress"><div className="checkout-step"><span>✓</span> CART</div><div className="checkout-line"/><div className="checkout-step active"><span>2</span> REVIEW</div><div className="checkout-line"/><div className="checkout-step"><span><LockKeyhole size={10}/></span> PAYMENT</div></div>
    {!items.length ? <div className="glass empty-cart"><div className="empty-cart-icon"><ShoppingBag size={27}/></div><h2>Nothing to check out yet.</h2><p>Choose a marketplace listing and add it to your cart.</p><Link className="btn" href="/#explore">Browse listings <ArrowRight size={14}/></Link></div> : <div className="checkout-layout" data-reveal>
      <section className="glass checkout-panel"><h2>Order review</h2>{items.map(({ product, qty }) => <div className="summary-row" key={product.id} style={{ paddingBlock: 11, borderBottom: "1px solid #ffffff10" }}><span>{product.title} <span className="muted">× {qty}</span></span><strong style={{ color: "#f3efff" }}>{formatPrice(product.price * qty)}</strong></div>)}<div className="summary-total"><span>Cart total</span><span>{formatPrice(total)}</span></div><div className="checkout-safe"><ShieldCheck size={15}/> Pay only through DiscPlace. Seller QR codes, UPI handles and off-platform payment links are blocked.</div><p className="checkout-disclaimer">The marketplace keeps a 15% fee from the seller’s payout. Each listing is paid separately so the correct seller gets their share.</p><Link href="/cart" className="crumb" style={{ marginTop: 12 }}><ArrowLeft size={12}/> Return to your cart</Link></section>
      <aside className="glass summary-card"><h2>Secure checkout</h2><p className="page-intro" style={{ fontSize: 10 }}>Confirm the safety notice before each checkout. Payment choices, including UPI apps, depend on the payment provider.</p>{items.map(({ product, qty }) => <div className="checkout-pay-item" key={product.id}><div><strong>{product.title}</strong><small>{formatPrice(product.price * qty)} · {qty} {qty === 1 ? "item" : "items"}</small></div><CheckoutButton product={product} quantity={qty}/></div>)}<p className="summary-note">Google sign-in, Supabase and Razorpay credentials must be configured before live checkout works.</p></aside>
    </div>}
  </main><MotionEffects/></>;
}
