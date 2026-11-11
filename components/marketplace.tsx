"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Plus, Search, ShieldAlert, Sparkles, X } from "lucide-react";
import { products, categories, formatPrice, type Product } from "@/lib/products";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProductCard } from "./product-card";
import { useToast } from "./toast-provider";

type Collection = "all" | "fresh" | "blueprints";
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [warning, setWarning] = useState("");
  const showToast = useToast();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.from("products").select("slug,title,description,category,product_type,price_inr,tags,seller_id,image_path").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => {
      if (!data) return;
      void (async () => {
        const slugs = data.map((row) => row.slug);
        const ratingResult = slugs.length ? await supabase.from("ratings").select("listing_slug,rating").in("listing_slug", slugs) : { data: [] };
        const aggregate = new Map<string, { total: number; count: number }>();
        for (const row of ratingResult.data ?? []) {
          const current = aggregate.get(row.listing_slug) ?? { total: 0, count: 0 };
          aggregate.set(row.listing_slug, { total: current.total + row.rating, count: current.count + 1 });
        }
        setUserListings(data.map((row) => {
          const stats = aggregate.get(row.slug) ?? { total: 0, count: 0 };
          return { id: row.slug, title: row.title, description: row.description, category: row.category, type: row.product_type === "setup_service" ? "Setup service" : "Blueprint", price: row.price_inr, tags: row.tags ?? [], rating: stats.count ? stats.total / stats.count : 0, reviews: stats.count, includes: [], gradient: "from-violet-600/40 to-indigo-950", icon: "✦", delivery: "Seller arranged", ownerId: row.seller_id, imagePath: row.image_path, imageUrl: row.image_path ? supabase.storage.from("listing-images").getPublicUrl(row.image_path).data.publicUrl : undefined };
        }));
      })();
    });
  }, []);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(""); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

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
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { window.location.assign("/login?next=%2F%23explore"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.assign("/login?next=%2F%23explore"); return; }
    const tags = [...new Set(draft.tags.split(",").map((value) => value.trim().replace(/^#/, "").toLowerCase()).filter(Boolean))].slice(0, 8);
    if (unsafePaymentText.test(`${draft.title} ${draft.description} ${draft.tags}`)) {
      setWarning("Listings can’t include payment handles, phone numbers, payment links or QR codes. Use DiscPlace checkout. Unsafe listings are blocked and may be removed.");
      return;
    }
    const price = Number(draft.price);
    if (!draft.title.trim() || !draft.description.trim() || !Number.isInteger(price) || price < 1 || tags.length === 0 || !photoFile) return;
    if (!/^image\/(png|jpeg|webp)$/.test(photoFile.type) || photoFile.size > 8 * 1024 * 1024) {
      setWarning("Choose a PNG, JPG or WebP photo under 8 MB."); return;
    }
    const item: Product = {
      id: `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`,
      title: draft.title.trim().slice(0, 64), description: draft.description.trim().slice(0, 480),
      price, category: draft.category, tags, rating: 0, reviews: 0, includes: ["Digital community resource", "Seller messaging through DiscPlace"],
      gradient: "from-violet-600/40 to-indigo-950", icon: "✦", delivery: "Seller arranged", type: "Blueprint",
    };
    const { data: profile } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).maybeSingle();
    if (profile?.is_suspended) { setWarning("This account can’t publish listings because of an off-platform payment safety restriction."); return; }
    const extension = photoFile.type === "image/jpeg" ? "jpg" : photoFile.type.split("/")[1];
    const imagePath = `${user.id}/${item.id}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("listing-images").upload(imagePath, photoFile, { contentType: photoFile.type, upsert: false });
    if (uploadError) { setWarning(uploadError.message.includes("Bucket not found") ? "Listing photo storage is not set up yet. Apply the latest supabase/schema.sql, then try again." : "Photo upload failed. Check the file and try again."); return; }
    const { data, error } = await supabase.from("products").insert({ slug: item.id, title: item.title, description: item.description, category: item.category, product_type: "blueprint", price_inr: item.price, tags, image_path: imagePath, seller_id: user.id, is_published: true }).select("slug,title,description,category,product_type,price_inr,tags,seller_id,image_path").single();
    if (error || !data) { await supabase.storage.from("listing-images").remove([imagePath]); setWarning(error?.message ?? "Listing could not be published."); return; }
    setUserListings((current) => [{ ...item, id: data.slug, title: data.title, description: data.description, category: data.category, price: data.price_inr, tags: data.tags ?? tags, ownerId: data.seller_id, imagePath: data.image_path, imageUrl: supabase.storage.from("listing-images").getPublicUrl(data.image_path).data.publicUrl }, ...current]);
    setShowComposer(false);
    setPhotoFile(null);
    setDraft({ title: "", description: "", price: "", category: "Community", tags: "" });
    setCollection("fresh"); setCategory("All"); setTag(""); setQuery("");
    showToast("Your listing is live in the marketplace.");
  };

  const beginCreate = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
    if (!user) { window.location.assign("/login?next=%2F%23explore"); return; }
    setWarning(""); setShowComposer(true);
  };

  return <section id="explore" className="market-section" data-reveal>
    <div className="shell">
      <div className="market-head"><div><div className="eyebrow">THE DISCPLACE MARKET</div><h2>Good stuff, made by <span className="gradient">your people.</span></h2><p>Find the right kit. Ask the maker. Make it yours.</p></div><div className="market-head-actions"><span className="market-total">{filtered.length} {filtered.length === 1 ? "listing" : "listings"}</span><button type="button" className="btn" onClick={beginCreate}><Plus size={15}/> Create listing</button></div></div>
      <div className="market-tools"><label className="market-search"><Search className="market-search-icon" size={16}/><input className="field" aria-label="Search listings and tags" placeholder="Search kits, services, tags…" value={query} onChange={(event) => setQuery(event.target.value)}/></label><div className="filter-row" role="group" aria-label="Filter by category">{categories.map((item) => <button key={item} type="button" className={`filter-pill ${category === item ? "active" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="market-search-icon" htmlFor="sort-products" aria-label="Sort listings"><ArrowDownUp size={14}/></label><select id="sort-products" className="field sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="featured">Featured</option><option value="fresh">Newest</option><option value="reviews">Most reviewed</option><option value="rating">Top rated</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>
      <div className="collection-tabs" role="tablist" aria-label="Listing collections"><button className={`collection-tab ${collection === "all" ? "active" : ""}`} role="tab" aria-selected={collection === "all"} type="button" onClick={() => setCollection("all")}><Sparkles size={12} style={{ display: "inline", marginRight: 5 }}/>ALL LISTINGS</button><button className={`collection-tab ${collection === "fresh" ? "active" : ""}`} role="tab" aria-selected={collection === "fresh"} type="button" onClick={() => { setCollection("fresh"); setSortBy("fresh"); }}>FRESH DROPS</button><button className={`collection-tab ${collection === "blueprints" ? "active" : ""}`} role="tab" aria-selected={collection === "blueprints"} type="button" onClick={() => setCollection("blueprints")}>BLUEPRINTS</button></div>
      {tag && <button type="button" className="active-tag-filter" onClick={() => setTag("")}>#{tag} <X size={12}/></button>}
      {filtered.length > 0 ? <div className="product-grid product-grid-layout">{filtered.map((product) => <ProductCard key={product.id} product={product} onTag={setTag}/>)}</div> : <div className="empty-state"><div className="empty-orb">⌕</div><h3>No listings match that search.</h3><p>Try a different phrase or clear the filters.</p><button className="btn btn-secondary" onClick={() => { setCategory("All"); setQuery(""); setTag(""); }}>Clear filters</button></div>}
      <p className="market-demo-note"><ShieldAlert size={13}/> {!process.env.NEXT_PUBLIC_SUPABASE_URL ? "Google sign-in and live listings are being configured. Sign-in is required to publish, and no sample listings are shown." : "Sign in is required to publish. Listings are shared from the live marketplace catalogue."}</p>
    </div>
    {showComposer && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowComposer(false); }}><section className="glass listing-modal" role="dialog" aria-modal="true" aria-labelledby="listing-modal-title"><div className="seller-toolbar"><div><div className="eyebrow">SELL ON DISCPLACE</div><h2 id="listing-modal-title">Create a listing</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setShowComposer(false)}><X size={17}/></button></div><p className="muted listing-modal-copy">Give buyers the details up front. Don’t add payment handles, phone numbers, external QR codes or off-platform payment instructions.</p>{warning && <div className="warning-banner" role="alert"><ShieldAlert size={15}/>{warning}</div>}<form onSubmit={publish} className="listing-form"><label>Listing title<input autoFocus maxLength={64} required className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Creator community starter kit"/></label><label>Description<textarea maxLength={480} required className="field" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What does the buyer get?" rows={4}/></label><div className="listing-form-row"><label>Price (INR)<input type="number" min="1" step="1" required className="field" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="999"/></label><label>Category<select className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Search tags <span className="muted">(comma separated)</span><input required className="field" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="onboarding, gaming, moderation"/></label><label>Listing photo <span className="muted">(4:3 aspect ratio · 1200 × 900 px recommended)</span><input className="field" type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => { const file = event.target.files?.[0] ?? null; setPhotoFile(file); setWarning(file && file.size > 8 * 1024 * 1024 ? "Choose a photo under 8 MB." : ""); }}/></label>{photoPreview && <div className="listing-photo-preview" style={{ backgroundImage: `url("${photoPreview}")` }} role="img" aria-label="Selected listing photo preview"/>}<div className="checkout-safe"><ShieldAlert size={15}/> Upload a product photo only. Don’t upload QR codes or private payment details. Listings that push off-platform payments can be removed.</div><button className="btn" type="submit"><Plus size={14}/> Publish listing</button></form></section></div>}
  </section>;
}
