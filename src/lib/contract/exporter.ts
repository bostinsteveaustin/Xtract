// Contract exporter
// Generates iCML JSON and 7-tab XLSX workbook from extraction result

import ExcelJS from "exceljs";
import type { ContractExtractionResult } from "@/types/contract";

// ─── iCML JSON ────────────────────────────────────────────────────────────────

export function buildIcmlJson(
  result: ContractExtractionResult,
  runId: string
): string {
  const payload = {
    extraction: {
      pipeline: "contract",
      pipelineVersion: "1.0",
      timestamp: new Date().toISOString(),
      runId,
      engagementRef: result.engagementRef,
      ctxReference: null,
    },
    parties: result.parties,
    agreement: result.agreement,
    obligations: result.obligations,
    financialTerms: result.financialTerms,
    serviceLevels: result.serviceLevels,
    liabilityProvisions: result.liabilityProvisions,
    terminationProvisions: result.terminationProvisions,
    disputeResolution: result.disputeResolution,
    relationships: result.relationships,
  };

  return JSON.stringify(payload, null, 2);
}

// ─── XLSX 7-tab workbook ──────────────────────────────────────────────────────

const NAVY = "FF1B2F5E";
const WHITE = "FFFFFFFF";
const LIGHT_BLUE = "FFD5E8F0";
const RED_LIGHT = "FFFDE8E8";
const AMBER_LIGHT = "FFFFF3CD";

function headerStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
  cell.alignment = { vertical: "middle", wrapText: false };
}

function setHeaders(sheet: ExcelJS.Worksheet, headers: string[]) {
  const row = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1);
    cell.value = h;
    headerStyle(cell);
  });
  row.height = 22;
  row.commit();
}

function riskFill(risk?: string): ExcelJS.Fill {
  if (risk === "critical" || risk === "high") {
    return { type: "pattern", pattern: "solid", fgColor: { argb: RED_LIGHT } };
  }
  if (risk === "medium") {
    return { type: "pattern", pattern: "solid", fgColor: { argb: AMBER_LIGHT } };
  }
  return { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };
}

export async function buildXlsx(result: ContractExtractionResult): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Xtract Contract Pipeline v1.0";
  wb.created = new Date();

  // ── Tab 1: Summary ────────────────────────────────────────────────────────
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 55 },
  ];
  setHeaders(summary, ["Field", "Value"]);

  const ag = result.agreement;
  const summaryRows = [
    ["Engagement Reference", result.engagementRef],
    ["Document Title", ag?.title ?? "—"],
    ["Agreement Type", ag?.agreementType ?? "—"],
    ["Effective Date", ag?.effectiveDate ?? "—"],
    ["Expiry Date", ag?.expiryDate ?? "—"],
    ["Initial Term", ag?.initialTerm ?? "—"],
    ["Governing Law", ag?.governingLaw ?? "—"],
    ["Jurisdiction", ag?.jurisdiction ?? "—"],
    [""],
    ["— Extraction Statistics —", ""],
    ["Parties", String(result.parties.length)],
    ["Obligations", String(result.obligations.length)],
    ["Financial Terms", String(result.financialTerms.length)],
    ["Service Levels (SLAs)", String(result.serviceLevels.length)],
    ["Liability Provisions", String(result.liabilityProvisions.length)],
    ["Termination Provisions", String(result.terminationProvisions.length)],
    ["Relationship Edges", String(result.relationships.length)],
  ];

  summaryRows.forEach((r) => {
    const row = summary.addRow({ field: r[0], value: r[1] ?? "" });
    if (r[0]?.startsWith("—")) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
      row.font = { bold: true };
    }
    row.commit();
  });

  // Parties section
  summary.addRow({});
  const partiesHeader = summary.addRow({ field: "Parties", value: "" });
  partiesHeader.getCell(1).font = { bold: true };
  partiesHeader.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
  partiesHeader.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };

  result.parties.forEach((p) => {
    summary.addRow({ field: `${p.role.replace("_", " ").toUpperCase()}`, value: `${p.legalName}${p.commonName ? ` (${p.commonName})` : ""}` }).commit();
  });

  // ── Tab 2: Obligations ────────────────────────────────────────────────────
  const obSheet = wb.addWorksheet("Obligations");
  obSheet.columns = [
    { key: "obligationID", width: 28 },
    { key: "name", width: 35 },
    { key: "obligationType", width: 20 },
    { key: "obligatedParty", width: 30 },
    { key: "riskLevel", width: 12 },
    { key: "trigger", width: 30 },
    { key: "dueDate", width: 20 },
    { key: "survivalPeriod", width: 20 },
    { key: "sourceClause", width: 18 },
    { key: "confidence", width: 12 },
    { key: "description", width: 60 },
  ];
  setHeaders(obSheet, [
    "ID", "Name", "Type", "Obligated Party", "Risk", "Trigger", "Due / Frequency",
    "Survival", "Clause", "Confidence", "Description",
  ]);

  result.obligations.forEach((o) => {
    const row = obSheet.addRow({
      obligationID: o.obligationID,
      name: o.name,
      obligationType: o.obligationType,
      obligatedParty: o.obligatedParty,
      riskLevel: o.riskLevel ?? "",
      trigger: o.trigger ?? "",
      dueDate: o.dueDate ?? "",
      survivalPeriod: o.survivalPeriod ?? "",
      sourceClause: o.sourceClause,
      confidence: o.confidence,
      description: o.description,
    });
    row.getCell(5).fill = riskFill(o.riskLevel);
    row.commit();
  });
  obSheet.autoFilter = { from: "A1", to: "K1" };

  // ── Tab 3: Financial Terms ────────────────────────────────────────────────
  const finSheet = wb.addWorksheet("Financial Terms");
  finSheet.columns = [
    { key: "financialTermID", width: 28 },
    { key: "name", width: 35 },
    { key: "termType", width: 22 },
    { key: "amount", width: 15 },
    { key: "currency", width: 10 },
    { key: "frequency", width: 22 },
    { key: "paymentTerms", width: 28 },
    { key: "adjustmentMechanism", width: 28 },
    { key: "payingParty", width: 28 },
    { key: "receivingParty", width: 28 },
    { key: "sourceClause", width: 18 },
    { key: "confidence", width: 12 },
  ];
  setHeaders(finSheet, [
    "ID", "Name", "Type", "Amount", "Currency", "Frequency", "Payment Terms",
    "Adjustment", "Paying Party", "Receiving Party", "Clause", "Confidence",
  ]);
  result.financialTerms.forEach((f) => {
    finSheet.addRow({
      financialTermID: f.financialTermID,
      name: f.name,
      termType: f.termType,
      amount: f.amount ?? "",
      currency: f.currency ?? "",
      frequency: f.frequency ?? "",
      paymentTerms: f.paymentTerms ?? "",
      adjustmentMechanism: f.adjustmentMechanism ?? "",
      payingParty: f.payingParty,
      receivingParty: f.receivingParty,
      sourceClause: f.sourceClause,
      confidence: f.confidence,
    }).commit();
  });
  finSheet.autoFilter = { from: "A1", to: "L1" };

  // ── Tab 4: SLAs ───────────────────────────────────────────────────────────
  const slaSheet = wb.addWorksheet("SLAs");
  slaSheet.columns = [
    { key: "serviceLevelID", width: 28 },
    { key: "name", width: 35 },
    { key: "metric", width: 30 },
    { key: "target", width: 25 },
    { key: "measurementPeriod", width: 22 },
    { key: "remedyThreshold", width: 22 },
    { key: "remedy", width: 35 },
    { key: "exclusions", width: 35 },
    { key: "responsibleParty", width: 28 },
    { key: "sourceClause", width: 18 },
    { key: "confidence", width: 12 },
  ];
  setHeaders(slaSheet, [
    "ID", "Name", "Metric", "Target", "Measurement Period", "Remedy Threshold",
    "Remedy", "Exclusions", "Responsible Party", "Clause", "Confidence",
  ]);
  result.serviceLevels.forEach((s) => {
    slaSheet.addRow({
      serviceLevelID: s.serviceLevelID,
      name: s.name,
      metric: s.metric,
      target: s.target,
      measurementPeriod: s.measurementPeriod ?? "",
      remedyThreshold: s.remedyThreshold ?? "",
      remedy: s.remedy ?? "",
      exclusions: s.exclusions ?? "",
      responsibleParty: s.responsibleParty,
      sourceClause: s.sourceClause,
      confidence: s.confidence,
    }).commit();
  });
  slaSheet.autoFilter = { from: "A1", to: "K1" };

  // ── Tab 5: Liability & Risk ────────────────────────────────────────────────
  const liaSheet = wb.addWorksheet("Liability & Risk");
  liaSheet.columns = [
    { key: "liabilityID", width: 28 },
    { key: "name", width: 35 },
    { key: "provisionType", width: 25 },
    { key: "capAmount", width: 15 },
    { key: "capFormula", width: 30 },
    { key: "currency", width: 10 },
    { key: "scope", width: 35 },
    { key: "carveOuts", width: 35 },
    { key: "indemnifyingParty", width: 28 },
    { key: "beneficiary", width: 28 },
    { key: "survivalPeriod", width: 20 },
    { key: "sourceClause", width: 18 },
    { key: "confidence", width: 12 },
  ];
  setHeaders(liaSheet, [
    "ID", "Name", "Type", "Cap Amount", "Cap Formula", "Currency", "Scope",
    "Carve-outs", "Indemnifying Party", "Beneficiary", "Survival", "Clause", "Confidence",
  ]);
  result.liabilityProvisions.forEach((l) => {
    liaSheet.addRow({
      liabilityID: l.liabilityID,
      name: l.name,
      provisionType: l.provisionType,
      capAmount: l.capAmount ?? "",
      capFormula: l.capFormula ?? "",
      currency: l.currency ?? "",
      scope: l.scope ?? "",
      carveOuts: l.carveOuts ?? "",
      indemnifyingParty: l.indemnifyingParty ?? "",
      beneficiary: l.beneficiary ?? "",
      survivalPeriod: l.survivalPeriod ?? "",
      sourceClause: l.sourceClause,
      confidence: l.confidence,
    }).commit();
  });
  liaSheet.autoFilter = { from: "A1", to: "M1" };

  // ── Tab 6: Termination & Renewal ──────────────────────────────────────────
  const trmSheet = wb.addWorksheet("Termination & Renewal");
  trmSheet.columns = [
    { key: "terminationID", width: 28 },
    { key: "name", width: 35 },
    { key: "provisionType", width: 28 },
    { key: "noticePeriod", width: 20 },
    { key: "triggerCondition", width: 40 },
    { key: "consequences", width: 40 },
    { key: "renewalTerms", width: 35 },
    { key: "exercisingParty", width: 20 },
    { key: "sourceClause", width: 18 },
    { key: "confidence", width: 12 },
  ];
  setHeaders(trmSheet, [
    "ID", "Name", "Type", "Notice Period", "Trigger Condition", "Consequences",
    "Renewal Terms", "Exercising Party", "Clause", "Confidence",
  ]);
  result.terminationProvisions.forEach((t) => {
    trmSheet.addRow({
      terminationID: t.terminationID,
      name: t.name,
      provisionType: t.provisionType,
      noticePeriod: t.noticePeriod ?? "",
      triggerCondition: t.triggerCondition ?? "",
      consequences: t.consequences ?? "",
      renewalTerms: t.renewalTerms ?? "",
      exercisingParty: t.exercisingParty ?? "",
      sourceClause: t.sourceClause,
      confidence: t.confidence,
    }).commit();
  });
  trmSheet.autoFilter = { from: "A1", to: "J1" };

  // ── Tab 7: Relationships ──────────────────────────────────────────────────
  const relSheet = wb.addWorksheet("Relationships");
  relSheet.columns = [
    { key: "sourceObjectId", width: 32 },
    { key: "targetObjectId", width: 32 },
    { key: "relationshipType", width: 22 },
    { key: "direction", width: 18 },
    { key: "confidence", width: 12 },
    { key: "sourceEvidence", width: 60 },
  ];
  setHeaders(relSheet, [
    "Source Object", "Target Object", "Relationship Type", "Direction", "Confidence", "Source Evidence",
  ]);
  result.relationships.forEach((r) => {
    relSheet.addRow({
      sourceObjectId: r.sourceObjectId,
      targetObjectId: r.targetObjectId,
      relationshipType: r.relationshipType,
      direction: r.direction,
      confidence: r.confidence,
      sourceEvidence: r.sourceEvidence,
    }).commit();
  });
  relSheet.autoFilter = { from: "A1", to: "F1" };

  // Freeze top row on all sheets
  wb.worksheets.forEach((ws) => {
    ws.views = [{ state: "frozen", ySplit: 1 }];
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
