import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplate, getDefaultTemplate } from "@/lib/pipeline/templates";
import { PipelinePageClient } from "@/components/pipeline/pipeline-page-client";
import { ChevronLeft } from "lucide-react";

interface RunPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}

export default async function WorkspaceRunPage({ params, searchParams }: RunPageProps) {
  const { id } = await params;
  const { template: templateParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: workflow } = await admin
    .from("workflows")
    .select("id, name, template_id")
    .eq("id", id)
    .single();

  if (!workflow) notFound();

  // Resolve template: query param → stored template → type default → global default
  const template =
    (templateParam ? getTemplate(templateParam) : null) ??
    (workflow.template_id ? getTemplate(workflow.template_id) : null) ??
    getDefaultTemplate();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Breadcrumb */}
      <div
        style={{
          padding: "0.625rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--paper)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.82rem",
          color: "var(--muted-fg)",
          flexShrink: 0,
        }}
      >
        <Link
          href={`/workflows/${id}`}
          style={{
            display: "flex", alignItems: "center", gap: "0.2rem",
            color: "var(--muted-fg)", textDecoration: "none",
            transition: "color 0.1s",
          }}
          className="hover:text-foreground"
        >
          <ChevronLeft style={{ width: "0.875rem", height: "0.875rem" }} />
          {workflow.name}
        </Link>
        <span style={{ color: "var(--border-strong)" }}>·</span>
        <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
          {template.name ?? "Pipeline Run"}
        </span>
      </div>

      {/* Pipeline execution */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <PipelinePageClient
          workflowId={workflow.id}
          workflowName={workflow.name}
          template={template}
        />
      </div>
    </div>
  );
}
