// POST /api/contract/export
// Stage 5: Generate iCML JSON + XLSX workbook

import { NextResponse } from "next/server";
import { buildIcmlJson, buildXlsx } from "@/lib/contract/exporter";
import type { ContractExtractionResult } from "@/types/contract";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/api/auth";

export const maxDuration = 120;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as {
      result: ContractExtractionResult;
      runId?: string;
    };

    const { result, runId } = body;

    if (!result) {
      return NextResponse.json({ error: "Missing extraction result" }, { status: 400 });
    }

    const effectiveRunId = runId ?? nanoid(12);

    // Build iCML JSON
    const icmlJson = buildIcmlJson(result, effectiveRunId);

    // Build XLSX
    const xlsxBuffer = await buildXlsx(result);

    // Build run summary
    const totalObjects =
      result.parties.length +
      (result.agreement ? 1 : 0) +
      result.obligations.length +
      result.financialTerms.length +
      result.serviceLevels.length +
      result.liabilityProvisions.length +
      result.terminationProvisions.length +
      (result.disputeResolution ? 1 : 0);

    const runSummary = {
      runId: effectiveRunId,
      engagementRef: result.engagementRef,
      generatedAt: new Date().toISOString(),
      pipeline: "contract-extraction-v1",
      totals: {
        parties: result.parties.length,
        agreement: result.agreement ? 1 : 0,
        obligations: result.obligations.length,
        financialTerms: result.financialTerms.length,
        serviceLevels: result.serviceLevels.length,
        liabilityProvisions: result.liabilityProvisions.length,
        terminationProvisions: result.terminationProvisions.length,
        disputeResolution: result.disputeResolution ? 1 : 0,
        relationships: result.relationships.length,
        totalObjects,
      },
    };

    const icmlBytes = new TextEncoder().encode(icmlJson).length;
    const summaryBytes = new TextEncoder().encode(JSON.stringify(runSummary, null, 2)).length;

    return NextResponse.json({
      files: [
        {
          key: "icml",
          name: "extraction.icml.json",
          format: "json",
          content: icmlJson,
          size: formatSize(icmlBytes),
        },
        {
          key: "xlsx",
          name: "contract_extraction.xlsx",
          format: "xlsx",
          content: xlsxBuffer.toString("base64"),
          size: formatSize(xlsxBuffer.length),
          encoding: "base64",
        },
        {
          key: "runSummary",
          name: "run_summary.json",
          format: "json",
          content: JSON.stringify(runSummary, null, 2),
          size: formatSize(summaryBytes),
        },
      ],
      metrics: {
        totalObjects,
        obligations: result.obligations.length,
        relationships: result.relationships.length,
        approved: totalObjects,
      },
    });
  } catch (error) {
    console.error("POST /api/contract/export error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Export failed: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}
