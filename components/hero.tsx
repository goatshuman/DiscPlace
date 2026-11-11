"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return <section className="shell hero" id="top">
    <div className="hero-copy" data-reveal>
      <div className="hero-kicker eyebrow"><span className="status-dot" /> THE DISCORD MARKETPLACE <Sparkles size={12} /></div>
      <h1><span className="hero-line">Buy what you</span><span className="hero-line"><span className="gradient">need.</span></span><span className="hero-line">Sell what you</span><span className="hero-line gradient">make.</span></h1>
      <p className="hero-description">Shop practical Discord community resources, message the creators, or publish your own listing with clear tags and pricing.</p>
      <div className="hero-actions"><Link href="#explore" className="btn">Explore listings <ArrowRight size={15} /></Link><Link href="/admin" className="btn btn-secondary">Start selling <ArrowDownRight size={15} /></Link></div>
      <div className="hero-note"><span className="avatar-stack"><span>✦</span><span>◈</span><span>⌘</span></span> BUY WITH CONFIDENCE · SELL WITH YOUR OWN STYLE</div>
    </div>
    <div className="hero-stage" aria-hidden="true">
      <div className="stage-glow"/><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
      <div className="portal-shell"><div className="portal-core"><span>✦</span></div></div>
      <span className="sparkle s1">✳</span><span className="sparkle s2">✦</span><span className="sparkle s3">✧</span>
    </div>
  </section>;
}
