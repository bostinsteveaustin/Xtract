// Contract AI extractor
// Pass 1: main extraction (first 52K chars)
// Pass 2: tail-pass (last 20K chars) — targets governing law, dates, dispute resolution
// Optional CTX content injected into system prompt when provided

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

function buildSystemPrompt(ctxContent?: string): string {
  const base = `You are a contract intelligence extraction specialist. Your job is to extract structured data from commercial agreements with precision and completeness.

You must output ONLY valid JSON matching the exact schema provided. No explanations, no markdown code blocks — raw JSON only.

Core extraction rules:
- Use the contract's own defined terms, not plain-language interpretation
- Resolve cross-references where possible; flag as low confidence if you cannot
- Distinguish between implied obligations (medium confidence) and stated obligations (high confidence)
- Boilerplate clauses (entire agreement, severability, waiver) should be extracted but marked low risk
- Recitals provide context but may not create binding obligations — assess carefully
- Schedules often contain the most commercially significant terms — process thoroughly
- For monetary amounts, extract the numeric value separately from the currency code
- Every object MUST have a sourceClause reference
- Insurance requirements are obligations, NOT financial terms — do not create FinancialTerm objects for insurance minimums
- When an obligation applies to both parties, create ONE object with obligatedParty set to the primary obligor and note "Both parties" in the description — do NOT create duplicate objects for the same clause`;

  if (!ctxContent?.trim()) return base;

  return `${base}

--- EXTRACTION GUIDANCE (CTX) ---
${ctxContent.trim()}
--- END CTX ---`;
}

function buildMainPrompt(documentText: string, engagementRef: string): string {
  const truncated = documentText.slice(0, 52000);
  return `Extract all contract intelligence from this commercial agreement. Engagement reference: ${engagementRef}

CONTRACT TEXT:
${truncated}

Output a single JSON object:

{
  "parties": [{
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
  }],
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
  "obligations": [{
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
  }],
  "financialTerms": [{
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
  }],
  "serviceLevels": [{
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
  }],
  "liabilityProvisions": [{
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
  }],
  "terminationProvisions": [{
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
  }],
  "disputeResolution": {
    "disputeID": "icml:DSP-${engagementRef}-001",
    "governingLaw": "Laws of England and Wales",
    "jurisdiction": "Courts of England and Wales",
    "mechanism": "litigation|arbitration|mediation|expert_determination|tiered",
    "escalationSequence": "Senior manager negotiation (20 days) → mediation → litigation",
    "arbitrationRules": null,
    "venue": "London",
    "timeframe": "30 days written notice to initiate",
    "fullText": "Verbatim clause text",
    "sourceClause": "Clause 19",
    "confidence": "high"
  },
  "relationships": [{
    "sourceObjectId": "icml:OBL-${engagementRef}-001",
    "targetObjectId": "icml:LIA-${engagementRef}-001",
    "relationshipType": "subject_to|conditional_on|supplements|amends|supersedes|related_to|conflicts_with|implements",
    "direction": "unidirectional|bidirectional",
    "confidence": "high|medium|low",
    "sourceEvidence": "Clause text establishing this cross-reference"
  }]
}

IMPORTANT: Do NOT create FinancialTerm objects for insurance minimum requirements — these belong in obligations only. Financial terms are money flows between contracting parties (fees, charges, payments).

Extract ALL obligations, financial terms, SLAs, liability provisions, and termination provisions. Be thorough. Use null for optional fields you cannot find.`;
}

function buildTailPrompt(tailText: string, engagementRef: string): string {
  return `This is the FINAL SECTION of a commercial agreement (engagement: ${engagementRef}). Extract ONLY the following fields that may appear in this section. Return a JSON object — use null for anything not found.

DOCUMENT TAIL:
${tailText}

Return ONLY this JSON structure:
{
  "agreement_patch": {
    "effectiveDate": "YYYY-MM-DD or null",
    "expiryDate": "YYYY-MM-DD or null",
    "executionDate": "YYYY-MM-DD or null",
    "governingLaw": "e.g. Laws of England and Wales or null",
    "jurisdiction": "e.g. Courts of England and Wales or null",
    "agreementType": "msa|sow|amendment|side_letter|schedule|licence|nda|services_agreement|supply_agreement|other or null"
  },
  "disputeResolution": {
    "disputeID": "icml:DSP-${engagementRef}-001",
    "governingLaw": "Laws of England and Wales or null",
    "jurisdiction": "Courts of England and Wales or null",
    "mechanism": "litigation|arbitration|mediation|expert_determination|tiered or null",
    "escalationSequence": "full sequence or null",
    "arbitrationRules": "ICC/LCIA/UNCITRAL or null",
    "venue": "city or null",
    "timeframe": "any time limits or null",
    "fullText": "verbatim clause text or null",
    "sourceClause": "Clause X or null",
    "confidence": "high|medium|low"
  }
}

Look specifically for: governing law clause, jurisdiction clause, dispute resolution / escalation clause, execution date / signing date, effective date, agreement type indicators (MSA, SOW, framework, etc.). DocuSign timestamps count as execution dates.`;
}

function parseJsonSafe<T>(raw: string): T | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]) as T; } catch { return null; }
  }
}

/** Remove FinancialTerm objects that duplicate insurance obligations */
function dedupeInsurance(financialTerms: FinancialTerm[]): FinancialTerm[] {
  return financialTerms.filter((f) => f.termType !== "insurance_requirement");
}

/**
 * Deduplicate obligations by (name, sourceClause) — keeps the first occurrence.
 * Prevents Claude returning the same clause twice when it applies to both parties.
 */
function dedupeObligations(obligations: ContractObligation[]): ContractObligation[] {
  const seen = new Set<string>();
  return obligations.filter((o) => {
    const key = `${o.name.toLowerCase().trim()}|${o.sourceClause?.toLowerCase().trim() ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countConfidence(items: { confidence: string }[]) {
  return {
    high: items.filter((i) => i.confidence === "high").length,
    medium: items.filter((i) => i.confidence === "medium").length,
    low: items.filter((i) => i.confidence === "low").length,
  };
}

function countRisk(items: { riskLevel?: string }[]): number {
  return items.filter((i) => i.riskLevel === "high" || i.riskLevel === "critical").length;
}

export interface ExtractionOutput {
  result: ContractExtractionResult;
  metrics: ContractExtractionMetrics;
  logEntries: LogEntry[];
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export async function extractContract(
  documentText: string,
  engagementRef: string,
  ctxContent?: string
): Promise<ExtractionOutput> {
  const log: LogEntry[] = [];
  const ref = makeEngagementRef(engagementRef);
  let totalIn = 0, totalOut = 0;

  log.push({ timestamp: ts(), level: "info", message: "Starting AI extraction...", icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Engagement reference: ${ref}`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Document: ${documentText.length.toLocaleString()} characters`, icon: "check" });

  if (ctxContent?.trim()) {
    log.push({ timestamp: ts(), level: "info", message: "CTX guidance loaded — applying to extraction", icon: "check" });
  }

  const systemPrompt = buildSystemPrompt(ctxContent);

  // ── Pass 1: Main extraction ───────────────────────────────────────────────
  log.push({ timestamp: ts(), level: "info", message: "Pass 1 — main clause extraction...", icon: "check" });

  const pass1 = await generateText({
    model: extractionModel,
    system: systemPrompt,
    prompt: buildMainPrompt(documentText, ref),
    maxOutputTokens: 12000,
  });

  totalIn += pass1.usage?.inputTokens ?? 0;
  totalOut += pass1.usage?.outputTokens ?? 0;

  log.push({
    timestamp: ts(),
    level: "info",
    message: `Pass 1 tokens: ${(pass1.usage?.inputTokens ?? 0).toLocaleString()} in / ${(pass1.usage?.outputTokens ?? 0).toLocaleString()} out`,
    icon: "check",
  });

  type ParsedMain = {
    parties?: ContractParty[];
    agreement?: Agreement;
    obligations?: ContractObligation[];
    financialTerms?: FinancialTerm[];
    serviceLevels?: ServiceLevel[];
    liabilityProvisions?: LiabilityProvision[];
    terminationProvisions?: TerminationProvision[];
    disputeResolution?: DisputeResolution;
    relationships?: ObjectRelationship[];
  };

  const parsed = parseJsonSafe<ParsedMain>(pass1.text);
  if (!parsed) {
    throw new Error("Pass 1: Claude did not return valid JSON");
  }

  // ── Pass 2: Tail-pass for governing law, dates, dispute resolution ────────
  const tailStart = Math.max(0, documentText.length - 20000);
  const tailText = documentText.slice(tailStart);
  const hasTail = tailStart > 0; // only run if there's meaningful tail content

  type TailResult = {
    agreement_patch?: Partial<Agreement>;
    disputeResolution?: DisputeResolution;
  };

  let tailParsed: TailResult | null = null;

  if (hasTail) {
    log.push({ timestamp: ts(), level: "info", message: "Pass 2 — tail scan for governing law, dates, dispute resolution...", icon: "check" });

    const pass2 = await generateText({
      model: extractionModel,
      system: `You are a contract metadata specialist. Extract only what is asked. Return raw JSON only.`,
      prompt: buildTailPrompt(tailText, ref),
      maxOutputTokens: 1500,
    });

    totalIn += pass2.usage?.inputTokens ?? 0;
    totalOut += pass2.usage?.outputTokens ?? 0;

    tailParsed = parseJsonSafe<TailResult>(pass2.text);

    log.push({
      timestamp: ts(),
      level: "info",
      message: `Pass 2 tokens: ${(pass2.usage?.inputTokens ?? 0).toLocaleString()} in / ${(pass2.usage?.outputTokens ?? 0).toLocaleString()} out`,
      icon: "check",
    });
  }

  // ── Merge pass 1 + pass 2 ─────────────────────────────────────────────────
  let agreement = parsed.agreement ?? null;

  if (agreement && tailParsed?.agreement_patch) {
    const patch = tailParsed.agreement_patch;
    // Only fill in nulls — don't overwrite confident pass-1 extractions
    if (!agreement.effectiveDate && patch.effectiveDate) agreement.effectiveDate = patch.effectiveDate;
    if (!agreement.expiryDate && patch.expiryDate) agreement.expiryDate = patch.expiryDate;
    if (!agreement.executionDate && patch.executionDate) agreement.executionDate = patch.executionDate;
    if (!agreement.governingLaw && patch.governingLaw) agreement.governingLaw = patch.governingLaw;
    if (!agreement.jurisdiction && patch.jurisdiction) agreement.jurisdiction = patch.jurisdiction;
    if (agreement.agreementType === "other" && patch.agreementType) agreement.agreementType = patch.agreementType;
  }

  // Use tail dispute resolution if pass 1 left it empty
  const pass1Dispute = parsed.disputeResolution;
  const tailDispute = tailParsed?.disputeResolution;
  let disputeResolution: DisputeResolution | null = null;

  if (pass1Dispute?.governingLaw || pass1Dispute?.mechanism) {
    disputeResolution = pass1Dispute;
  } else if (tailDispute?.governingLaw || tailDispute?.mechanism) {
    disputeResolution = tailDispute;
    log.push({ timestamp: ts(), level: "info", message: "Dispute resolution recovered from document tail", icon: "check" });
  }

  // ── Dedup obligations (same name + clause = same obligation) ─────────────
  const rawObligations = parsed.obligations ?? [];
  const obligations = dedupeObligations(rawObligations);
  if (rawObligations.length !== obligations.length) {
    log.push({
      timestamp: ts(),
      level: "info",
      message: `Removed ${rawObligations.length - obligations.length} duplicate obligation(s)`,
      icon: "check",
    });
  }

  // ── Dedup insurance from financial terms ──────────────────────────────────
  const rawFinancialTerms = parsed.financialTerms ?? [];
  const financialTerms = dedupeInsurance(rawFinancialTerms);
  if (rawFinancialTerms.length !== financialTerms.length) {
    log.push({
      timestamp: ts(),
      level: "info",
      message: `Removed ${rawFinancialTerms.length - financialTerms.length} insurance item(s) from financial terms (captured in obligations)`,
      icon: "check",
    });
  }

  // ── Assemble result ───────────────────────────────────────────────────────
  const result: ContractExtractionResult = {
    engagementRef: ref,
    parties: parsed.parties ?? [],
    agreement,
    obligations,
    financialTerms,
    serviceLevels: parsed.serviceLevels ?? [],
    liabilityProvisions: parsed.liabilityProvisions ?? [],
    terminationProvisions: parsed.terminationProvisions ?? [],
    disputeResolution,
    relationships: parsed.relationships ?? [],
  };

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

  const cc = countConfidence(allConfidenceItems);

  const metrics: ContractExtractionMetrics = {
    parties: result.parties.length,
    obligations: result.obligations.length,
    financialTerms: result.financialTerms.length,
    serviceLevels: result.serviceLevels.length,
    liabilityProvisions: result.liabilityProvisions.length,
    terminationProvisions: result.terminationProvisions.length,
    relationships: result.relationships.length,
    highConfidence: cc.high,
    mediumConfidence: cc.medium,
    lowConfidence: cc.low,
    highRisk: countRisk(result.obligations),
  };

  const tokenUsage = { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut };

  log.push({ timestamp: ts(), level: "info", message: `Parties: ${metrics.parties} | Obligations: ${metrics.obligations} | Financial: ${metrics.financialTerms}`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `SLAs: ${metrics.serviceLevels} | Liability: ${metrics.liabilityProvisions} | Termination: ${metrics.terminationProvisions}`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: `Relationships: ${metrics.relationships} | Governing law: ${result.agreement?.governingLaw ?? "not found"}`, icon: "check" });

  if (metrics.highRisk > 0) {
    log.push({ timestamp: ts(), level: "warning", message: `${metrics.highRisk} high/critical risk item${metrics.highRisk === 1 ? "" : "s"} — review required`, icon: "flag" });
  }

  log.push({ timestamp: ts(), level: "info", message: `Total tokens: ${tokenUsage.totalTokens.toLocaleString()}`, icon: "check" });
  log.push({ timestamp: ts(), level: "info", message: "Extraction complete", icon: "check" });

  return { result, metrics, logEntries: log, tokenUsage };
}
