// Starter CTX for contract extraction
// Captures the extraction know-how from XTRACT-SPEC-CONTRACT-v1.0 Section 7
// This file is offered as a download from the config step and can be
// customised per client/sector. Future: loaded from Cortx API by domain.

export const STARTER_CTX_FILENAME = "contract-extraction-starter.ctx";

export const STARTER_CTX_CONTENT = `@metadata
name: Contract Extraction — Standard
version: 1.0
domain: commercial_agreements
author: BridgingX / Xtract
description: Baseline extraction guidance for commercial agreements (MSA, SaaS, vendor, licensing, services contracts). Customise per client or sector.

@confidence_rules
Apply confidence levels as follows:

HIGH — Information is directly and unambiguously stated in the source document.
Examples: Explicit monetary amounts, named parties with registration numbers, specific dates, verbatim obligation text with clear clause reference.

MEDIUM — Information is strongly implied but requires interpretation.
Examples: Implied renewal terms, obligations inferred from defined terms, financial figures requiring calculation from stated rates, obligations on a party implied by their position in a payment schedule.

LOW — Information is inferred from context; reasonable but uncertain.
Examples: Obligations implied by industry practice but not stated, dates calculated from "within X days of" without a known anchor date, governing law inferred from party jurisdictions rather than stated.

@pitfalls

DEFINED TERMS VS PLAIN LANGUAGE
Contracts use capitalised Defined Terms with specific meanings. Always use the contract's own definitions, not plain-language interpretation. "Material" in a defined-term context means whatever the contract says it means — not the ordinary dictionary sense. "Business Day" may exclude public holidays specific to a jurisdiction. Look for a Definitions clause (usually Clause 1) and apply it consistently throughout extraction.

CROSS-REFERENCING TRAPS
Clauses often say "subject to Clause X" or "as defined in Schedule 2" without restating the substance. Resolve these references — do not just note them. If a clause modifies or limits an obligation extracted elsewhere, create a relationship edge (subject_to or conditional_on). If Clause X cannot be located, flag as low confidence and note the unresolved reference in the description field.

IMPLIED VS STATED OBLIGATIONS
Some obligations are implied by structure rather than stated explicitly. A party listed as the paying party in a fee schedule is implicitly obligated to pay — extract this as a payment obligation at medium confidence. A party named as data controller in a schedule is implicitly subject to data protection obligations — extract at medium confidence with a note that it is structurally implied.

AMENDMENT LAYERING
When processing an amendment alongside an original agreement, identify which provisions are modified and mark supersession relationships. Do not extract the original version of a superseded clause as a current obligation — extract the amended version and note the supersession. If only the amendment is provided without the original, note in descriptions where context from the original would be required for complete interpretation.

BOILERPLATE VS BESPOKE
Standard boilerplate clauses (entire agreement, severability, waiver of rights, notices format) should be extracted but flagged as low risk. Give extraction effort priority to bespoke clauses that modify standard market positions — non-standard liability caps, unusual survival periods, asymmetric termination rights, bespoke IP ownership provisions, non-standard indemnities. These are where commercial risk concentrates.

RECITALS AND SCHEDULES
Recitals ("whereas" clauses) provide context and may define the commercial relationship but generally do not create binding obligations. Extract recital content to populate the Agreement object (parties, background, purpose) but assess carefully before creating Obligation objects from recital language. Schedules frequently contain the most commercially significant terms (fee rates, SLA targets, acceptance criteria, data processing details) — process all schedules thoroughly.

SURVIVAL CLAUSES
Note which obligations survive termination and for how long. Confidentiality, IP ownership, payment of accrued sums, indemnities, and audit rights commonly survive. Extract the survival period into the survivalPeriod field. If a general survival clause exists (e.g. "Clauses 9, 14, 15, 16 survive termination for 6 years"), apply it to all objects from those clauses.

GOVERNING LAW AND JURISDICTION
These are almost always in the boilerplate section near the end of the agreement. Do not leave them null if the document contains them — search the full document including execution blocks and schedules. Distinguish between governing law (which legal system applies) and jurisdiction (which courts have authority). They are usually the same country but not always.

DATES
Effective date, execution date (signing date), and expiry date often appear in different places. The cover page or recitals may state the effective date. The signature block states the execution date. The term clause states the initial term and expiry. DocuSign completion timestamps are reliable execution dates. Extract all three separately.

INSURANCE AS OBLIGATION NOT FINANCIAL TERM
Insurance requirements (minimum coverage amounts) are obligations on the insured party, not financial terms payable between the parties. Extract them as ContractObligation objects with obligationType: "insurance". Do NOT also create FinancialTerm objects for the same insurance requirements — this creates duplication. Only create FinancialTerm objects for money that flows between the contracting parties.

DOCUMENT TYPE CLASSIFICATION
Classify the document accurately:
- MSA / Framework Agreement: sets the general terms, references future SOWs or call-off orders for specific work
- SOW (Statement of Work): defines a specific piece of work under an MSA — has deliverables, milestones, specific fees
- Services Agreement: a standalone agreement combining framework terms and specific work scope
- Amendment: modifies an existing agreement — extract only as changes, not as a complete agreement
- NDA: confidentiality-focused, usually limited parties and scope
If a document is both a framework and an SOW (combined document), classify as the dominant type and note both in the agreement description.

@assessment_criteria
Priority extraction targets in order:
1. Parties — full legal names, roles, registration numbers, notice addresses
2. Agreement metadata — type, dates, governing law, jurisdiction
3. Payment obligations — amounts, timing, late payment consequences
4. Liability caps and indemnities — amounts, formulas, carve-outs
5. Termination provisions — notice periods, trigger conditions, consequences
6. Performance obligations — delivery standards, acceptance criteria
7. Confidentiality — scope, duration, exceptions, survival
8. Insurance requirements — types, minimum amounts, survival
9. Data protection — roles (controller/processor), specific obligations
10. Dispute resolution — mechanism, governing law, venue, escalation sequence
11. SLAs — metrics, targets, remedies, exclusions
12. Regulatory compliance obligations — IR35, CFA, GDPR, sector-specific

@ai_guidance
When you encounter a liability cap expressed as a formula (e.g. "greater of X and Y% of fees paid"), capture the full formula in capFormula AND set capAmount to the fixed floor amount (X). This preserves both the formula and a searchable numeric value.

When you encounter indemnities that are carved out of a liability cap, create a relationship edge: liability_cap subject_to indemnity, with the clause text as source_evidence.

When an obligation applies to "each party" or "both parties", create two separate Obligation objects — one for each party — rather than a single object with an ambiguous obligatedParty.

When a clause says "the Supplier shall procure that its sub-contractors comply with...", this is a procurement obligation on the Supplier, not a direct obligation on the sub-contractors. Extract it as a performance obligation on the Supplier.

For SLAs, distinguish between the target (what is promised), the remedy threshold (when the remedy triggers, which may be lower than the target), and the remedy itself. All three are commercially significant and should be extracted separately.

For dispute resolution, the escalation sequence is often multi-step: internal escalation → mediation → arbitration/litigation. Capture the full sequence in escalationSequence, not just the final step.
`;
