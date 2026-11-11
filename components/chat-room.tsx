"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, LockKeyhole, MessageCircle, Send, ShieldAlert } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Message = { id: string; sender_id: string; body: string; created_at: string };
const unsafe = /\b(?:upi|gpay|google\s*pay|phonepe|paytm|bank transfer|send money|payment qr|scan (?:this|to pay))\b|\b[\w.-]{2,}@[a-z]{2,}\b|(?:\+?91[\s-]?)?[6-9]\d{9}\b|(?<!\d)\d{9,18}(?!\d)/i;

export function ChatRoom({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return;
    let channel: ReturnType<typeof client.channel> | undefined;
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: conversation, error: openError } = await client.rpc("open_listing_conversation", { p_listing_slug: listingId }).single();
      if (openError || !conversation || cancelled) { setError(openError?.message || "This seller isn’t available to message yet."); return; }
      const id = (conversation as { id: string }).id;
      setConversationId(id);
      const { data } = await client.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", id).order("created_at", { ascending: true }).limit(100);
      if (cancelled) return;
      setMessages((data ?? []) as Message[]);
      channel = client.channel(`chat-${id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) => {
        const next = payload.new as Message;
        setMessages((current) => current.some((message) => message.id === next.id) ? current : [...current, next]);
      }).subscribe();
    })();
    return () => { cancelled = true; if (channel) void client.removeChannel(channel); };
  }, [client, listingId]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const message = body.trim();
    if (!message) return;
    if (unsafe.test(message) || /https?:\/\//i.test(message)) { setError("Payment handles, QR codes and off-platform payment links are blocked. Keep payments in DiscPlace; unsafe accounts or listings may be restricted or removed."); return; }
    if (!client || !userId) { setError("Sign in with Google to message the seller."); return; }
    const { error: insertError } = await client.from("messages").insert({ conversation_id: conversationId, sender_id: userId, body: message });
    if (insertError) { setError(insertError.message.includes("off-platform") ? "That message was blocked by marketplace safety rules." : "Message could not be sent. Sign in and try again."); return; }
    setBody(""); setError("");
  };

  const loginUrl = `/login?next=${encodeURIComponent(`/messages?listing=${listingId}`)}`;
  return <section className="glass chat-panel"><header className="chat-heading"><div className="seller-avatar"><MessageCircle size={17}/></div><div><div className="eyebrow">LISTING CHAT</div><h2>{listingTitle}</h2><p>Ask a question before you buy.</p></div><span className="chat-encrypted"><LockKeyhole size={12}/> DiscPlace only</span></header><div className="chat-safety"><ShieldAlert size={14}/> Never share QR codes, UPI IDs, account details or off-platform payment links here. We block payment details and remove unsafe listings.</div>{(!client || !userId) ? <div className="chat-login-prompt"><p>{client ? "Sign in with Google to message this seller." : "Google sign-in and shared chat are not configured yet."}</p><Link className="btn" href={loginUrl}><ArrowUpRight size={13}/> Log in</Link></div> : <><div className="chat-messages" aria-live="polite">{messages.length ? messages.map((message) => <article key={message.id} className={`chat-bubble ${message.sender_id === userId ? "mine" : "theirs"}`}><small>{message.sender_id === userId ? "You" : "Creator"} · {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small><p>{message.body}</p></article>) : <div className="chat-empty"><MessageCircle size={19}/><p>Start with a question about the listing, what’s included, or delivery.</p></div>}</div><form className="chat-compose" onSubmit={send}><input aria-label="Message seller" className="field" maxLength={1200} placeholder="Write a message…" value={body} onChange={(event) => setBody(event.target.value)}/><button className="btn" aria-label="Send message" type="submit" disabled={!body.trim()}><Send size={14}/></button></form></>}{error && <p className="chat-error" role="alert">{error}</p>}</section>;
}
