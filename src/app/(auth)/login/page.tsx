"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>

      {/* ── Left: void brand panel ─────────────────────────────── */}
      <div style={{
        display: "none",
        width: "55%",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem",
        background: "var(--void)",
        position: "relative",
        overflow: "hidden",
      }}
        className="lg:flex"
      >
        {/* Radial coral glow at bottom-left */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "60%",
          background: "radial-gradient(ellipse at bottom left, rgba(251,57,112,0.14) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />

        {/* Brand mark */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "1.15rem", color: "#FFFFFF" }}>
            Xtract
          </div>
          <div style={{
            fontFamily: "var(--font-sans)", fontSize: "0.7rem", fontWeight: 600,
            letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
            marginTop: "0.2rem",
          }}>
            BridgingX
          </div>
        </div>

        {/* Display headline */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="font-display" style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)", lineHeight: 1.15, color: "#FFFFFF", margin: 0 }}>
            Extract <em>intelligence</em><br />from every agreement.
          </h1>
          <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.65, maxWidth: "420px" }}>
            AI-powered contract and document extraction — structured, auditable, ready for Cortx.
          </p>
        </div>

        {/* Three pillars */}
        <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {[
              { label: "Ingest", copy: "PDF, Word, plain text. Scanned or native — Claude handles both." },
              { label: "Extract", copy: "iCML v4.0 — 8 object types, confidence-scored, source-cited." },
              { label: "Export", copy: "XLSX workbook, iCML JSON and XOE envelope in one run." },
            ].map(({ label, copy }) => (
              <div key={label}>
                <div className="font-display" style={{ fontSize: "0.875rem", color: "var(--coral)", marginBottom: "0.4rem" }}>
                  <em>{label}</em>
                </div>
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>

          <p style={{
            fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "var(--coral)", marginBottom: "0.75rem",
          }}>
            Analyst access
          </p>

          {sent ? (
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.5rem" }}>
                Check your email
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", lineHeight: 1.6 }}>
                We sent a magic link to <strong>{email}</strong>.<br />Click it to sign in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                style={{
                  marginTop: "1.5rem", background: "none", border: "none", padding: 0,
                  fontSize: "0.85rem", color: "var(--coral)", cursor: "pointer",
                }}
              >
                ← Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.35rem" }}>
                Sign in to Xtract
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                Enter your email to receive a secure magic link.
              </p>

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label htmlFor="email" style={{
                    display: "block", fontSize: "0.75rem", fontWeight: 600,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "var(--foreground)", marginBottom: "0.4rem",
                  }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@example.com"
                    style={{
                      width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px",
                      border: "1px solid var(--border-strong)", background: "var(--paper)",
                      fontSize: "0.9rem", color: "var(--foreground)", outline: "none",
                      boxSizing: "border-box", fontFamily: "var(--font-sans)",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--coral)"; e.target.style.boxShadow = "0 0 0 3px var(--coral-soft)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: "0.82rem", color: "var(--destructive)", margin: 0 }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-coral"
                  style={{ width: "100%", padding: "0.7rem", fontSize: "0.9rem", opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
