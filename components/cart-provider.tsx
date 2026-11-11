"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";

type CartItem = { product: Product; qty: number };
type CartContextValue = { items: CartItem[]; add: (product: Product) => void; remove: (id: string) => void; setQty: (id: string, qty: number) => void; count: number; total: number };
const CartContext = createContext<CartContextValue>({ items: [], add: () => {}, remove: () => {}, setQty: () => {}, count: 0, total: 0 });
const STORAGE_KEY = "discplace-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter((item) => item?.product?.id && Number.isInteger(item.qty) && item.qty > 0));
      }
    } catch { /* Invalid local cart data is ignored and replaced on next change. */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [hydrated, items]);
  const add = (product: Product) => setItems((old) => old.some((item) => item.product.id === product.id) ? old.map((item) => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...old, { product, qty: 1 }]);
  const remove = (id: string) => setItems((old) => old.filter((item) => item.product.id !== id));
  const setQty = (id: string, qty: number) => setItems((old) => qty < 1 ? old.filter((item) => item.product.id !== id) : old.map((item) => item.product.id === id ? { ...item, qty: Math.min(99, qty) } : item));
  const value = useMemo(() => ({ items, add, remove, setQty, count: items.reduce((sum, item) => sum + item.qty, 0), total: items.reduce((sum, item) => sum + item.product.price * item.qty, 0) }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
