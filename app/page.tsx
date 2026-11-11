import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Compass, Layers3, ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Marketplace } from "@/components/marketplace";
import { MotionEffects } from "@/components/motion-effects";

const steps = [
  { number: "01", title: "Find the right fit", description: "Search by category and tags to find the exact tool or setup your community needs." },
  { number: "02", title: "Buy with clarity", description: "See the price, deliverables, seller rating and safety notes before checkout." },
  { number: "03", title: "Share your craft", description: "Publish your own listing, talk with buyers and build a reputation through reviews." },
];

export default function Home() {
  return <><Header/><main>
    <Hero/>
    <div className="trust-strip"><div className="shell trust-inner"><span><Compass size={13}/> Curated marketplace</span><b>Good work deserves a good place to be found.</b><span><Layers3 size={13}/> Kits, services &amp; tools</span><span><ShieldCheck size={13}/> Safer checkout</span></div></div>
    <Marketplace/>
    <section id="how-it-works" className="shell how-section" data-reveal><div className="eyebrow">BUY BETTER · SELL TOGETHER</div><h2 className="section-title">Good ideas move<br/>when <span className="gradient">people connect.</span></h2><p className="section-lede">Browse useful community products, compare the details, and talk to the person who made them.</p><div className="steps-grid">{steps.map((step, index) => <article className="glass step-card" key={step.number} data-reveal style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}><div className="step-number">{step.number} / 03</div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div></section>
    <section className="shell seller-cta" id="sell" data-reveal><div className="glass seller-box"><div><div className="eyebrow">YOUR WORK, YOUR STORE</div><h2>Have something people in your community need?</h2><p>Build a listing with a clear price, useful tags and the details buyers want up front.</p></div><Link href="/admin" className="btn">Create a listing <ArrowRight size={15}/></Link></div></section>
  </main><footer className="site-footer"><div className="shell footer-inner"><div><div className="footer-brand">Disc<span className="gradient">Place</span></div><div className="footer-meta" style={{ marginTop: 5 }}>© 2026 · Independent community marketplace · Not affiliated with Discord</div></div><div className="footer-links"><Link href="/#explore">Explore</Link><Link href="/admin">For sellers</Link><Link href="/cart">Your cart</Link></div></div></footer><MotionEffects/></>;
}
