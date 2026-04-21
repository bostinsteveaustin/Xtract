"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { forkPublishedRig } from "@/app/org-admin/rigs/actions";

export interface ForkSource {
  id: string;
  slug: string;
  name: string;
  category: string;
  current_state: string;
  current_version: string;
}

export function ForkPublishedRigForm({ sources }: { sources: ForkSource[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(sources[0]?.id ?? "");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");

  const selected = sources.find((s) => s.id === selectedId) ?? null;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await forkPublishedRig(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fork failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <input type="hidden" name="source_rig_id" value={selectedId} />

      <div className="space-y-2">
        <Label htmlFor="source">Source Published Rig</Label>
        <select
          id="source"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · v{s.current_version} ({s.current_state})
            </option>
          ))}
        </select>
        {selected && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge variant="outline" className="font-mono text-xs">
              {selected.slug}
            </Badge>
            <span>·</span>
            <StateBadge state={selected.current_state} />
            <span>·</span>
            <span>Will be forked at v{selected.current_version}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fork-name">Fork name</Label>
        <Input
          id="fork-name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            selected ? `${selected.name} — Pay.UK fork` : "Name for the fork"
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fork-slug">Fork slug</Label>
        <Input
          id="fork-slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={
            selected ? `${selected.slug}-payuk` : "fork-slug"
          }
        />
        <p className="text-xs text-slate-500">
          URL-safe. Lowercase letters, digits, and dashes. Unique within this
          organisation.
        </p>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Calibration evidence is <strong>not</strong> copied from the source.
        The fork starts in <span className="font-mono">draft</span> at version{" "}
        <span className="font-mono">0.1.0</span> and must be validated
        independently.
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && (
          <span className="mr-auto text-xs text-rose-700">{error}</span>
        )}
        <Button asChild variant="ghost">
          <Link href="/org-admin/rigs">Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={isPending || !selectedId}
          className="bg-[#0EA5A0] text-white hover:bg-[#0B8A86]"
        >
          {isPending ? "Forking…" : "Create fork"}
        </Button>
      </div>
    </form>
  );
}

function StateBadge({ state }: { state: string }) {
  const variants: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    experimental: "bg-amber-100 text-amber-800",
    validated: "bg-emerald-100 text-emerald-800",
    deprecated: "bg-rose-100 text-rose-800",
  };
  return (
    <Badge
      variant="secondary"
      className={variants[state] ?? "bg-slate-100 text-slate-700"}
    >
      {state}
    </Badge>
  );
}
