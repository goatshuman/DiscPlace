import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";

export default function CheckoutSuccess() {
  return <><Header/><main className="page-shell"><section className="glass empty-cart" data-reveal><div className="empty-cart-icon"><Check size={26}/></div><div className="eyebrow">PAYMENT VERIFIED</div><h1 className="page-heading">You’re all set.</h1><p>Payment verification succeeded and the order was recorded. Keep your order reference and contact the seller through DiscPlace for delivery.</p><Link className="btn" href="/#explore">Back to the marketplace <ArrowRight size={14}/></Link></section></main></>;
}
