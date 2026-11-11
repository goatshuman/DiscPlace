"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Header } from "@/components/header";
import { MotionEffects } from "@/components/motion-effects";
import { ProductPalette } from "@/components/product-art";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/products";

export default function Cart() {
  const { items, remove, setQty, total } = useCart();
  return <><Header/><main className="page-shell">
    <div className="eyebrow">YOUR SELECTION</div><h1 className="page-heading">The next great<br/><span className="gradient">thing starts here.</span></h1><p className="page-intro">Your selected blueprints and setup experiences, all in one place.</p>
    {!items.length ? <div className="glass empty-cart" data-reveal><div className="empty-cart-icon"><ShoppingBag size={27}/></div><h2>Your cart is still a blank canvas.</h2><p>Find a blueprint for the community you have in mind.</p><Link href="/#explore" className="btn">Explore the marketplace <ArrowRight size={14}/></Link></div> : <div className="cart-layout" data-reveal>
      <div className="cart-items">{items.map(({ product, qty }) => <article className="glass cart-item" key={product.id}>
        <div className="cart-item-art" style={ProductPalette({ product })}>{product.icon}</div>
        <div><Link href={`/products/${product.id}`}><h3>{product.title}</h3></Link><div className="cart-item-category">{product.category.toUpperCase()} · {product.type.toUpperCase()}</div><div className="quantity-control"><button aria-label={`Decrease ${product.title} quantity`} onClick={() => setQty(product.id, qty - 1)}><Minus size={12}/></button><span>{qty}</span><button aria-label={`Increase ${product.title} quantity`} onClick={() => setQty(product.id, qty + 1)}><Plus size={12}/></button></div></div>
        <div className="cart-item-price"><strong>{formatPrice(product.price * qty)}</strong><button className="remove-button" onClick={() => remove(product.id)}><Trash2 size={11} style={{ verticalAlign: "-2px" }}/> &nbsp;Remove</button></div>
      </article>)}</div>
      <aside className="glass summary-card"><h2>Your order</h2><div className="summary-row"><span>Items ({items.reduce((sum, item) => sum + item.qty, 0)})</span><span>{formatPrice(total)}</span></div><div className="summary-row"><span>Delivery</span><span>{items.some((item) => item.product.type === "Setup service") ? "Arranged with creator" : "Instant access"}</span></div><div className="summary-total"><span>Total</span><span>{formatPrice(total)}</span></div><Link href="/checkout" className="btn" style={{ width: "100%", marginTop: 17 }}>Continue to checkout <ArrowRight size={14}/></Link><p className="summary-note">Demo checkout only. No payment is collected or processed.</p></aside>
    </div>}
  </main><MotionEffects/></>;
}
