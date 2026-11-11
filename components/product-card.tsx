"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle, Plus, ShieldAlert, Star, X } from "lucide-react";
import { useEffect, useState, type PointerEvent } from "react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import { useCart } from "./cart-provider";
import { useToast } from "./toast-provider";
import { ProductArt, ProductPalette } from "./product-art";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ProductCard({ product, onTag }: { product: Product; onTag?: (tag: string) => void }) {
  const { add } = useCart();
  const showToast = useToast();
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [myRating, setMyRating] = useState(0);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("ratings").select("rating").eq("listing_slug", product.id).eq("buyer_id", user.id).maybeSingle();
      if (data) setMyRating(data.rating);
    });
  }, [product.id]);
  const tilt = (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    event.currentTarget.style.setProperty("--tilt-x", `${x * 3.2}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${y * -3.2}deg`);
  };
  const resetTilt = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };
  const requireSignIn = () => {
    const next = `/products/${encodeURIComponent(product.id)}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  };
  const beginBuy = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
    if (!user) { requireSignIn(); return; }
    setConfirmBuy(true);
  };
  const addToCart = () => { add(product); setConfirmBuy(false); showToast(`${product.title} added to your cart`); };
  const rate = async (value: number) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { requireSignIn(); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { requireSignIn(); return; }
    const { error } = await supabase.from("ratings").upsert({ listing_slug: product.id, buyer_id: user.id, rating: value }, { onConflict: "listing_slug,buyer_id" });
    if (error) { showToast(error.message.includes("row-level security") ? "Only buyers with a paid order can rate this listing." : "Rating could not be saved."); return; }
    setMyRating(value); showToast(`Your ${value}/5 rating was saved`);
  };
  const tags = product.tags ?? [product.category.toLowerCase(), product.type.toLowerCase()];
  return <article className="product-card" onPointerMove={tilt} onPointerLeave={resetTilt} style={ProductPalette({ product })}>
    <div className="product-visual"><Link href={`/products/${product.id}`} aria-label={`View ${product.title}`}><ProductArt product={product}/></Link>
    {product.badge && <span className="product-badge">{product.badge}</span>}
    <span className="product-type">{product.type}</span></div>
    <div className="product-body">
      <div className="product-category">{product.category}</div>
      <div className="product-name-row"><Link href={`/products/${product.id}`}><h3>{product.title}</h3></Link><ArrowUpRight className="product-arrow" size={14}/></div>
      <p className="product-description">{product.description}</p>
      <div className="product-rating"><Star size={12} fill="currentColor"/> {product.rating.toFixed(1)} <span className="muted">({product.reviews} ratings)</span></div>
      <div className="product-tags" aria-label="Listing tags">{tags.slice(0, 3).map((tag) => <button key={tag} type="button" onClick={() => onTag?.(tag)}>#{tag}</button>)}</div>
      <div className="product-rating-picker" aria-label="Rate this listing from zero to five stars"><span>Your rating</span><span className="rating-buttons">{[1,2,3,4,5].map((value) => <button key={value} type="button" className={myRating >= value ? "selected" : ""} aria-label={`Rate ${value} out of 5`} onClick={() => rate(value)}><Star size={12} fill="currentColor"/></button>)}</span><button type="button" className="rating-zero" onClick={() => rate(0)}>0</button></div>
      <div className="product-bottom"><strong className="product-price">{formatPrice(product.price)}</strong><button className="btn add-button" onClick={beginBuy}><Plus size={13}/> Buy safely</button></div>
      <Link className="listing-chat-link" href={`/messages?listing=${encodeURIComponent(product.id)}`}><MessageCircle size={12}/> Message seller <span>{product.seller ?? "Community creator"}</span></Link>
    </div>
    {confirmBuy && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmBuy(false); }}><section className="glass safety-modal" role="dialog" aria-modal="true" aria-labelledby={`safe-buy-${product.id}`}><button className="icon-button safety-close" type="button" aria-label="Close" onClick={() => setConfirmBuy(false)}><X size={16}/></button><div className="empty-cart-icon"><ShieldAlert size={24}/></div><div className="eyebrow">BEFORE YOU BUY</div><h2 id={`safe-buy-${product.id}`}>Keep your purchase on DiscPlace.</h2><p>Never pay a seller by QR code, UPI ID, bank transfer or outside link. Those payments aren’t protected here. Report off-platform payment requests; unsafe listings may be removed.</p><p className="muted">Seller commission is 15% and comes from the seller’s payout. The checkout will show your full price before you confirm.</p><div className="safety-actions"><button type="button" className="btn btn-secondary" onClick={() => setConfirmBuy(false)}>Go back</button><button type="button" className="btn" onClick={addToCart}>I understand <Plus size={13}/></button></div></section></div>}
  </article>;
}
