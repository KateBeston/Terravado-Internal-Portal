"use client";
import { useState, type FormEvent } from "react";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!IS_SUPABASE_CONFIGURED) {
    return (
      <div className="login-wrap">
        <div className="login">
          <div className="brand">Terravado<em>.</em></div>
          <div className="devbanner">Local dev mode — Supabase isn&apos;t connected, so login is bypassed.</div>
          <a className="btn" href="/" style={{ display: "inline-block", textAlign: "center", width: "100%" }}>Enter the portal →</a>
          <div className="hr" />
          <p className="muted">Add your Supabase keys to <code>.env.local</code> to turn on Google sign-in and MFA.</p>
        </div>
      </div>
    );
  }

  const signInEmail = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    window.location.href = "/";
  };

  const signInGoogle = async () => {
    setErr(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setErr(error.message);
  };

  return (
    <div className="login-wrap">
      <div className="login">
        <div className="brand">Terravado<em>.</em></div>
        <form onSubmit={signInEmail}>
          <label className="f"><span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="f"><span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <button className="gbtn" onClick={signInGoogle} type="button">Continue with Google</button>
        {err && <div className="err">{err}</div>}
        <div className="hr" />
        <p className="muted">
          Two-factor authentication is enforced by your Supabase MFA policy. Password reset wires in
          with the next increment.
        </p>
      </div>
    </div>
  );
}
