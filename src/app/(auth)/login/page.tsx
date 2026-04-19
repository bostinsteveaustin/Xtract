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
      <div
        style={{
          display: "none",
          width: "50%",
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
          position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
          background: "radial-gradient(ellipse at bottom left, rgba(251,57,112,0.16) 0%, transparent 62%)",
          pointerEvents: "none",
        }} />

        {/* Brand mark */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{
            fontFamily: "var(--font-sans)", fontWeight: 600,
            fontSize: "1.1rem", color: "#FFFFFF",
          }}>
            Xtract<span style={{ color: "var(--coral)" }}>.</span>
          </span>
        </div>

        {/* Display headline — centre of panel */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(3.25rem, 5.5vw, 5.5rem)",
              lineHeight: 1.08,
              color: "#FFFFFF",
              margin: "0 0 1.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Extract <em>intelligence</em><br />
            from every<br />
            agreement.
          </h1>
          <p style={{
            fontSize: "0.92rem",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.65,
            maxWidth: "400px",
            margin: 0,
          }}>
            Xtract turns contracts and documents into structured,
            auditable intelligence — ready for Cortx, XLSX and iCML export
            in a single run.
          </p>
        </div>

        {/* Spacer */}
        <div style={{ position: "relative", zIndex: 1 }} />
      </div>

      {/* ── Right: form ───────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>

          {sent ? (
            /* ── Sent confirmation ── */
            <div>
              <p style={{
                fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "1rem",
              }}>
                Check your inbox
              </p>
              <h2
                className="font-display"
                style={{
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  color: "var(--foreground)",
                  margin: "0 0 0.75rem",
                  lineHeight: 1.1,
                }}
              >
                Magic link sent.
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", lineHeight: 1.65, margin: "0 0 1.5rem" }}>
                We sent a link to <strong style={{ color: "var(--foreground)" }}>{email}</strong>.
                <br />Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontSize: "0.85rem", color: "var(--coral)", cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                ← Use a different email
              </button>
            </div>
          ) : (
            /* ── Sign-in form ── */
            <>
              {/* Eyebrow */}
              <p style={{
                fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.875rem",
              }}>
                Welcome back
              </p>

              {/* Heading — Fraunces display, large */}
              <h2
                className="font-display"
                style={{
                  fontSize: "clamp(1.85rem, 3vw, 2.5rem)",
                  color: "var(--foreground)",
                  margin: "0 0 0.5rem",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Sign in to Xtract.
              </h2>
              <p style={{
                fontSize: "0.875rem", color: "var(--muted-fg)",
                marginBottom: "2rem", lineHeight: 1.6,
              }}>
                Enter your email to receive a secure magic link.
              </p>

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block", fontSize: "0.72rem", fontWeight: 600,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: "var(--foreground)", marginBottom: "0.45rem",
                    }}
                  >
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
                      width: "100%", padding: "0.7rem 0.9rem", borderRadius: "8px",
                      border: "1px solid var(--border-strong)", background: "var(--paper)",
                      fontSize: "0.92rem", color: "var(--foreground)", outline: "none",
                      boxSizing: "border-box", fontFamily: "var(--font-sans)",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--coral)";
                      e.target.style.boxShadow = "0 0 0 3px var(--coral-soft)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-strong)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: "0.82rem", color: "var(--destructive)", margin: 0 }}>
                    {error}
                  </p>
                )}

                {/* CTA — dark navy, matching Cortx */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "none",
                    background: loading ? "rgba(26,35,50,0.6)" : "var(--foreground)",
                    color: "#FFFFFF",
                    fontSize: "0.92rem",
                    fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) (e.currentTarget as HTMLElement).style.background = "#2D3A4F";
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--foreground)";
                  }}
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>

              {/* Footer */}
              <p style={{
                marginTop: "2rem",
                fontSize: "0.8rem",
                color: "var(--muted-fg)",
                textAlign: "center",
                lineHeight: 1.5,
              }}>
                Don&apos;t have an account?{" "}
                <span style={{ color: "var(--foreground)" }}>
                  Contact your workspace admin for an invite.
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
