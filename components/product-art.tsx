import type { CSSProperties } from "react";
import type { Product } from "@/lib/products";

const palettes: Record<string, [string, string, string]> = {
  "gaming-hub": ["#6f4bd4", "#14112c", "🎮"],
  "trading-terminal": ["#216c57", "#101b20", "📈"],
  "creator-club": ["#a04c91", "#26152f", "🎨"],
  "anime-world": ["#9a4fc0", "#1b1737", "🌸"],
  "pro-community": ["#9e7739", "#241a32", "✦"],
  "support-desk": ["#3978a2", "#111827", "🎧"],
};

export function ProductArt({ product, detail = false }: { product: Product; detail?: boolean }) {
  const [primary, dark, symbol] = palettes[product.id] ?? ["#654ca6", "#17122b", product.icon];
  const style = { "--art-a": primary, "--art-b": dark, ...(product.imageUrl ? { backgroundImage: `linear-gradient(0deg, #09081288, transparent 55%), url("${product.imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : {}) } as CSSProperties;
  return <div className={detail ? "detail-art" : "product-art"} style={style} aria-label={`${product.title} artwork`}>
    {!product.imageUrl && <><span className="art-orbit" aria-hidden="true" /><span className={detail ? "detail-art-symbol" : "art-symbol"} aria-hidden="true">{symbol}</span></>}
    {detail && <span className="detail-art-caption">DISCPLACE ORIGINAL · {product.category.toUpperCase()}</span>}
  </div>;
}

export function ProductPalette({ product }: { product: Product }) {
  const [primary, dark] = palettes[product.id] ?? ["#654ca6", "#17122b"];
  return { "--art-a": primary, "--art-b": dark } as CSSProperties;
}
