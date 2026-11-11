import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { ToastProvider } from "@/components/toast-provider";
export const metadata: Metadata = {
  title: "DiscPlace — Community marketplace",
  description: "Shop community kits and services, message creators, or publish your own marketplace listing."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ToastProvider><CartProvider>{children}</CartProvider></ToastProvider></body></html>;
}
