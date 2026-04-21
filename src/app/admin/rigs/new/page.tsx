import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPublishedRig } from "../actions";

/**
 * New Published Rig form. Creates the rig row + an initial 0.1.0 draft
 * rig_version. Composition (ctx_bundle_refs, output_contract, validation_profile)
 * is edited on the detail page after creation.
 *
 * Gated at /admin (middleware → platform role). createPublishedRig re-checks
 * platform_admin specifically because platform_support is read-only.
 */
export default function NewPublishedRigPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">
          <Link href="/admin/rigs" className="hover:underline">
            Rigs
          </Link>{" "}
          · New
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          New Published Rig
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Starts at state <span className="font-mono">draft</span> with an
          initial version <span className="font-mono">0.1.0</span>. You can edit
          composition and promote to <span className="font-mono">experimental</span>{" "}
          from the detail page.
        </p>
      </div>

      <Card className="p-6">
        <form action={createPublishedRig} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Contract Intelligence Rig"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              placeholder="contract-intelligence"
            />
            <p className="text-xs text-slate-500">
              URL-safe. Lowercase letters, digits, and dashes. Unique across
              Published Rigs. Cannot be changed later.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              required
              defaultValue="contract_intelligence"
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
              Engineering composition. Can be changed on draft versions; frozen
              once the version is released.
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
            <Button asChild variant="ghost">
              <Link href="/admin/rigs">Cancel</Link>
            </Button>
            <Button
              type="submit"
              className="bg-[#0EA5A0] text-white hover:bg-[#0B8A86]"
            >
              Create draft
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
