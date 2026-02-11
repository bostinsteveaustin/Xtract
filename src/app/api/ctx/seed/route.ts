// POST /api/ctx/seed — Manually seed pre-built CTX files

import { NextResponse } from "next/server";
import { seedPrebuiltCTX } from "@/lib/ctx/prebuilt/seed";

export async function POST() {
  try {
    const result = await seedPrebuiltCTX();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Seed CTX error:", error);
    return NextResponse.json(
      { error: "Failed to seed CTX files" },
      { status: 500 }
    );
  }
}
