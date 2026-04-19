import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, verifyWorkflowOwnership } from "@/lib/api/auth";

// GET: Fetch run history for a workflow
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
      .select("id, status, tokens_used, prompt_tokens, completion_tokens, step_token_log, ctx_content, started_at, completed_at, created_at")
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

// POST: Save a completed run
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
    const { runId, status, promptTokens, completionTokens, stepTokenLog, ctxContent } = body as {
      runId?: string;
      status: string;
      promptTokens: number;
      completionTokens: number;
      stepTokenLog: unknown[];
      ctxContent?: string;
    };

    const supabase = createAdminClient();

    // Let DB generate UUID — runId is a nanoid string, not UUID
    const { data: run, error } = await supabase
      .from("workflow_runs")
      .insert({
        workflow_id: id,
        status,
        tokens_used: promptTokens + completionTokens,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        step_token_log: stepTokenLog as any,
        ctx_content: ctxContent ?? null,
        started_at: new Date().toISOString(),
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error("POST /api/workflows/[id]/runs error:", error);
    return NextResponse.json({ error: "Failed to save run" }, { status: 500 });
  }
}
