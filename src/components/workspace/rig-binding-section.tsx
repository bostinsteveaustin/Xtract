"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, Cpu, Loader2, Package,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  bindWorkspaceRig,
  unbindWorkspaceRig,
} from "@/app/(app)/workflows/[id]/rig-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoundRigInfo {
  id: string;
  slug: string;
  name: string;
  tier: "published" | "organisation";
  current_version: string;
}

interface BindableRigVersion {
  id: string;
  version: string;
  state: "experimental" | "validated" | "deprecated";
  deprecation_window_ends_at: string | null;
}

interface BindableRig {
  id: string;
  slug: string;
  name: string;
  tier: "published" | "organisation";
  category: string;
  current_state: string;
  current_version: string;
  versions: BindableRigVersion[];
}

export interface RigBindingSectionProps {
  workflowId: string;
  boundRig: BoundRigInfo | null;
  boundRigVersion: string | null;
  boundVersionState:
    | "experimental"
    | "validated"
    | "deprecated"
    | "draft"
    | null;
  boundVersionWindowEnd: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StateBadge({ state }: { state: BindableRigVersion["state"] | "draft" | null }) {
  if (!state) return null;
  const cfg = {
    experimental: { color: "var(--coral)",        label: "Experimental"  },
    validated:    { color: "var(--tier-working)", label: "Validated"     },
    deprecated:   { color: "var(--muted-fg)",     label: "Deprecated"    },
    draft:        { color: "var(--muted-fg)",     label: "Draft"         },
  }[state];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "0.15rem 0.55rem", borderRadius: "999px",
        border: `1px solid ${cfg.color}`, color: cfg.color,
        fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.02em",
      }}
    >
      {cfg.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: "published" | "organisation" }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "0.15rem 0.55rem", borderRadius: "999px",
        background: tier === "published" ? "var(--coral-soft)" : "var(--muted)",
        color:      tier === "published" ? "var(--coral)"      : "var(--muted-fg)",
        fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.02em",
      }}
    >
      {tier === "published" ? "Published" : "Organisation"}
    </span>
  );
}

function formatWindowEnd(iso: string | null): string {
  if (!iso) return "";
  const end = new Date(iso);
  const now = Date.now();
  const daysLeft = Math.ceil((end.getTime() - now) / (24 * 60 * 60_000));
  const label = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (daysLeft < 0) return `Window closed ${label}`;
  if (daysLeft === 0) return `Window closes today`;
  return `Window closes ${label} (${daysLeft}d)`;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function RigBindingSection(props: RigBindingSectionProps) {
  const {
    workflowId, boundRig, boundRigVersion, boundVersionState,
    boundVersionWindowEnd,
  } = props;
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div
        style={{
          border: "1px solid var(--border)", borderRadius: "10px",
          padding: "1.5rem", background: "var(--paper)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{
            width: "2.25rem", height: "2.25rem", borderRadius: "8px",
            background: boundRig ? "var(--tier-working-soft)" : "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Cpu style={{
              width: "1rem", height: "1rem",
              color: boundRig ? "var(--tier-working)" : "var(--muted-fg)",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.35rem" }}>
              Rig
            </div>
            {boundRig && boundRigVersion ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {boundRig.name}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted-fg)" }}>
                    v{boundRigVersion}
                  </span>
                  <TierBadge tier={boundRig.tier} />
                  <StateBadge state={boundVersionState} />
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", lineHeight: 1.55 }}>
                  Runs in this workspace execute against this Rig at this exact version.
                  Upgrading to a new version is an explicit action — output characteristics may change.
                </p>
                {boundVersionState === "deprecated" && boundVersionWindowEnd && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "7px",
                      background: "rgba(220,38,38,0.06)",
                      border: "1px solid rgba(220,38,38,0.2)",
                      color: "var(--destructive)",
                      fontSize: "0.78rem",
                      display: "flex", alignItems: "center", gap: "0.4rem",
                    }}
                  >
                    <AlertTriangle style={{ width: "0.85rem", height: "0.85rem" }} />
                    {formatWindowEnd(boundVersionWindowEnd)}. Upgrade before the window closes to keep running.
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: "0.82rem", color: "var(--muted-fg)", lineHeight: 1.55 }}>
                This workspace has no Rig bound. Bind a Rig to run extractions with a
                versioned, calibrated apparatus. Legacy pipeline runs continue to work
                but new Runs are recommended to bind a Rig first.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            onClick={() => setDialogOpen(true)}
            style={{
              background: boundRig ? "var(--muted)" : "var(--coral)",
              color:      boundRig ? "var(--foreground)" : "#fff",
              border:     "1px solid var(--border)",
              borderRadius: "7px",
              padding: "0.4rem 0.875rem",
              fontSize: "0.8rem", fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {boundRig ? "Change / Upgrade Rig" : "Bind Rig"}
          </button>
          {boundRig && (
            <UnbindButton
              workflowId={workflowId}
              onDone={() => router.refresh()}
            />
          )}
        </div>
      </div>

      <BindRigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workflowId={workflowId}
        boundRig={boundRig}
        boundRigVersion={boundRigVersion}
      />
    </div>
  );
}

// ─── Unbind button ───────────────────────────────────────────────────────────

function UnbindButton({
  workflowId, onDone,
}: { workflowId: string; onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "7px",
          padding: "0.4rem 0.875rem",
          fontSize: "0.8rem", fontWeight: 500,
          color: "var(--muted-fg)",
          cursor: "pointer",
        }}
      >
        Unbind
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      <span style={{ fontSize: "0.78rem", color: "var(--muted-fg)" }}>Unbind this Rig?</span>
      <button
        onClick={() =>
          startTransition(async () => {
            await unbindWorkspaceRig(workflowId);
            onDone();
          })
        }
        disabled={pending}
        style={{
          background: "var(--destructive)", color: "#fff",
          border: "none", borderRadius: "6px",
          padding: "0.3rem 0.7rem",
          fontSize: "0.76rem", fontWeight: 500, cursor: "pointer",
        }}
      >
        {pending ? "Unbinding…" : "Confirm"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        style={{
          background: "none", border: "1px solid var(--border)",
          borderRadius: "6px", padding: "0.3rem 0.7rem",
          fontSize: "0.76rem", color: "var(--muted-fg)", cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Bind / Upgrade Dialog ───────────────────────────────────────────────────

function BindRigDialog({
  open, onOpenChange, workflowId, boundRig, boundRigVersion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  boundRig: BoundRigInfo | null;
  boundRigVersion: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: "560px" }}>
        {open && (
          // Remount body on each open so useState initialisers run fresh —
          // avoids setState-in-effect resets and keeps state local to an
          // open cycle.
          <BindRigDialogBody
            workflowId={workflowId}
            boundRig={boundRig}
            boundRigVersion={boundRigVersion}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BindRigDialogBody({
  workflowId, boundRig, boundRigVersion, onClose,
}: {
  workflowId: string;
  boundRig: BoundRigInfo | null;
  boundRigVersion: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rigs, setRigs] = useState<BindableRig[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRigId, setSelectedRigId] = useState<string | null>(
    boundRig?.id ?? null
  );
  const [selectedVersion, setSelectedVersion] = useState<string | null>(
    boundRigVersion
  );
  const [confirmMajor, setConfirmMajor] = useState(false);
  const [pending, startTransition] = useTransition();

  // Load bindable Rigs once — this effect only subscribes to an async fetch,
  // no synchronous setState.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/workflows/${workflowId}/bindable-rigs`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d: { rigs?: BindableRig[]; error?: string }) => {
        if (d.error) setError(d.error);
        setRigs(d.rigs ?? []);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string } | null)?.name === "AbortError") return;
        setError("Failed to load Rigs");
      });
    return () => controller.abort();
  }, [workflowId]);

  const selectedRig = useMemo(
    () => rigs?.find((r) => r.id === selectedRigId) ?? null,
    [rigs, selectedRigId]
  );

  // Detect cross-major bump for UX warning (mirrors the server rule).
  const majorBump = useMemo(() => {
    if (!boundRig || !boundRigVersion || !selectedVersion) return false;
    if (selectedRigId !== boundRig.id) return false;
    const from = /^(\d+)\./.exec(boundRigVersion)?.[1];
    const to = /^(\d+)\./.exec(selectedVersion)?.[1];
    return from != null && to != null && Number(to) > Number(from);
  }, [boundRig, boundRigVersion, selectedRigId, selectedVersion]);

  async function handleConfirm() {
    if (!selectedRigId || !selectedVersion) return;
    setError(null);
    startTransition(async () => {
      const result = await bindWorkspaceRig({
        workflowId,
        rigId: selectedRigId,
        rigVersion: selectedVersion,
        acknowledgeMajorBump: confirmMajor,
      });
      if (!result.ok) {
        if (result.code === "MAJOR_BUMP_REQUIRES_ACK") {
          // Prompt for explicit confirmation in the dialog.
          setConfirmMajor(false);
          setError(result.error);
          return;
        }
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const selectable = !!selectedRigId && !!selectedVersion && !pending;
  const needsMajorAck = majorBump && !confirmMajor;

  return (
    <>
      <DialogHeader>
          <DialogTitle style={{ fontSize: "1.05rem" }}>
            {boundRig ? "Change or Upgrade Rig" : "Bind a Rig to this Workspace"}
          </DialogTitle>
          <p style={{ fontSize: "0.82rem", color: "var(--muted-fg)", marginTop: "0.25rem" }}>
            Runs in this workspace will pin to the exact version you choose.
          </p>
        </DialogHeader>

        {rigs === null ? (
          <div style={{ padding: "2rem 0", display: "flex", justifyContent: "center" }}>
            <Loader2 className="animate-spin h-5 w-5" style={{ color: "var(--muted-fg)" }} />
          </div>
        ) : rigs.length === 0 ? (
          <div style={{ padding: "1.5rem 0", textAlign: "center" }}>
            <Package style={{
              width: "1.5rem", height: "1.5rem", color: "var(--muted-fg)",
              margin: "0 auto 0.5rem",
            }} />
            <p style={{ fontSize: "0.85rem", color: "var(--foreground)", fontWeight: 500 }}>
              No Rigs available to bind
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted-fg)", marginTop: "0.25rem", lineHeight: 1.5 }}>
              Your organisation needs an entitlement for a Published Rig,
              or an Organisation Rig authored in /org-admin/rigs, before you can bind.
            </p>
          </div>
        ) : (
          <div style={{ maxHeight: "380px", overflowY: "auto" }} className="space-y-2 pt-1">
            {rigs.map((rig) => {
              const isSelected = rig.id === selectedRigId;
              return (
                <div
                  key={rig.id}
                  style={{
                    border: `1.5px solid ${isSelected ? "var(--coral)" : "var(--border)"}`,
                    borderRadius: "8px",
                    background: isSelected ? "var(--coral-soft)" : "var(--paper)",
                    padding: "0.75rem 0.875rem",
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedRigId(rig.id);
                      setSelectedVersion(rig.versions[0]?.version ?? null);
                      setConfirmMajor(false);
                    }}
                    style={{
                      width: "100%", textAlign: "left",
                      background: "none", border: "none", padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)" }}>
                        {rig.name}
                      </span>
                      <TierBadge tier={rig.tier} />
                    </div>
                  </button>
                  {isSelected && (
                    <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {rig.versions.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedVersion(v.version);
                            setConfirmMajor(false);
                          }}
                          style={{
                            borderRadius: "6px",
                            padding: "0.3rem 0.6rem",
                            border: `1.5px solid ${selectedVersion === v.version ? "var(--coral)" : "var(--border)"}`,
                            background: selectedVersion === v.version ? "var(--paper)" : "transparent",
                            fontSize: "0.78rem", fontWeight: 500,
                            cursor: "pointer",
                            color: "var(--foreground)",
                            display: "inline-flex", gap: "0.4rem", alignItems: "center",
                          }}
                        >
                          v{v.version}
                          <StateBadge state={v.state} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {majorBump && selectedRig && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "7px",
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.2)",
              fontSize: "0.78rem",
              color: "var(--foreground)",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
              <AlertTriangle
                style={{ width: "0.9rem", height: "0.9rem", color: "var(--destructive)", flexShrink: 0, marginTop: "0.1rem" }}
              />
              <span>
                You are upgrading <strong>{selectedRig.name}</strong> across a major
                version ({boundRigVersion} → {selectedVersion}). Output characteristics
                may change. Previous Runs are unaffected — new Runs will use the new
                version.
              </span>
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={confirmMajor}
                onChange={(e) => setConfirmMajor(e.target.checked)}
              />
              I understand and want to proceed.
            </label>
          </div>
        )}

        {error && (
          <p style={{
            fontSize: "0.8rem", color: "var(--destructive)",
            background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: "6px", padding: "0.5rem 0.75rem", margin: 0,
          }}>
            {error}
          </p>
        )}

        <Button
          onClick={handleConfirm}
          disabled={!selectable || needsMajorAck}
          className="w-full"
          style={{
            background: selectable && !needsMajorAck ? "var(--coral)" : "var(--muted)",
            color:      selectable && !needsMajorAck ? "#fff" : "var(--muted-fg)",
            border: "1px solid var(--border)", fontWeight: 500,
          }}
        >
          {pending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</>
            : boundRig
              ? selectedRigId === boundRig.id
                ? "Upgrade version"
                : "Switch Rig"
              : (
                <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Bind Rig</>
              )
          }
        </Button>
    </>
  );
}
