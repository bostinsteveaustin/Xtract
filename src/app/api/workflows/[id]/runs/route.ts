import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Fetch run history for a workflow
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: runs, error } = await supabase
      .from("workflow_runs")
      .select("id, status, tokens_used, prompt_tokens, completion_tokens, step_token_log, started_at, completed_at, created_at")
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
    const { id } = await params;
    const body = await request.json();
    const { runId, status, promptTokens, completionTokens, stepTokenLog } = body as {
      runId?: string;
      status: string;
      promptTokens: number;
      completionTokens: number;
      stepTokenLog: unknown[];
    };

    const supabase = createAdminClient();

    const { data: run, error } = await supabase
      .from("workflow_runs")
      .insert({
        id: runId,
        workflow_id: id,
        status,
        tokens_used: promptTokens + completionTokens,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        step_token_log: stepTokenLog,
        started_at: new Date().toISOString(),
        completed_at: status === "completed" ? new Date().toISOString() : null,
        node_states: {},
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
