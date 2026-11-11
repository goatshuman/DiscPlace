"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock3, MessageCircle, ShieldAlert, ShieldCheck, ShoppingBag, Sparkles, Star, X } from "lucide-react";
import { Header } from "@/components/header";
import { ProductArt, ProductPalette } from "@/components/product-art";
import { ProductCard } from "@/components/product-card";
import { MotionEffects } from "@/components/motion-effects";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";
import { products, formatPrice, type Product } from "@/lib/products";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const seeded = products.find((item) => item.id === params.id);
  const [dynamicProduct, setDynamicProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmBuy, setConfirmBuy] = useState(false);
  const { add } = useCart();
  const showToast = useToast();
  useEffect(() => {
    if (seeded) return;
    const supabase = createSupabaseBrowserClient();
    if (supabase) void supabase.from("products").select("slug,title,description,category,product_type,price_inr,tags").eq("slug", params.id).eq("is_published", true).maybeSingle().then(({ data }) => {
      if (data) setDynamicProduct({ id: data.slug, title: data.title, description: data.description, category: data.category, type: data.product_type === "setup_service" ? "Setup service" : "Blueprint", price: data.price_inr, tags: data.tags ?? [], rating: 0, reviews: 0, includes: [], gradient: "from-violet-600/40 to-indigo-950", icon: "✦", delivery: "Seller arranged" }); else setNotFound(true);
    });
    else try { const saved = JSON.parse(localStorage.getItem("discplace-user-listings-v1") || "[]") as Product[]; const item = saved.find((value) => value.id === params.id); if (item) setDynamicProduct(item); else setNotFound(true); } catch { setNotFound(true); }
  }, [params.id, seeded]);

  const product = seeded ?? dynamicProduct;
  if (!product) return <><Header/><main className="page-shell"><h1 className="page-heading">{notFound ? "Listing not found." : "Loading listing…"}</h1><Link href="/#explore" className="btn">Back to marketplace</Link></main></>;
  const related = products.filter((item) => item.id !== product.id).slice(0, 3);
  const includes = product.includes.length ? product.includes : ["Details and delivery coordinated with the seller", "Message the creator before you buy", "Checkout and payment activity stay on DiscPlace"];
  return <><Header/><main className="page-shell">
    <Link href="/#explore" className="crumb"><ArrowLeft size={13}/> Back to marketplace</Link>
    <div className="product-detail">
      <div data-reveal><ProductArt product={product} detail/><section className="glass included-card"><div className="eyebrow">WHAT YOU GET</div><ul className="included-list">{includes.map((item) => <li key={item}><Check size={15}/>{item}</li>)}</ul><div className="detail-tags">{(product.tags ?? []).map((tag) => <span key={tag}>#{tag}</span>)}</div></section></div>
      <aside className="glass purchase-card" style={ProductPalette({ product })}>
        <div className="eyebrow">{product.category} &nbsp;·&nbsp; {product.type}</div>
        <h1>{product.title}</h1><p className="detail-description">{product.description}</p>
        <div className="detail-rating"><Star size={13} fill="currentColor"/> {product.rating.toFixed(1)} <span className="muted">· {product.reviews} ratings</span></div>
        <div className="purchase-price"><strong>{formatPrice(product.price)}</strong>{product.compareAt && <del>{formatPrice(product.compareAt)}</del>}</div>
        <button className="btn" style={{ width: "100%", padding: 15 }} onClick={() => setConfirmBuy(true)}><ShoppingBag size={15}/> Buy safely</button>
        <Link href={`/messages?listing=${encodeURIComponent(product.id)}`} className="btn btn-secondary" style={{ width: "100%", marginTop: 9 }}><MessageCircle size={14}/> Message seller</Link>
        <div className="assurance"><span><Clock3 size={14}/>{product.delivery}</span><span><ShieldCheck size={14}/>Keep payment inside DiscPlace</span></div>
        <p className="checkout-disclaimer">Never send QR or UPI payments to a seller. Use DiscPlace checkout so your order is recorded.</p>
        <div className="seller-mini"><div className="seller-avatar"><Sparkles size={15}/></div><div><strong>{product.seller ?? "Independent creator"}</strong><small>DiscPlace marketplace seller</small></div></div>
      </aside>
    </div>
    <section className="section" data-reveal><div className="eyebrow">KEEP EXPLORING</div><h2 className="section-title">More good <span className="gradient">finds.</span></h2><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item}/>)}</div></section>
    {confirmBuy && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmBuy(false); }}><section className="glass safety-modal" role="dialog" aria-modal="true"><button className="icon-button safety-close" type="button" aria-label="Close" onClick={() => setConfirmBuy(false)}><X size={16}/></button><div className="empty-cart-icon"><ShieldAlert size={24}/></div><div className="eyebrow">BEFORE YOU BUY</div><h2>Keep your purchase on DiscPlace.</h2><p>Don’t pay by QR code, UPI handle or outside link. Payments outside the app aren’t protected. Unsafe listings and accounts may be removed.</p><div className="safety-actions"><button className="btn btn-secondary" onClick={() => setConfirmBuy(false)}>Go back</button><button className="btn" onClick={() => { add(product); showToast(`${product.title} added to your cart`); setConfirmBuy(false); }}>I understand <ShoppingBag size={13}/></button></div></section></div>}
  </main><MotionEffects/></>;
}
