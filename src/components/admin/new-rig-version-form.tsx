"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRigVersion } from "@/app/admin/rigs/actions";

export function NewRigVersionForm({
  rigId,
  suggestedNextVersion,
}: {
  rigId: string;
  suggestedNextVersion: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createRigVersion(rigId, formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            name="version"
            required
            pattern="\d+\.\d+\.\d+"
            defaultValue={suggestedNextVersion}
            className="font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pipeline_pattern">Pipeline pattern</Label>
          <select
            id="pipeline_pattern"
            name="pipeline_pattern"
            required
            defaultValue="verified"
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="single_pass">Single pass</option>
            <option value="chunked">Chunked</option>
            <option value="verified">Verified</option>
            <option value="reconciled">Reconciled</option>
            <option value="composite">Composite</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="methodology_statement">Methodology statement</Label>
        <Textarea
          id="methodology_statement"
          name="methodology_statement"
          rows={3}
          placeholder="Plain-language description of what this version does differently."
        />
      </div>

      <div className="flex items-center justify-between">
        {error && <span className="text-xs text-rose-700">{error}</span>}
        <Button
          type="submit"
          disabled={isPending}
          className="ml-auto bg-[#0EA5A0] text-white hover:bg-[#0B8A86]"
        >
          Add draft version
        </Button>
      </div>
    </form>
  );
}
