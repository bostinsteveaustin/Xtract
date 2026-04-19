import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, verifyWorkflowOwnership } from "@/lib/api/auth";
import type { ContractExtractionResult, ConfidenceLevel } from "@/types/contract";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confToNum(c: ConfidenceLevel | string): number {
  return c === "high" ? 90 : c === "medium" ? 70 : 50;
}

/**
 * Flatten a ContractExtractionResult into extracted_objects rows.
 * Each typed array (parties, obligations, …) becomes individual rows with
 * object_type set to the contract type name and attributes containing the
 * full object. This makes the results page work for contract pipeline runs.
 */
function flattenContractObjects(
  workflowRunId: string,
  result: ContractExtractionResult
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  const push = (
    objectType: string,
    icmlId: string,
    attrs: Record<string, unknown>,
    sourceClause: string,
    confidence: ConfidenceLevel | string
  ) =>
    rows.push({
      workflow_run_id: workflowRunId,
      object_type:     objectType,
      object_icml_id:  icmlId,
      attributes:      attrs,
      source_clause_text: sourceClause,
      confidence:      confToNum(confidence),
      status:          "approved",
    });

  for (const p of result.parties ?? [])
    push("ContractParty", p.partyID, p as unknown as Record<string, unknown>, p.sourceClause, p.confidence);

  if (result.agreement)
    push("Agreement", result.agreement.agreementID, result.agreement as unknown as Record<string, unknown>, result.agreement.sourceClause, result.agreement.confidence);

  for (const o of result.obligations ?? [])
    push("ContractObligation", o.obligationID, o as unknown as Record<string, unknown>, o.sourceClause, o.confidence);

  for (const f of result.financialTerms ?? [])
    push("FinancialTerm", f.financialTermID, f as unknown as Record<string, unknown>, f.sourceClause, f.confidence);

  for (const s of result.serviceLevels ?? [])
    push("ServiceLevel", s.serviceLevelID, s as unknown as Record<string, unknown>, s.sourceClause, s.confidence);

  for (const l of result.liabilityProvisions ?? [])
    push("LiabilityProvision", l.liabilityID, l as unknown as Record<string, unknown>, l.sourceClause, l.confidence);

  for (const t of result.terminationProvisions ?? [])
    push("TerminationProvision", t.terminationID, t as unknown as Record<string, unknown>, t.sourceClause, t.confidence);

  if (result.disputeResolution)
    push("DisputeResolution", result.disputeResolution.disputeID, result.disputeResolution as unknown as Record<string, unknown>, result.disputeResolution.sourceClause, result.disputeResolution.confidence);

  return rows;
}

function flattenContractRelationships(
  workflowRunId: string,
  result: ContractExtractionResult
): Array<Record<string, unknown>> {
  return (result.relationships ?? []).map((r) => ({
    workflow_run_id:      workflowRunId,
    from_object_icml_id:  r.sourceObjectId,
    to_object_icml_id:    r.targetObjectId,
    relationship_type:    r.relationshipType,
    direction:            r.direction,
    confidence:           confToNum(r.confidence),
    source:               "extraction",
    description:          r.sourceEvidence,
  }));
}

// ─── GET — fetch run history ───────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!(await verifyWorkflowOwnership(id, auth.workspaceId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supabase = createAdminClient();

    const { data: runs, error } = await supabase
      .from("workflow_runs")
      .select("id, status, pipeline_type, tokens_used, prompt_tokens, completion_tokens, step_token_log, ctx_content, started_at, completed_at, created_at")
      .eq("workflow_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ runs: runs ?? [] });
  } catch (error) {
    console.error("GET /api/workflows/[id]/runs error:", error);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}

// ─── POST — save a completed run ──────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!(await verifyWorkflowOwnership(id, auth.workspaceId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      status,
      promptTokens,
      completionTokens,
      stepTokenLog,
      ctxContent,
      pipelineType,
      extractionResult,
    } = body as {
      runId?: string;
      status: string;
      promptTokens: number;
      completionTokens: number;
      stepTokenLog: unknown[];
      ctxContent?: string;
      pipelineType?: string;
      extractionResult?: ContractExtractionResult | null;
    };

    const supabase = createAdminClient();

    // Create the run record
    const { data: run, error } = await supabase
      .from("workflow_runs")
      .insert({
        workflow_id:       id,
        status,
        pipeline_type:     pipelineType ?? null,
        tokens_used:       promptTokens + completionTokens,
        prompt_tokens:     promptTokens,
        completion_tokens: completionTokens,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        step_token_log:    stepTokenLog as any,
        ctx_content:       ctxContent ?? null,
        started_at:        new Date().toISOString(),
        completed_at:      status === "completed" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error || !run) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    }

    // Persist contract extraction objects so the results page works
    if (extractionResult && run) {
      const objectRows = flattenContractObjects(run.id, extractionResult);
      if (objectRows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("extracted_objects").insert(objectRows as any[]);
      }

      const relRows = flattenContractRelationships(run.id, extractionResult);
      if (relRows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("object_relationships").insert(relRows as any[]);
      }
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error("POST /api/workflows/[id]/runs error:", error);
    return NextResponse.json({ error: "Failed to save run" }, { status: 500 });
  }
}
