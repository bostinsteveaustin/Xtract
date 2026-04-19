/**
 * Shared auth helpers for API routes.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (auth.error) return auth.error;
 *   const { user, workspaceId } = auth;
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface AuthSuccess {
  user: { id: string; email?: string };
  workspaceId: string;
  error?: undefined;
}

interface AuthFailure {
  user?: undefined;
  workspaceId?: undefined;
  error: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Verify the caller is authenticated and resolve their workspace_id.
 * Returns a ready-to-return NextResponse on failure so routes can
 * simply do: `if (auth.error) return auth.error;`
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return {
      error: NextResponse.json({ error: "No workspace" }, { status: 404 }),
    };
  }

  return { user, workspaceId: profile.workspace_id };
}

/**
 * Confirm that a workflow belongs to the caller's workspace.
 * Uses the admin client (bypasses RLS) so the check works regardless
 * of the caller's Supabase role.
 */
export async function verifyWorkflowOwnership(
  workflowId: string,
  workspaceId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("workspace_id", workspaceId)
    .single();

  return !!data;
}
