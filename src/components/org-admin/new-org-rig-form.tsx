"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBespokeOrgRig } from "@/app/org-admin/rigs/actions";

export function NewOrgRigForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createBespokeOrgRig(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Pay.UK Internal Controls Rig"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          placeholder="payuk-internal-controls"
        />
        <p className="text-xs text-slate-500">
          URL-safe. Lowercase letters, digits, and dashes. Unique within this
          organisation. Cannot be changed later.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue="custom"
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="contract_intelligence">Contract Intelligence</option>
          <option value="controls_extraction">Controls Extraction</option>
          <option value="ontology_building">Ontology Building</option>
          <option value="qa_review">QA & Review</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="space-y-2">
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
        <p className="text-xs text-slate-500">
          Engineering composition. Editable on draft versions; frozen once the
          version is released.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="methodology_statement">Methodology statement</Label>
        <Textarea
          id="methodology_statement"
          name="methodology_statement"
          rows={4}
          placeholder="Plain-language description of what this Rig does and how."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="mr-auto text-xs text-rose-700">{error}</span>}
        <Button asChild variant="ghost">
          <Link href="/org-admin/rigs">Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#0EA5A0] text-white hover:bg-[#0B8A86]"
        >
          {isPending ? "Creating…" : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
