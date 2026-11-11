export type Product = {
  id:string; title:string; category:string; price:number; compareAt?:number;
  rating:number; reviews:number; badge?:string; description:string; includes:string[];
  gradient:string; icon:string; delivery:string; type:"Blueprint"|"Setup service"; tags?:string[]; seller?:string; ownerId?:string; imageUrl?:string; imagePath?:string;
};
// Listings only come from the authenticated Supabase catalogue; never seed demo inventory.
export const products:Product[]=[];
export const categories=["All","Gaming","Trading","Community","Anime","Creators","Business"];
export const formatPrice=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
