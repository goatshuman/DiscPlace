"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function GoogleSignIn({ nextPath = "/" }: { nextPath?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signIn = async () => {
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Google sign-in is ready, but this deployment needs Supabase and Google OAuth credentials configured first.");
      return;
    }
    setBusy(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", nextPath);
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString() } });
    if (authError) { setError(authError.message); setBusy(false); }
  };
  return <div className="google-signin-wrap"><button className="btn google-signin" type="button" onClick={signIn} disabled={busy}><span className="google-g">G</span>{busy ? "Opening Google…" : "Continue with Google"}</button>{error && <p className="login-config-note" role="alert">{error}</p>}</div>;
}
