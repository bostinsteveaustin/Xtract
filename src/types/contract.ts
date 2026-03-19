// ─── Contract Domain Extension — iCML Object Types ───────────────────────────
// Conforms to XTRACT-SPEC-CONTRACT-v1.0

export type ConfidenceLevel = "high" | "medium" | "low";
export type RiskLevel = "critical" | "high" | "medium" | "low" | "minimal";

// ─── ContractParty ────────────────────────────────────────────────────────────

export type PartyRole =
  | "service_provider"
  | "client"
  | "guarantor"
  | "subcontractor"
  | "affiliate"
  | "licensor"
  | "licensee"
  | "other";

export interface ContractParty {
  partyID: string;           // icml:PTY-{engagement}-{seq}
  legalName: string;
  commonName?: string;
  role: PartyRole;
  jurisdiction?: string;
  registrationNumber?: string;
  noticeAddress?: string;
  authorisedRepresentative?: string;
  sourceClause: string;
  confidence: ConfidenceLevel;
}

// ─── Agreement ────────────────────────────────────────────────────────────────

export type AgreementType =
  | "msa"
  | "sow"
  | "amendment"
  | "side_letter"
  | "schedule"
  | "licence"
  | "nda"
  | "services_agreement"
  | "supply_agreement"
  | "other";

export interface Agreement {
  agreementID: string;       // icml:AGR-{engagement}-{seq}
  title: string;
  agreementType: AgreementType;
  effectiveDate: string;
  expiryDate?: string;
  initialTerm?: string;
  governingLaw: string;
  jurisdiction: string;
  executionDate?: string;
  version?: string;
  parties: string[];         // partyID references
  sourceClause: string;
  confidence: ConfidenceLevel;
}

// ─── ContractObligation ───────────────────────────────────────────────────────

export type ObligationType =
  | "performance"
  | "payment"
  | "reporting"
  | "compliance"
  | "cooperation"
  | "confidentiality"
  | "insurance"
  | "notification"
  | "non_compete"
  | "ip_assignment"
  | "data_protection"
  | "other";

export interface ContractObligation {
  obligationID: string;      // icml:OBL-{engagement}-{seq}
  name: string;
  description: string;
  fullText: string;
  obligationType: ObligationType;
  obligatedParty: string;    // partyID reference
  counterparty?: string;     // partyID reference
  trigger?: string;
  dueDate?: string;
  performanceMetric?: string;
  survivalPeriod?: string;
  riskLevel?: RiskLevel;
  sourceClause: string;
  sourcePageRange?: string;
  confidence: ConfidenceLevel;
  qualityScore?: number;     // 1-5
}

// ─── FinancialTerm ────────────────────────────────────────────────────────────

export type FinancialTermType =
  | "contract_value"
  | "fee_schedule"
  | "payment_terms"
  | "price_adjustment"
  | "late_payment"
  | "security_deposit"
  | "guarantee"
  | "insurance_requirement"   // only used as guard — dedupe removes these before output
  | "other";

export interface FinancialTerm {
  financialTermID: string;   // icml:FIN-{engagement}-{seq}
  name: string;
  termType: FinancialTermType;
  amount?: number;
  currency?: string;
  frequency?: string;
  paymentTerms?: string;
  adjustmentMechanism?: string;
  payingParty: string;       // partyID reference
  receivingParty: string;    // partyID reference
  fullText: string;
  sourceClause: string;
  confidence: ConfidenceLevel;
}

// ─── ServiceLevel ─────────────────────────────────────────────────────────────

export interface ServiceLevel {
  serviceLevelID: string;    // icml:SLA-{engagement}-{seq}
  name: string;
  description: string;
  metric: string;
  target: string;
  measurementPeriod?: string;
  measurementMethod?: string;
  remedyThreshold?: string;
  remedy?: string;
  exclusions?: string;
  responsibleParty: string;  // partyID reference
  fullText: string;
  sourceClause: string;
  confidence: ConfidenceLevel;
}

// ─── LiabilityProvision ───────────────────────────────────────────────────────

export type LiabilityProvisionType =
  | "liability_cap"
  | "per_incident_cap"
  | "indemnification"
  | "warranty"
  | "representation"
  | "insurance_requirement"
  | "limitation_exclusion"
  | "other";

export interface LiabilityProvision {
  liabilityID: string;       // icml:LIA-{engagement}-{seq}
  name: string;
  provisionType: LiabilityProvisionType;
  description: string;
  capAmount?: number;
  capFormula?: string;
  currency?: string;
  scope?: string;
  carveOuts?: string;
  indemnifyingParty?: string; // partyID reference
  beneficiary?: string;       // partyID reference
  survivalPeriod?: string;
  fullText: string;
  sourceClause: string;
  confidence: ConfidenceLevel;
}

// ─── TerminationProvision ─────────────────────────────────────────────────────

export type TerminationProvisionType =
  | "termination_for_cause"
  | "termination_for_convenience"
  | "auto_renewal"
  | "manual_renewal"
  | "expiry"
  | "step_in_rights"
  | "consequences_of_termination"
  | "other";

export interface TerminationProvision {
  terminationID: string;     // icml:TRM-{engagement}-{seq}
  name: string;
  provisionType: TerminationProvisionType;
  description: string;
  noticePeriod?: string;
  triggerCondition?: string;
  consequences?: string;
  renewalTerms?: string;
  exercisingParty?: string;
  fullText: string;
  sourceClause: string;
  confidence: ConfidenceLevel;
}

// ─── DisputeResolution ────────────────────────────────────────────────────────

export type DisputeMechanism =
  | "litigation"
  | "arbitration"
  | "mediation"
  | "expert_determination"
  | "tiered";

export interface DisputeResolution {
  disputeID: string;         // icml:DSP-{engagement}-{seq}
  governingLaw: string;
  jurisdiction: string;
  mechanism: DisputeMechanism;
  escalationSequence?: string;
  arbitrationRules?: string;
  venue?: string;
  timeframe?: string;
  fullText: string;
  sourceClause: string;
  confidence: ConfidenceLevel;
}

// ─── Relationship Edge (E-02) ─────────────────────────────────────────────────

export type RelationshipType =
  | "subject_to"
  | "conditional_on"
  | "supplements"
  | "amends"
  | "supersedes"
  | "related_to"
  | "conflicts_with"
  | "implements";

export interface ObjectRelationship {
  sourceObjectId: string;
  targetObjectId: string;
  relationshipType: RelationshipType;
  direction: "unidirectional" | "bidirectional";
  confidence: ConfidenceLevel;
  sourceEvidence: string;
}

// ─── Full Extraction Result ───────────────────────────────────────────────────

export interface ContractExtractionResult {
  engagementRef: string;
  parties: ContractParty[];
  agreement: Agreement | null;
  obligations: ContractObligation[];
  financialTerms: FinancialTerm[];
  serviceLevels: ServiceLevel[];
  liabilityProvisions: LiabilityProvision[];
  terminationProvisions: TerminationProvision[];
  disputeResolution: DisputeResolution | null;
  relationships: ObjectRelationship[];
}

// ─── Extraction metrics ───────────────────────────────────────────────────────

export interface ContractExtractionMetrics {
  parties: number;
  obligations: number;
  financialTerms: number;
  serviceLevels: number;
  liabilityProvisions: number;
  terminationProvisions: number;
  relationships: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  highRisk: number;
}
