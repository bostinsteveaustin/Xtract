// XLSX export serializer
// Generates Excel workbook from extracted domain objects

import type { DomainObject, ObjectRelationshipRecord } from "@/lib/db";
import type { ObjectTypeSpec } from "@/types/ctx";

/**
 * Generate XLSX workbook buffer from domain objects.
 * Uses exceljs for workbook creation.
 */
export async function generateXLSX(
  domainObjectRecords: DomainObject[],
  objectSpec: ObjectTypeSpec,
  metadata: {
    extractionId: string;
    ctxName: string;
    sourceFileName: string;
  },
  relationshipRecords: ObjectRelationshipRecord[] = []
): Promise<Buffer> {
  // Dynamic import to avoid loading exceljs on every API call
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xtract";
  workbook.created = new Date();

  // Filter out metadata objects
  const realObjects = domainObjectRecords.filter(
    (o) => !o.object_type.startsWith("_")
  );

  // ─── Sheet 1: Contract Terms ───────────────────────────────────────
  const sheet = workbook.addWorksheet("Contract Terms");

  // Build columns from the object spec attributes
  const columns = [
    { header: "Object ID", key: "objectID", width: 20 },
    ...objectSpec.attributes.map((attr) => ({
      header: attr.name
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase())
        .trim(),
      key: attr.name,
      width: attr.type === "text" ? 40 : 20,
    })),
    { header: "Confidence", key: "confidence", width: 12 },
    { header: "Rubric Score", key: "rubricScore", width: 14 },
    { header: "Rubric Level", key: "rubricLevel", width: 14 },
    { header: "Source Clause", key: "sourceRef", width: 20 },
  ];

  sheet.columns = columns;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Add data rows
  for (const obj of realObjects) {
    const data = obj.attributes as Record<string, unknown>;
    const row: Record<string, unknown> = {
      objectID: obj.object_icml_id ?? obj.id,
      confidence: obj.confidence ? `${obj.confidence}%` : "",
      rubricScore: obj.rubric_score ?? "",
      rubricLevel: obj.rubric_level ?? "",
      sourceRef: obj.source_clause_text ?? "",
    };

    for (const attr of objectSpec.attributes) {
      const value = data[attr.name];
      if (Array.isArray(value)) {
        row[attr.name] = value.join(", ");
      } else if (value != null) {
        row[attr.name] = String(value);
      } else {
        row[attr.name] = "";
      }
    }

    sheet.addRow(row);
  }

  // Apply conditional formatting for risk level
  const riskColIndex = objectSpec.attributes.findIndex(
    (a) => a.name === "riskLevel"
  );
  if (riskColIndex >= 0) {
    const colNum = riskColIndex + 2; // +1 for objectID column, +1 for 1-indexed
    for (let rowNum = 2; rowNum <= realObjects.length + 1; rowNum++) {
      const cell = sheet.getRow(rowNum).getCell(colNum);
      const value = String(cell.value ?? "").toLowerCase();
      if (value === "high") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
        cell.font = { color: { argb: "FFDC2626" } };
      } else if (value === "medium") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFBEB" },
        };
        cell.font = { color: { argb: "FFD97706" } };
      } else if (value === "low") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0FDF4" },
        };
        cell.font = { color: { argb: "FF16A34A" } };
      }
    }
  }

  // ─── Sheet 2: Summary ──────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 40 },
  ];

  const headerRow2 = summarySheet.getRow(1);
  headerRow2.font = { bold: true };

  const scoredObjects = realObjects.filter((o) => o.rubric_score != null);
  const avgScore =
    scoredObjects.length > 0
      ? (
          scoredObjects.reduce((s, o) => s + (o.rubric_score ?? 0), 0) /
          scoredObjects.length
        ).toFixed(1)
      : "N/A";
  const avgConfidence =
    realObjects.length > 0
      ? Math.round(
          realObjects.reduce((s, o) => s + (o.confidence ?? 0), 0) /
            realObjects.length
        )
      : 0;

  const summaryData = [
    { metric: "Extraction ID", value: metadata.extractionId },
    { metric: "CTX File", value: metadata.ctxName },
    { metric: "Source Document", value: metadata.sourceFileName },
    { metric: "Export Date", value: new Date().toISOString() },
    { metric: "Total Objects Extracted", value: String(realObjects.length) },
    { metric: "Average Rubric Score", value: `${avgScore}/5` },
    { metric: "Average Confidence", value: `${avgConfidence}%` },
    { metric: "Objects Scored", value: String(scoredObjects.length) },
  ];

  // Score distribution
  const distribution: Record<number, number> = {};
  for (const o of scoredObjects) {
    const score = o.rubric_score ?? 0;
    distribution[score] = (distribution[score] ?? 0) + 1;
  }
  for (let i = 1; i <= 5; i++) {
    summaryData.push({
      metric: `Score ${i} Count`,
      value: String(distribution[i] ?? 0),
    });
  }

  for (const row of summaryData) {
    summarySheet.addRow(row);
  }

  // ─── Sheet 3: Relationships ─────────────────────────────────────────
  if (relationshipRecords.length > 0) {
    const relSheet = workbook.addWorksheet("Relationships");
    relSheet.columns = [
      { header: "From Object", key: "from", width: 22 },
      { header: "To Object", key: "to", width: 22 },
      { header: "Type", key: "type", width: 18 },
      { header: "Direction", key: "direction", width: 16 },
      { header: "Confidence", key: "confidence", width: 14 },
      { header: "Source", key: "source", width: 16 },
      { header: "Description", key: "description", width: 45 },
    ];

    const relHeaderRow = relSheet.getRow(1);
    relHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    relHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };

    for (const rel of relationshipRecords) {
      relSheet.addRow({
        from: rel.from_object_icml_id,
        to: rel.to_object_icml_id,
        type: rel.relationship_type.replace(/_/g, " "),
        direction:
          rel.direction === "bidirectional"
            ? "↔ Bidirectional"
            : "→ Unidirectional",
        confidence: `${rel.confidence}%`,
        source: rel.source.replace(/_/g, " "),
        description: rel.description ?? "",
      });
    }
  }

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
