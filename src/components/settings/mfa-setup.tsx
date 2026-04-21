"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, ShieldAlert } from "lucide-react";

/**
 * TOTP MFA enrollment flow using Supabase's native MFA. Two stages:
 *   1. Enroll — creates an unverified factor, returns QR code URI + secret.
 *   2. Verify — user enters code from authenticator; factor becomes 'verified'.
 *
 * Once verified, Supabase requires the factor on subsequent logins for this
 * user (assuming AAL2 is enforced at login — see middleware).
 */
export function MfaSetup() {
  const supabase = createClient();
  const [verifiedFactor, setVerifiedFactor] = useState<string | null>(null);
  const [unverifiedFactor, setUnverifiedFactor] = useState<{
    id: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp ?? []).find((f) => f.status === "verified");
    setVerifiedFactor(verified?.id ?? null);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enroll() {
    setBusy(true);
    try {
      // Clean up any lingering unverified factors first.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.totp ?? []) {
        if (f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Xtract (${new Date().toISOString().slice(0, 10)})`,
      });
      if (error) throw error;
      if (!data?.totp) throw new Error("No TOTP data returned");

      setUnverifiedFactor({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (err) {
      toast.error(`Enroll failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!unverifiedFactor || !verifyCode.trim()) return;
    setBusy(true);
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge(
        { factorId: unverifiedFactor.id }
      );
      if (chErr || !challenge) throw chErr ?? new Error("Challenge failed");

      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: unverifiedFactor.id,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });
      if (verErr) throw verErr;

      // Audit-log (best effort).
      fetch("/api/auth/mfa-enrolled", { method: "POST" }).catch(() => null);

      toast.success("MFA verified and active.");
      setUnverifiedFactor(null);
      setVerifyCode("");
      await refresh();
    } catch (err) {
      toast.error(`Verify failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function unenroll() {
    if (!verifiedFactor) return;
    if (
      !confirm(
        "Disable MFA?\n\nIf you have a platform role, you will not be able to log back in until MFA is re-enrolled (you may be locked out)."
      )
    )
      return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor,
      });
      if (error) throw error;
      toast.success("MFA disabled.");
      await refresh();
    } catch (err) {
      toast.error(`Unenroll failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (verifiedFactor) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">MFA active</h2>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            TOTP enrolled
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          You'll be prompted for a 6-digit code from your authenticator app on
          every sign-in.
        </p>
        <Button
          variant="outline"
          onClick={unenroll}
          disabled={busy}
          className="mt-4"
        >
          Disable MFA
        </Button>
      </Card>
    );
  }

  if (unverifiedFactor) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#FB3970]" />
          <h2 className="text-lg font-semibold text-slate-900">
            Scan this QR code
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          In your authenticator app (1Password, Authy, Google Authenticator),
          scan the QR code or enter the secret manually.
        </p>
        <div className="flex gap-6">
          <img
            src={unverifiedFactor.qrCode}
            alt="Scan with your authenticator app"
            className="h-40 w-40 rounded border bg-white p-2"
          />
          <div className="flex-1 text-sm">
            <Label>Secret (manual entry)</Label>
            <Input
              value={unverifiedFactor.secret}
              readOnly
              className="mt-1 font-mono"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="verify-code">Enter 6-digit code</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="verify-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
            />
            <Button onClick={verify} disabled={busy || verifyCode.length !== 6}>
              Verify
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold text-slate-900">MFA not set up</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Multi-factor authentication protects your account with a second factor —
        a 6-digit code from your authenticator app. It's required for any
        BridgingX platform role.
      </p>
      <Button onClick={enroll} disabled={busy} className="mt-4">
        Set up MFA
      </Button>
    </Card>
  );
}
