"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Plus, Search, ShieldAlert, Sparkles, X } from "lucide-react";
import { products, categories, formatPrice, type Product } from "@/lib/products";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProductCard } from "./product-card";
import { useToast } from "./toast-provider";

type Collection = "all" | "fresh" | "blueprints";
const STORAGE_KEY = "discplace-user-listings-v1";
const unsafePaymentText = /\b(?:upi|gpay|google\s*pay|phonepe|paytm|bank transfer|send money|payment qr|scan (?:this|to pay))\b|\b[\w.-]{2,}@[a-z]{2,}\b|(?:\+?91[\s-]?)?[6-9]\d{9}\b|(?<!\d)\d{9,18}(?!\d)|https?:\/\//i;

export function Marketplace() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [collection, setCollection] = useState<Collection>("all");
  const [userListings, setUserListings] = useState<Product[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", price: "", category: "Community", tags: "" });
  const [warning, setWarning] = useState("");
  const showToast = useToast();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      void supabase.from("products").select("slug,title,description,category,product_type,price_inr,tags,seller_id").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => {
        if (!data) return;
        setUserListings(data.map((row) => ({ id: row.slug, title: row.title, description: row.description, category: row.category, type: row.product_type === "setup_service" ? "Setup service" : "Blueprint", price: row.price_inr, tags: row.tags ?? [], rating: 0, reviews: 0, includes: [], gradient: "from-violet-600/40 to-indigo-950", icon: "✦", delivery: "Seller arranged" })));
      });
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Product[];
        if (Array.isArray(saved)) setUserListings(saved);
      } catch { localStorage.removeItem(STORAGE_KEY); }
    }
  }, []);

  const listings = useMemo(() => [...userListings, ...products], [userListings]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const results = listings.filter((item) => {
      const tags = item.tags ?? [item.category.toLowerCase(), item.type.toLowerCase()];
      const matchesCategory = category === "All" || item.category === category;
      const matchesTag = !tag || tags.some((value) => value.toLowerCase() === tag.toLowerCase());
      const matchesCollection = collection !== "blueprints" || item.type === "Blueprint";
      const matchesQuery = !q || `${item.title} ${item.category} ${item.description} ${item.type} ${tags.join(" ")}`.toLowerCase().includes(q);
      return matchesCategory && matchesTag && matchesCollection && matchesQuery;
    });
    return [...results].sort((a, b) => {
      if (collection === "fresh") return Number(userListings.includes(b)) - Number(userListings.includes(a));
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "reviews") return b.reviews - a.reviews;
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return Number(Boolean(b.badge)) - Number(Boolean(a.badge));
    });
  }, [category, collection, listings, query, sortBy, tag, userListings]);

  const publish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tags = [...new Set(draft.tags.split(",").map((value) => value.trim().replace(/^#/, "").toLowerCase()).filter(Boolean))].slice(0, 8);
    if (unsafePaymentText.test(`${draft.title} ${draft.description} ${draft.tags}`)) {
      setWarning("Listings can’t include payment handles, phone numbers, payment links or QR codes. Use DiscPlace checkout. Unsafe listings are blocked and may be removed.");
      return;
    }
    const price = Number(draft.price);
    if (!draft.title.trim() || !draft.description.trim() || !Number.isInteger(price) || price < 1 || tags.length === 0) return;
    const item: Product = {
      id: `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`,
      title: draft.title.trim().slice(0, 64), description: draft.description.trim().slice(0, 480),
      price, category: draft.category, tags, rating: 0, reviews: 0, includes: ["Digital community resource", "Seller messaging through DiscPlace"],
      gradient: "from-violet-600/40 to-indigo-950", icon: "✦", delivery: "Seller arranged", type: "Blueprint",
    };
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setWarning("Sign in with Google before publishing. Listings will be connected to your account and visible to everyone."); return; }
      const { data: profile } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).maybeSingle();
      if (profile?.is_suspended) { setWarning("This account can’t publish listings because of an off-platform payment safety restriction."); return; }
      const { data, error } = await supabase.from("products").insert({ slug: item.id, title: item.title, description: item.description, category: item.category, product_type: "blueprint", price_inr: item.price, tags, seller_id: user.id, is_published: true }).select("slug,title,description,category,product_type,price_inr,tags").single();
      if (error || !data) { setWarning(error?.message ?? "Listing could not be published."); return; }
      setUserListings((current) => [{ ...item, id: data.slug, title: data.title, description: data.description, category: data.category, price: data.price_inr, tags: data.tags ?? tags }, ...current]);
    } else {
    const next = [item, ...userListings];
    setUserListings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    setShowComposer(false);
    setDraft({ title: "", description: "", price: "", category: "Community", tags: "" });
    setCollection("fresh"); setCategory("All"); setTag(""); setQuery("");
    showToast("Listing added to this browser. Connect your marketplace account to publish it for everyone.");
  };

  return <section id="explore" className="market-section" data-reveal>
    <div className="shell">
      <div className="market-head"><div><div className="eyebrow">THE DISCPLACE MARKET</div><h2>Good stuff, made by <span className="gradient">your people.</span></h2><p>Find the right kit. Ask the maker. Make it yours.</p></div><div className="market-head-actions"><span className="market-total">{filtered.length} {filtered.length === 1 ? "listing" : "listings"}</span><button type="button" className="btn" onClick={() => { setWarning(""); setShowComposer(true); }}><Plus size={15}/> Create listing</button></div></div>
      <div className="market-tools"><label className="market-search"><Search className="market-search-icon" size={16}/><input className="field" aria-label="Search listings and tags" placeholder="Search kits, services, tags…" value={query} onChange={(event) => setQuery(event.target.value)}/></label><div className="filter-row" role="group" aria-label="Filter by category">{categories.map((item) => <button key={item} type="button" className={`filter-pill ${category === item ? "active" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="market-search-icon" htmlFor="sort-products" aria-label="Sort listings"><ArrowDownUp size={14}/></label><select id="sort-products" className="field sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="featured">Featured</option><option value="fresh">Newest</option><option value="reviews">Most reviewed</option><option value="rating">Top rated</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>
      <div className="collection-tabs" role="tablist" aria-label="Listing collections"><button className={`collection-tab ${collection === "all" ? "active" : ""}`} role="tab" aria-selected={collection === "all"} type="button" onClick={() => setCollection("all")}><Sparkles size={12} style={{ display: "inline", marginRight: 5 }}/>ALL LISTINGS</button><button className={`collection-tab ${collection === "fresh" ? "active" : ""}`} role="tab" aria-selected={collection === "fresh"} type="button" onClick={() => { setCollection("fresh"); setSortBy("fresh"); }}>FRESH DROPS</button><button className={`collection-tab ${collection === "blueprints" ? "active" : ""}`} role="tab" aria-selected={collection === "blueprints"} type="button" onClick={() => setCollection("blueprints")}>BLUEPRINTS</button></div>
      {tag && <button type="button" className="active-tag-filter" onClick={() => setTag("")}>#{tag} <X size={12}/></button>}
      {filtered.length > 0 ? <div className="product-grid product-grid-layout">{filtered.map((product) => <ProductCard key={product.id} product={product} onTag={setTag}/>)}</div> : <div className="empty-state"><div className="empty-orb">⌕</div><h3>No listings match that search.</h3><p>Try a different phrase or clear the filters.</p><button className="btn btn-secondary" onClick={() => { setCategory("All"); setQuery(""); setTag(""); }}>Clear filters</button></div>}
      <p className="market-demo-note"><ShieldAlert size={13}/> {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Listings are shared after Google sign-in. Payments require the marketplace payout account to be connected." : "Preview mode saves new listings in this browser. Configure Google login and Supabase to publish listings for everyone."}</p>
    </div>
    {showComposer && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowComposer(false); }}><section className="glass listing-modal" role="dialog" aria-modal="true" aria-labelledby="listing-modal-title"><div className="seller-toolbar"><div><div className="eyebrow">SELL ON DISCPLACE</div><h2 id="listing-modal-title">Create a listing</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setShowComposer(false)}><X size={17}/></button></div><p className="muted listing-modal-copy">Give buyers the details up front. Don’t add payment handles, phone numbers, external QR codes or off-platform payment instructions.</p>{warning && <div className="warning-banner" role="alert"><ShieldAlert size={15}/>{warning}</div>}<form onSubmit={publish} className="listing-form"><label>Listing title<input autoFocus maxLength={64} required className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Creator community starter kit"/></label><label>Description<textarea maxLength={480} required className="field" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What does the buyer get?" rows={4}/></label><div className="listing-form-row"><label>Price (INR)<input type="number" min="1" step="1" required className="field" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="999"/></label><label>Category<select className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Search tags <span className="muted">(comma separated)</span><input required className="field" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="onboarding, gaming, moderation"/></label><div className="checkout-safe"><ShieldAlert size={15}/> No QR uploads or private payment details. Checkout stays on DiscPlace; listings that push off-platform payments can be removed.</div><button className="btn" type="submit"><Plus size={14}/> Publish listing</button></form></section></div>}
  </section>;
}
