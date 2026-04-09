// GET /api/cortx/marketplace — Browse/search Cortx marketplace

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { browseMarketplace } from "@/lib/cortx/client";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const contexts = await browseMarketplace(search, limit);
    return NextResponse.json({ contexts });
  } catch (error) {
    console.error("GET /api/cortx/marketplace error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch marketplace";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
