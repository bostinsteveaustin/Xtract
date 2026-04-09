// GET /api/cortx/[id] — Fetch full Cortx context for preview

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getContextById } from "@/lib/cortx/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const context = await getContextById(id);
    return NextResponse.json({ context });
  } catch (error) {
    console.error("GET /api/cortx/[id] error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch context";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
