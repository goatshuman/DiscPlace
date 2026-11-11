"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, MessageCircle, ShoppingBag, X } from "lucide-react";
import { useCart } from "./cart-provider";

export function Header() {
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setBump(true);
    const timer = window.setTimeout(() => setBump(false), 400);
    return () => window.clearTimeout(timer);
  }, [count]);
  const closeMenu = () => setOpen(false);
  return <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
    <div className="header-inner">
      <div className="brand-group"><Link className="brand" href="/" onClick={closeMenu}><span>Disc<span className="gradient">Place</span></span></Link><span className="platform-mark" aria-label="Marketplace for Discord communities"><Image src="/discord-symbol.svg" alt="" width={17} height={13} priority/><span>FOR DISCORD</span></span></div>
      <nav className={`header-nav ${open ? "open" : ""}`} aria-label="Main navigation">
        <Link href="/#explore" onClick={closeMenu}>Marketplace</Link><Link href="/#how-it-works" onClick={closeMenu}>How it works</Link><Link href="/admin" onClick={closeMenu}>Sell with us</Link><Link href="/messages" onClick={closeMenu} className="header-chat-link"><MessageCircle size={13}/> Chat</Link>
        <Link href="/login" className="header-login" onClick={closeMenu}>Log in</Link><Link href="/cart" className="btn btn-secondary cart-link" onClick={closeMenu}><ShoppingBag size={14}/> Cart <span className={`cart-count ${bump ? "bump" : ""}`}>{count}</span></Link>
      </nav>
      <button className="mobile-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X size={18}/> : <Menu size={18}/>}</button>
    </div>
  </header>;
}
