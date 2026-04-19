// POST /api/cortx/import — Import a Cortx context into workspace's CTX configurations
//
// Accepts the context summary from the client (title, description, contextType)
// so we can build a minimal CTX even if the full-content fetch requires auth.
// When CORTX_API_KEY is configured the full sections are fetched and mapped;
// otherwise we fall back to a metadata-only CTX that still works in the pipeline.

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContextById } from "@/lib/cortx/client";
import { mapCortxToCTX } from "@/lib/cortx/mapper";
import type { CTXFile } from "@/types/ctx";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const {
      cortxContextId,
      contextTitle,
      contextDescription,
      contextType,
    } = body as {
      cortxContextId?: string;
      contextTitle?: string;
      contextDescription?: string;
      contextType?: string;
    };

    if (!cortxContextId) {
      return NextResponse.json(
        { error: "Missing cortxContextId" },
        { status: 400 }
      );
    }

    // 1. Try to fetch the full context (requires CORTX_API_KEY).
    //    Fall back gracefully to a metadata-only CTX if auth fails.
    let ctxFile: CTXFile;
    try {
      const cortxContext = await getContextById(cortxContextId);
      ctxFile = mapCortxToCTX(cortxContext);
    } catch (fetchErr) {
      console.warn(
        "Cortx full-context fetch failed, using summary fallback:",
        fetchErr instanceof Error ? fetchErr.message : fetchErr
      );

      const title = contextTitle ?? cortxContextId;
      ctxFile = {
        frontMatter: {
          cortx_version: "0.3",
          context_type: "methodology",
          context_id: cortxContextId,
          version: "1.0.0",
          status: "active",
          title,
          description: contextDescription ?? "",
          deployment: { target_platforms: ["xtract"] },
        },
        organisationalMetadata: {
          domain: "",
          author: "Cortx Marketplace",
          classification: "internal",
          visibility: {},
          content_sections: {},
          data_sensitivity: "none",
        },
        sections: {},
        versionHistory: [
          {
            version: "1.0.0",
            date: new Date().toISOString().slice(0, 10),
            changes: `Imported from Cortx marketplace (${cortxContextId}) — metadata only`,
          },
        ],
      };

      void contextType; // reserved for future richer fallback
    }

    // 2. Insert into ctx_configurations
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
