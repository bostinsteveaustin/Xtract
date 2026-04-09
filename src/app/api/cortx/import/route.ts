// POST /api/cortx/import — Import a Cortx context into workspace's CTX configurations

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContextById } from "@/lib/cortx/client";
import { mapCortxToCTX } from "@/lib/cortx/mapper";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { cortxContextId } = body as { cortxContextId?: string };

    if (!cortxContextId) {
      return NextResponse.json(
        { error: "Missing cortxContextId" },
        { status: 400 }
      );
    }

    // 1. Fetch full context from Cortx API
    const cortxContext = await getContextById(cortxContextId);

    // 2. Map to CTXFile format
    const ctxFile = mapCortxToCTX(cortxContext);

    // 3. Insert into ctx_configurations
    const admin = createAdminClient();
    const { data: config, error: insertError } = await admin
      .from("ctx_configurations")
      .insert({
        workspace_id: auth.workspaceId,
        name: ctxFile.frontMatter.title,
        version: ctxFile.frontMatter.version,
        content: JSON.parse(JSON.stringify(ctxFile)),
        status: "active",
      })
      .select("id, name")
      .single();

    if (insertError) {
      console.error("Insert CTX config error:", insertError);
      return NextResponse.json(
        { error: "Failed to save CTX configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ctxConfigurationId: config.id,
      name: config.name,
      source: `cortx:${cortxContextId}`,
    });
  } catch (error) {
    console.error("POST /api/cortx/import error:", error);
    const msg = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
