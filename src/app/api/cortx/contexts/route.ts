// GET /api/cortx/contexts — List contexts from the authenticated Cortx account

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { listMyContexts } from "@/lib/cortx/client";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") ?? undefined;

    const contexts = await listMyContexts(search);
    return NextResponse.json({ contexts });
  } catch (error) {
    console.error("GET /api/cortx/contexts error:", error);
    // If Cortx API is unreachable, return empty list rather than breaking the UI
    return NextResponse.json({ contexts: [], error: "Cortx unavailable" });
  }
}
