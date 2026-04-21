"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { attachCalibrationEvidence } from "@/app/admin/rigs/actions";

type EvidenceType =
  | "noise_floor"
  | "repeatability"
  | "factorial_design"
  | "domain_test";

export function AttachEvidenceForm({
  rigVersionId,
}: {
  rigVersionId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("domain_test");
  const [payloadText, setPayloadText] = useState<string>("{}");

  function onSubmit() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payloadText);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Payload must be a JSON object.");
      }
    } catch {
      setError("Payload must be valid JSON.");
      return;
    }

    startTransition(async () => {
      try {
        await attachCalibrationEvidence(rigVersionId, evidenceType, parsed);
        setPayloadText("{}");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Attach failed");
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      <div className="text-sm font-medium text-slate-900">
        Attach calibration evidence
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`evidence_type-${rigVersionId}`}>Type</Label>
          <select
            id={`evidence_type-${rigVersionId}`}
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="noise_floor">Noise floor</option>
            <option value="repeatability">Repeatability</option>
            <option value="factorial_design">Factorial design</option>
            <option value="domain_test">Domain test</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`payload-${rigVersionId}`}>Payload (JSON)</Label>
        <Textarea
          id={`payload-${rigVersionId}`}
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={4}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex items-center justify-between">
        {error && <span className="text-xs text-rose-700">{error}</span>}
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="ml-auto bg-[#0EA5A0] text-white hover:bg-[#0B8A86]"
        >
          Attach
        </Button>
      </div>
    </form>
  );
}
