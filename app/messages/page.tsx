"use client";

import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { ChatRoom } from "@/components/chat-room";
import { MotionEffects } from "@/components/motion-effects";
import { products } from "@/lib/products";

export default function MessagesPage() {
  const params = useSearchParams();
  const listingId = params.get("listing") || "marketplace";
  const listing = products.find((item) => item.id === listingId);
  return <><Header/><main className="page-shell"><div className="eyebrow">BUYER · CREATOR</div><h1 className="page-heading">Talk it through.</h1><p className="page-intro">Keep listing questions, delivery details and purchase decisions inside the marketplace.</p><div style={{ marginTop: 24 }}><ChatRoom listingId={listingId} listingTitle={listing?.title ?? "DiscPlace listing"}/></div></main><MotionEffects/></>;
}
