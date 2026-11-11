"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, CircleHelp, PackagePlus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Header } from "@/components/header";
import { MotionEffects } from "@/components/motion-effects";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice, type Product } from "@/lib/products";

type Order = { id: string; listing_slug: string; amount_inr: number; platform_fee_inr: number; seller_payout_inr: number; status: string; created_at: string };
export default function Admin() {
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [deleting, setDeleting] = useState("");
  const [notice, setNotice] = useState("Seller dashboard requires Google sign-in and Supabase configuration.");
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNotice("Google sign-in and Supabase are not configured yet. Set them up to manage listings."); setLoading(false); return;
    }
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNotice("Sign in with Google to see your listings, checkout attempts and sales."); setLoading(false); return; }
      setUserId(user.id);
      const [listingResult, orderResult] = await Promise.all([
        supabase.from("products").select("slug,title,description,category,product_type,price_inr,tags,image_path").eq("seller_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("id,listing_slug,amount_inr,platform_fee_inr,seller_payout_inr,status,created_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(40),
      ]);
      if (listingResult.data) setListings(listingResult.data.map((row) => ({ id: row.slug, title: row.title, description: row.description, category: row.category, type: row.product_type === "setup_service" ? "Setup service" : "Blueprint", price: row.price_inr, tags: row.tags ?? [], rating: 0, reviews: 0, includes: [], gradient: "from-violet-600/40 to-indigo-950", icon: "✦", delivery: "Seller arranged", ownerId: user.id, imagePath: row.image_path, imageUrl: row.image_path ? supabase.storage.from("listing-images").getPublicUrl(row.image_path).data.publicUrl : undefined })));
      if (orderResult.data) setOrders(orderResult.data as Order[]);
      setNotice(listingResult.error || orderResult.error ? "Some dashboard data couldn’t load. Apply the Supabase marketplace schema and sign in again." : "Your live catalogue and checkout activity are shown below."); setLoading(false);
    })();
  }, []);
  const filtered = useMemo(() => listings.filter((item) => `${item.title} ${item.category} ${(item.tags ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [listings, query]);
  const paidOrders = orders.filter((order) => order.status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + order.seller_payout_inr, 0);
  const fees = paidOrders.reduce((sum, order) => sum + order.platform_fee_inr, 0);
  const deleteListing = async (product: Product) => {
    if (!window.confirm(`Remove “${product.title}” from the marketplace?`)) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !userId || product.ownerId !== userId) { setNotice("Only the signed-in owner can remove this listing."); return; }
    setDeleting(product.id);
    const { error } = await supabase.from("products").delete().eq("slug", product.id).eq("seller_id", userId);
    if (error) setNotice("Could not remove this listing. Apply the latest Supabase delete policy and try again.");
    else {
      if (product.imagePath) await supabase.storage.from("listing-images").remove([product.imagePath]);
      setListings((current) => current.filter((item) => item.id !== product.id)); setNotice("Listing removed from the marketplace.");
    }
    setDeleting("");
  };

  return <><Header/><main className="page-shell">
    <div className="seller-titlebar"><div><div className="eyebrow">SELLER STUDIO</div><h1 className="page-heading">Your work, <span className="gradient">in motion.</span></h1><p className="page-intro">Manage listings and follow checkout activity from one place.</p></div><Link href="/#explore" className="btn"><PackagePlus size={14}/> Create a listing</Link></div>
    <div className="seller-commission"><Bell size={15}/><div><strong>Simple commission</strong><span>DiscPlace keeps 15% of each paid order. You receive 85% after your verified payout account is connected. No off-platform payment details or QR uploads.</span></div></div>
    <p className="seller-notice">{notice} {!userId && <Link href="/login?next=%2Fadmin" style={{ marginLeft: 8 }}>Sign in</Link>}</p>
    <div className="seller-stat-grid" data-reveal><article className="glass seller-stat"><span>Your listings</span><strong>{loading ? "…" : listings.length}</strong><small>Published and draft items</small></article><article className="glass seller-stat"><span>Paid orders</span><strong>{loading ? "…" : paidOrders.length}</strong><small>Verified checkout payments</small></article><article className="glass seller-stat"><span>Your net sales</span><strong>{loading ? "…" : formatPrice(revenue)}</strong><small>After the 15% fee · platform fees {formatPrice(fees)}</small></article></div>
    <div className="seller-workspace">
      <section className="glass seller-pane" id="listings"><div className="seller-toolbar"><div><h2>Your listings</h2><div className="muted" style={{ fontSize: 9, marginTop: 4 }}>{filtered.length} shown</div></div><Link href="/#explore" className="btn btn-secondary"><PackagePlus size={13}/> New listing</Link></div><label className="market-search seller-search"><Search className="market-search-icon" size={14}/><input className="field" placeholder="Search title or tags…" aria-label="Search your listings" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
        {filtered.length ? filtered.map((product) => <div className="listing-row" key={product.id}><div className="listing-thumb" style={product.imageUrl ? { backgroundImage: `url("${product.imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{product.imageUrl ? "" : product.icon}</div><div><Link href={`/products/${product.id}`}><strong>{product.title} <ArrowUpRight size={11} style={{ verticalAlign: "-1px" }}/></strong></Link><small>{product.category} · {(product.tags ?? []).slice(0,3).map((tag) => `#${tag}`).join(" ")}</small></div><span className="listing-status">LIVE</span><strong className="listing-price">{formatPrice(product.price)}</strong><button type="button" className="icon-button" aria-label={`Remove ${product.title}`} disabled={deleting === product.id} onClick={() => deleteListing(product)}><Trash2 size={14}/></button></div>) : <div className="empty-state seller-empty"><div className="empty-orb"><PackagePlus size={18}/></div><h3>No listings to show.</h3><p>Create a listing from the marketplace to get started.</p><Link className="btn" href="/#explore">Open marketplace</Link></div>}
      </section>
      <section className="glass seller-pane" id="orders"><div className="seller-toolbar"><div><h2>Checkout activity</h2><div className="muted" style={{ fontSize: 9, marginTop: 4 }}>Payment attempts and confirmed sales</div></div><CircleHelp size={15} className="muted"/></div>
        {orders.length ? orders.map((order) => <div className="order-row" key={order.id}><div><strong>{order.listing_slug}</strong><small>{new Date(order.created_at).toLocaleString()}</small></div><span className={`order-status ${order.status}`}>{order.status}</span><div className="order-amount"><strong>{formatPrice(order.amount_inr)}</strong><small>fee {formatPrice(order.platform_fee_inr)}</small></div></div>) : <div className="empty-state seller-empty"><div className="empty-orb"><ShoppingBag size={18}/></div><h3>No checkout activity yet.</h3><p>New checkouts appear here after the payment and listing backend are configured.</p></div>}
      </section>
    </div>
    <p className="checkout-disclaimer" style={{ marginTop: 18 }}>Payments and seller payouts stay disabled until Supabase, Google OAuth, Razorpay Route and your linked merchant settlement account are configured. The UPI ID alone can’t split and settle marketplace payments.</p>
  </main><MotionEffects/></>;
}
