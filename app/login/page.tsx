import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Header } from "@/components/header";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <><Header/><main className="login-shell"><section className="glass login-card" data-reveal><div className="login-orbit"><span>✦</span></div><div className="eyebrow">YOUR MARKETPLACE ACCOUNT</div><h1>Make it yours.</h1><p>Sign in to publish listings, message creators, and keep track of your purchases.</p><GoogleSignIn nextPath={nextPath}/><div className="checkout-safe"><ShieldCheck size={15}/> Purchases stay on DiscPlace. Never share payment handles or scan a seller’s QR code.</div><Link href="/" className="crumb"><ArrowLeft size={12}/> Back to the marketplace</Link></section></main></>;
}
