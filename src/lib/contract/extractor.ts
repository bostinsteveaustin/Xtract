// Contract AI extractor
// Uses Claude to extract all 8 contract object types from document text

import { generateText } from "ai";
import { extractionModel } from "@/lib/ai/client";
import type {
  ContractParty,
  Agreement,
  ContractObligation,
  FinancialTerm,
  ServiceLevel,
  LiabilityProvision,
  TerminationProvision,
  DisputeResolution,
  ObjectRelationship,
  ContractExtractionResult,
  ContractExtractionMetrics,
} from "@/types/contract";
import type { LogEntry } from "@/types/pipeline";

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

function makeEngagementRef(raw?: string): string {
  return (raw ?? "ENG").replace(/[^A-Z0-9-]/gi, "-").toUpperCase().slice(0, 20) || "ENG";
}

const EXTRACTION_SYSTEM = `You are a contract intelligence extraction specialist. Your job is to extract structured data from commercial agreements with precision and completeness.

You must output ONLY valid JSON matching the exact schema provided. No explanations, no markdown code blocks — raw JSON only.

Extraction rules:
- Use the contract's own defined terms, not plain-language interpretation
- Resolve cross-references where possible; flag as low confidence if you cannot
- Distinguish between implied obligations (medium confidence) and stated obligations (high confidence)
- Boilerplate clauses (entire agreement, severability, waiver) should be extracted but marked low risk
- Recitals provide context but may not create binding obligations — assess carefully
- Schedules often contain the most commercially significant terms — process thoroughly
- For monetary amounts, extract the numeric value separately from the currency code
- Every object MUST have a sourceClause reference`;

function buildExtractionPrompt(
  documentText: string,
  engagementRef: string
): string {
  const truncated = documentText.slice(0, 55000);

  return `Extract all contract intelligence from this commercial agreement. Engagement reference: ${engagementRef}

CONTRACT TEXT:
${truncated}

Output a single JSON object with this exact structure:

{
  "parties": [
    {
      "partyID": "icml:PTY-${engagementRef}-001",
      "legalName": "Full Legal Name Ltd",
      "commonName": "Short Name",
      "role": "service_provider|client|guarantor|subcontractor|affiliate|licensor|licensee|other",
      "jurisdiction": "England and Wales",
      "registrationNumber": "12345678",
      "noticeAddress": "...",
      "authorisedRepresentative": "...",
      "sourceClause": "Recitals / Clause 1",
      "confidence": "high|medium|low"
    }
  ],
  "agreement": {
    "agreementID": "icml:AGR-${engagementRef}-001",
    "title": "Master Services Agreement",
    "agreementType": "msa|sow|amendment|side_letter|schedule|licence|nda|services_agreement|supply_agreement|other",
    "effectiveDate": "2026-01-01",
    "expiryDate": "2029-01-01",
    "initialTerm": "3 years",
    "governingLaw": "Laws of England and Wales",
    "jurisdiction": "Courts of England and Wales",
    "executionDate": "2025-12-15",
    "version": "1.0",
    "parties": ["icml:PTY-${engagementRef}-001", "icml:PTY-${engagementRef}-002"],
    "sourceClause": "Clause 20 / Cover page",
    "confidence": "high"
  },
  "obligations": [
    {
      "obligationID": "icml:OBL-${engagementRef}-001",
      "name": "Short descriptive name",
      "description": "Natural language summary",
      "fullText": "Verbatim clause text",
      "obligationType": "performance|payment|reporting|compliance|cooperation|confidentiality|insurance|notification|non_compete|ip_assignment|data_protection|other",
      "obligatedParty": "icml:PTY-${engagementRef}-001",
      "counterparty": "icml:PTY-${engagementRef}-002",
      "trigger": "Condition that activates this obligation",
      "dueDate": "Within 30 days / annually",
      "performanceMetric": "How fulfilment is measured",
      "survivalPeriod": "2 years following termination",
      "riskLevel": "critical|high|medium|low|minimal",
      "sourceClause": "Clause 5.2(a)",
      "sourcePageRange": "p. 8",
      "confidence": "high|medium|low",
      "qualityScore": 4
    }
  ],
  "financialTerms": [
    {
      "financialTermID": "icml:FIN-${engagementRef}-001",
      "name": "Annual Licence Fee",
      "termType": "contract_value|fee_schedule|payment_terms|price_adjustment|late_payment|security_deposit|guarantee|other",
      "amount": 150000,
      "currency": "GBP",
      "frequency": "annually in advance",
      "paymentTerms": "Net 30 from invoice date",
      "adjustmentMechanism": "CPI indexed annually",
      "payingParty": "icml:PTY-${engagementRef}-002",
      "receivingParty": "icml:PTY-${engagementRef}-001",
      "fullText": "Verbatim clause text",
      "sourceClause": "Clause 8.1",
      "confidence": "high"
    }
  ],
  "serviceLevels": [
    {
      "serviceLevelID": "icml:SLA-${engagementRef}-001",
      "name": "Platform Uptime SLA",
      "description": "Summary",
      "metric": "Service availability",
      "target": "99.9% uptime per calendar month",
      "measurementPeriod": "Calendar month",
      "measurementMethod": "Automated monitoring",
      "remedyThreshold": "Below 99.5%",
      "remedy": "Service credits per Schedule 2",
      "exclusions": "Planned maintenance, force majeure",
      "responsibleParty": "icml:PTY-${engagementRef}-001",
      "fullText": "Verbatim clause text",
      "sourceClause": "Schedule 2, Clause 3",
      "confidence": "high"
    }
  ],
  "liabilityProvisions": [
    {
      "liabilityID": "icml:LIA-${engagementRef}-001",
      "name": "Aggregate Liability Cap",
      "provisionType": "liability_cap|per_incident_cap|indemnification|warranty|representation|insurance_requirement|limitation_exclusion|other",
      "description": "Summary",
      "capAmount": 500000,
      "capFormula": "12 months fees paid",
      "currency": "GBP",
      "scope": "All claims under or in connection with this Agreement",
      "carveOuts": "Death/personal injury, fraud, wilful misconduct",
      "indemnifyingParty": "icml:PTY-${engagementRef}-001",
      "beneficiary": "icml:PTY-${engagementRef}-002",
      "survivalPeriod": "6 years",
      "fullText": "Verbatim clause text",
      "sourceClause": "Clause 14.2",
      "confidence": "high"
    }
  ],
  "terminationProvisions": [
    {
      "terminationID": "icml:TRM-${engagementRef}-001",
      "name": "Termination for Convenience",
      "provisionType": "termination_for_cause|termination_for_convenience|auto_renewal|manual_renewal|expiry|step_in_rights|consequences_of_termination|other",
      "description": "Summary",
      "noticePeriod": "90 days written notice",
      "triggerCondition": "At any time after the Initial Term",
      "consequences": "Accrued fees payable, data return within 30 days",
      "renewalTerms": "Auto-renews for 12-month periods unless notice given",
      "exercisingParty": "Either party",
      "fullText": "Verbatim clause text",
      "sourceClause": "Clause 15.3",
      "confidence": "high"
    }
  ],
  "disputeResolution": {
    "disputeID": "icml:DSP-${engagementRef}-001",
    "governingLaw": "Laws of England and Wales",
    "jurisdiction": "Courts of England and Wales",
    "mechanism": "litigation|arbitration|mediation|expert_determination|tiered",
    "escalationSequence": "Senior manager negotiation (20 days) → mediation → litigation",
    "arbitrationRules": null,
    "venue": "London",
    "timeframe": "Initiating party must give written notice within 30 days of dispute arising",
    "fullText": "Verbatim clause text",
    "sourceClause": "Clause 19",
    "confidence": "high"
  },
  "relationships": [
    {
      "sourceObjectId": "icml:OBL-${engagementRef}-001",
      "targetObjectId": "icml:LIA-${engagementRef}-001",
      "relationshipType": "subject_to|conditional_on|supplements|amends|supersedes|related_to|conflicts_with|implements",
      "direction": "unidirectional|bidirectional",
      "confidence": "high|medium|low",
      "sourceEvidence": "Clause text establishing this cross-reference"
    }
  ]
}

Extract ALL obligations, financial terms, SLAs, liability provisions, and termination provisions you find. Be thorough — err on the side of extracting more rather than less. Use null for optional fields you cannot find.`;
}

function countConfidence(
  items: { confidence: string }[]
): { high: number; medium: number; low: number } {
  return {
    high: items.filter((i) => i.confidence === "high").length,
    medium: items.filter((i) => i.confidence === "medium").length,
    low: items.filter((i) => i.confidence === "low").length,
  };
}

function countRisk(
  items: { riskLevel?: string }[]
): number {
  return items.filter(
    (i) => i.riskLevel === "high" || i.riskLevel === "critical"
  ).length;
}

export interface ExtractionOutput {
  result: ContractExtractionResult;
  metrics: ContractExtractionMetrics;
  logEntries: LogEntry[];
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export async function extractContract(
  documentText: string,
  engagementRef: string
): Promise<ExtractionOutput> {
  const log: LogEntry[] = [];
  const ref = makeEngagementRef(engagementRef);

  log.push({ timestamp: ts(), level: "info", message: "Starting AI extraction...", icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Engagement reference: ${ref}`, icon: "check" });
  log.push({
    timestamp: ts(),
    level: "info",
    message: `Document length: ${documentText.length.toLocaleString()} characters`,
    icon: "check",
  });

  const prompt = buildExtractionPrompt(documentText, ref);

  log.push({ timestamp: ts(), level: "info", message: "Calling Claude for contract extraction...", icon: "check" });

  const aiResult = await generateText({
    model: extractionModel,
    system: EXTRACTION_SYSTEM,
    prompt,
    maxOutputTokens: 12000,
  });

  const inTok = aiResult.usage?.inputTokens ?? 0;
  const outTok = aiResult.usage?.outputTokens ?? 0;
  const tokenUsage = { promptTokens: inTok, completionTokens: outTok, totalTokens: inTok + outTok };

  log.push({
    timestamp: ts(),
    level: "info",
    message: `Tokens: ${inTok.toLocaleString()} in / ${outTok.toLocaleString()} out`,
    icon: "check",
  });

  // Parse JSON response — strip any accidental markdown wrapping
  let raw = aiResult.text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: Partial<{
    parties: ContractParty[];
    agreement: Agreement;
    obligations: ContractObligation[];
    financialTerms: FinancialTerm[];
    serviceLevels: ServiceLevel[];
    liabilityProvisions: LiabilityProvision[];
    terminationProvisions: TerminationProvision[];
    disputeResolution: DisputeResolution;
    relationships: ObjectRelationship[];
  }>;

  try {
    parsed = JSON.parse(raw);
  } catch {
    log.push({ timestamp: ts(), level: "error", message: "Failed to parse JSON response — attempting recovery", icon: "cross" });
    // Try to find JSON object in the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Claude did not return valid JSON");
    parsed = JSON.parse(match[0]);
  }

  const result: ContractExtractionResult = {
    engagementRef: ref,
    parties: parsed.parties ?? [],
    agreement: parsed.agreement ?? null,
    obligations: parsed.obligations ?? [],
    financialTerms: parsed.financialTerms ?? [],
    serviceLevels: parsed.serviceLevels ?? [],
    liabilityProvisions: parsed.liabilityProvisions ?? [],
    terminationProvisions: parsed.terminationProvisions ?? [],
    disputeResolution: parsed.disputeResolution ?? null,
    relationships: parsed.relationships ?? [],
  };

  // Build metrics
  const allConfidenceItems = [
    ...result.parties,
    ...result.obligations,
    ...result.financialTerms,
    ...result.serviceLevels,
    ...result.liabilityProvisions,
    ...result.terminationProvisions,
    ...(result.agreement ? [result.agreement] : []),
    ...(result.disputeResolution ? [result.disputeResolution] : []),
  ];

  const confidenceCounts = countConfidence(allConfidenceItems);

  const metrics: ContractExtractionMetrics = {
    parties: result.parties.length,
    obligations: result.obligations.length,
    financialTerms: result.financialTerms.length,
    serviceLevels: result.serviceLevels.length,
    liabilityProvisions: result.liabilityProvisions.length,
    terminationProvisions: result.terminationProvisions.length,
    relationships: result.relationships.length,
    highConfidence: confidenceCounts.high,
    mediumConfidence: confidenceCounts.medium,
    lowConfidence: confidenceCounts.low,
    highRisk: countRisk(result.obligations),
  };

  log.push({
    timestamp: ts(),
    level: "info",
    message: `Extracted: ${metrics.parties} parties, ${metrics.obligations} obligations, ${metrics.financialTerms} financial terms`,
    icon: "check",
  });
  log.push({
    timestamp: ts(),
    level: "info",
    message: `SLAs: ${metrics.serviceLevels}, liability provisions: ${metrics.liabilityProvisions}, termination: ${metrics.terminationProvisions}`,
    icon: "check",
  });
  if (metrics.highRisk > 0) {
    log.push({
      timestamp: ts(),
      level: "warning",
      message: `${metrics.highRisk} high/critical risk item${metrics.highRisk === 1 ? "" : "s"} identified — review required`,
      icon: "flag",
    });
  }
  log.push({
    timestamp: ts(),
    level: "info",
    message: `${metrics.relationships} relationship edges mapped`,
    icon: "check",
  });
  log.push({ timestamp: ts(), level: "info", message: "Extraction complete", icon: "check" });

  return { result, metrics, logEntries: log, tokenUsage };
}
