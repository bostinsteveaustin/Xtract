// Pre-built CTX: Vendor Management Contracts
// Sections 1, 3, 7, 10, 11 — optimised for Mode 2 extraction of ContractTerm objects

import type { CTXFile } from "@/types/ctx";

export const VENDOR_MANAGEMENT_CTX: CTXFile = {
  frontMatter: {
    cortx_version: "0.3",
    context_type: "framework",
    context_id: "vendor-management-contracts",
    version: "1.0.0",
    status: "active",
    title: "Vendor Management Contract Intelligence",
    description:
      "A CTX framework for extracting structured contract terms, obligations, and risk indicators from vendor management agreements. Designed for Mode 2 domain object extraction producing iCML-conformant ContractTerm objects.",
    deployment: {
      target_platforms: ["xtract"],
    },
  },

  organisationalMetadata: {
    domain: "Vendor Management & Contract Administration",
    industry: ["technology", "professional-services", "financial-services"],
    author: "Xtract",
    classification: "public",
    visibility: {
      definitions: "public",
      assessment_criteria: "public",
      pitfalls: "public",
      tacit: "internal",
      objects: "public",
    },
    content_sections: {
      definitions: "complete",
      methodology: "none",
      assessment_criteria: "complete",
      reference_data: "none",
      decision_logic: "none",
      examples: "none",
      pitfalls: "complete",
      stakeholders: "none",
      output_standards: "none",
      tacit: "complete",
      objects: "complete",
    },
    data_sensitivity: "commercial",
  },

  sections: {
    // ─── Section 1: Definitions ──────────────────────────────────────
    definitions: {
      definitions: [
        {
          term: "Service Level Agreement (SLA)",
          inThisContext:
            "A measurable commitment within the contract defining specific performance standards the vendor must meet, with stated consequences for non-compliance. Distinguished from general quality expectations or marketing promises.",
          includes:
            "Uptime guarantees, response time commitments, resolution time targets, availability windows, performance benchmarks with numeric thresholds",
          excludes:
            "General quality statements without metrics, aspirational targets, best-effort commitments, marketing language",
          test: "Does this clause contain a specific numeric threshold or measurable standard that can be objectively verified?",
          commonMisuse:
            "Treating any quality-related language as an SLA. A statement like 'we will provide high-quality service' is not an SLA — it lacks measurability.",
          aiGuidance:
            "When extracting SLAs: look for numeric values (99.9%, 4 hours, etc.), measurement methods, and remedies. If a clause says 'reasonable efforts' without a metric, classify it as a general obligation, not an SLA.",
        },
        {
          term: "Liquidated Damages",
          inThisContext:
            "Pre-agreed monetary compensation payable upon a specified breach, representing a genuine pre-estimate of loss rather than a penalty. The amount or calculation method must be stated in the contract.",
          test: "Is there a specific monetary amount or formula stated for a specific breach scenario?",
          commonMisuse:
            "Confusing liquidated damages with general liability caps or penalty clauses. Liquidated damages are for specific anticipated breaches; liability caps are overall ceilings.",
          aiGuidance:
            "When extracting: capture the exact amount or formula, the triggering breach, and whether there is a cap. Note if the clause uses the words 'penalty' vs 'liquidated damages' as this has legal significance.",
        },
        {
          term: "Force Majeure",
          inThisContext:
            "A contractual clause that excuses one or both parties from performance obligations when extraordinary events beyond their reasonable control prevent performance. The scope of qualifying events is defined by the contract, not by general law.",
          test: "Does the clause enumerate specific qualifying events AND state the consequences for the affected party's obligations?",
          commonMisuse:
            "Assuming force majeure has a universal legal definition. Each contract defines its own scope — some include pandemics, some do not. Always extract the specific events listed.",
          aiGuidance:
            "When extracting: list ALL enumerated events. Note whether the clause includes a catch-all provision ('and other events beyond reasonable control'). Capture the notice period and any obligation to mitigate.",
        },
        {
          term: "Indemnification",
          inThisContext:
            "A contractual obligation where one party agrees to compensate the other for specific losses, damages, or liabilities arising from defined circumstances. Typically covers third-party claims, IP infringement, data breaches, or regulatory violations.",
          test: "Does the clause identify who indemnifies whom, for what specific scenarios, and what costs are covered?",
          commonMisuse:
            "Treating all liability language as indemnification. Indemnification specifically involves one party holding another harmless from third-party claims or specified losses — it is distinct from a general limitation of liability.",
          aiGuidance:
            "When extracting: capture the direction (who indemnifies whom), triggering scenarios, scope of covered costs (legal fees, settlements, fines), any carve-outs, and whether indemnification survives termination.",
        },
        {
          term: "Limitation of Liability",
          inThisContext:
            "A contractual cap on the total financial exposure of one or both parties under the agreement. Usually expressed as a multiple of fees paid/payable or a fixed monetary amount. Often excludes certain categories of loss (e.g., IP infringement, data breach).",
          test: "Does the clause state a specific cap amount or formula AND specify which types of liability are included or excluded?",
          commonMisuse:
            "Confusing with exclusion of liability (which eliminates liability for certain loss types entirely) or with liquidated damages (which pre-sets damages for specific breaches).",
          aiGuidance:
            "When extracting: capture the cap amount/formula, whether it applies per-incident or in aggregate, exclusions from the cap, and whether it is mutual or one-directional. Note any 'super cap' for categories like data breach.",
        },
        {
          term: "Notice Period",
          inThisContext:
            "The required advance time a party must give before exercising a contractual right such as termination, renewal opt-out, or price adjustment. The period and method of notice delivery are both material.",
          test: "Is there a specific number of days/months stated, combined with a required delivery method?",
          commonMisuse:
            "Overlooking that notice periods attach to specific rights — a contract may have different notice periods for termination vs. renewal vs. breach cure.",
          aiGuidance:
            "When extracting: always associate the notice period with the specific right it governs. Capture the duration, delivery method (written, email, registered post), and any deemed-receipt provisions.",
        },
        {
          term: "Renewal Term",
          inThisContext:
            "The contractual mechanism and period for extending the agreement beyond its initial term. May be automatic (evergreen) requiring opt-out, or manual requiring affirmative action to renew.",
          test: "Does the clause specify whether renewal is automatic or requires action, the renewal period length, and any conditions or price adjustment mechanisms?",
          commonMisuse:
            "Failing to distinguish between auto-renewal (requiring notice to prevent) and optional renewal (requiring notice to activate). These have opposite default outcomes if no action is taken.",
          aiGuidance:
            "When extracting: classify as 'auto-renewal' or 'manual renewal'. Capture the renewal period, any notice requirements for opting out, price escalation clauses, and any limitations on the number of renewals.",
        },
        {
          term: "Governing Law",
          inThisContext:
            "The jurisdiction whose laws will be applied to interpret and enforce the contract, and the venue for dispute resolution. Includes both applicable law and dispute resolution mechanism (courts, arbitration, mediation).",
          test: "Does the clause name a specific jurisdiction AND specify the dispute resolution mechanism?",
          commonMisuse:
            "Treating governing law as purely procedural. The choice of jurisdiction can materially affect interpretation of ambiguous terms, limitation periods, and enforceability of certain clauses.",
          aiGuidance:
            "When extracting: capture the named jurisdiction, whether disputes go to courts or arbitration, the seat of arbitration if applicable, and any multi-tier dispute resolution requirements (e.g., mediation before arbitration).",
        },
      ],
    },

    // ─── Section 3: Assessment Criteria ─────────────────────────────
    assessment_criteria: {
      rubrics: [
        {
          name: "contract_term_completeness",
          appliesTo: "Each extracted ContractTerm object",
          scale: "1-5",
          minimumThreshold: 3,
          levels: [
            {
              score: 1,
              level: "Inadequate",
              criteria:
                "Term identified but fewer than 4 required attributes populated. Missing clause reference or full text.",
              evidenceRequired:
                "Only termName and termType present; no source text captured.",
            },
            {
              score: 2,
              level: "Basic",
              criteria:
                "Core identity attributes present (termName, termType, clauseReference) but missing obligation detail or risk assessment.",
              evidenceRequired:
                "Has termName, termType, clauseReference but lacks obligationType, obligatedParty, or riskLevel.",
            },
            {
              score: 3,
              level: "Adequate",
              criteria:
                "All required attributes populated with reasonable values. Clause text captured. Basic risk assessment provided.",
              evidenceRequired:
                "All 9 required attributes present with non-empty values. Summary is coherent.",
            },
            {
              score: 4,
              level: "Good",
              criteria:
                "All required attributes plus relevant optional attributes populated. Risk rationale demonstrates understanding of the term's implications. Provenance is clear.",
              evidenceRequired:
                "Required + optional attributes where applicable (dates, monetary values). Risk rationale references specific contract language.",
            },
            {
              score: 5,
              level: "Excellent",
              criteria:
                "Comprehensive extraction with all applicable attributes, detailed risk analysis, cross-references to related terms identified, and nuanced summary capturing legal and commercial implications.",
              evidenceRequired:
                "All applicable attributes populated. Dependencies identified. Risk rationale considers interaction with other contract terms. Summary suitable for executive briefing.",
            },
          ],
          aiGuidance:
            "When scoring: prioritise accuracy over completeness. A term with 7 accurate attributes scores higher than one with 10 attributes where some are guessed. Verify clause references actually exist in the source text.",
        },
        {
          name: "contract_risk_assessment",
          appliesTo:
            "Risk level and rationale assigned to each ContractTerm",
          scale: "1-5",
          minimumThreshold: 2,
          levels: [
            {
              score: 1,
              level: "Missing",
              criteria: "No risk assessment or generic 'medium' assigned without rationale.",
              evidenceRequired: "riskLevel present but riskRationale is empty or generic.",
            },
            {
              score: 2,
              level: "Basic",
              criteria:
                "Risk level assigned with a brief rationale that references the term type.",
              evidenceRequired:
                "Rationale mentions why this type of term carries risk (e.g., 'indemnity clauses transfer financial risk').",
            },
            {
              score: 3,
              level: "Adequate",
              criteria:
                "Risk level supported by rationale referencing specific contract language and the party's exposure.",
              evidenceRequired:
                "Rationale references specific monetary values, time periods, or conditions from the clause.",
            },
            {
              score: 4,
              level: "Good",
              criteria:
                "Risk assessment considers the term in context of the overall agreement and standard market practice.",
              evidenceRequired:
                "Rationale compares the term to typical market positions and identifies unusual provisions.",
            },
            {
              score: 5,
              level: "Excellent",
              criteria:
                "Comprehensive risk analysis considering interactions with other terms, enforceability concerns, and commercial implications.",
              evidenceRequired:
                "Rationale cross-references other extracted terms, identifies gaps in protection, and considers practical enforceability.",
            },
          ],
          aiGuidance:
            "When scoring risk assessment: a 'high' risk rating should be reserved for terms that create material financial exposure, unilateral termination rights, or uncapped liability. Consider the direction of obligation — who bears the risk?",
        },
      ],
    },

    // ─── Section 7: Pitfalls ────────────────────────────────────────
    pitfalls: {
      pitfalls: [
        {
          name: "Missing Implied Obligations",
          whatHappens:
            "Extraction captures explicitly stated obligations but misses obligations implied by context, such as a liability clause that implicitly requires insurance, or an SLA that implies monitoring and reporting obligations.",
          frequency: "frequent",
          earlyWarningSigns: [
            "Extracted terms only reference 'shall' and 'must' language",
            "No obligations extracted from schedules or appendices",
            "Liability and indemnity clauses extracted without corresponding insurance or cap terms",
          ],
          rootCause:
            "Extraction focuses on explicit obligation language ('shall', 'must', 'agrees to') and misses implied obligations that arise from the commercial context or interaction between clauses.",
          prevention:
            "After initial extraction, cross-reference liability/indemnity terms with insurance and cap terms. Flag any indemnity without a corresponding limitation. Check schedules and appendices for operational obligations.",
          recovery:
            "Re-extract from sections where obligations were sparse. Look for clauses that create conditions (e.g., 'subject to', 'provided that') which imply obligations on one party.",
          aiGuidance:
            "When you find an indemnification clause, look for related insurance requirements and limitation of liability. When you find SLAs, look for corresponding reporting and monitoring obligations. Clauses containing 'subject to' or 'provided that' often contain hidden obligations.",
        },
        {
          name: "Confusing Term Types",
          whatHappens:
            "Renewal and termination clauses misclassified. Auto-renewal terms extracted as termination terms, or termination for convenience confused with termination for cause.",
          frequency: "occasional",
          earlyWarningSigns: [
            "Multiple terms from the same clause extracted with different termType values",
            "Termination terms that mention renewal periods",
            "All termination terms classified as the same obligationType",
          ],
          rootCause:
            "Contracts often address termination and renewal in the same clause or adjacent clauses. The conditions, notice periods, and consequences are different for each but the language is interleaved.",
          prevention:
            "Extract termination for cause, termination for convenience, and renewal as separate ContractTerm objects even when they appear in the same clause. Use clauseReference sub-references (e.g., 'Clause 12.1(a)' vs 'Clause 12.1(b)').",
          recovery:
            "Review all terms with termType 'termination' or 'renewal'. Split compound terms into separate objects where the obligations differ.",
          aiGuidance:
            "A single clause may contain multiple contract terms. If Clause 12 covers both termination for cause (12.1) and termination for convenience (12.2), extract these as separate ContractTerm objects with distinct clauseReferences.",
        },
        {
          name: "Ignoring Cross-References Between Clauses",
          whatHappens:
            "Terms extracted in isolation without capturing dependencies. A payment term references a schedule of rates, but the dependency is not recorded. A termination clause references a cure period defined elsewhere.",
          frequency: "frequent",
          earlyWarningSigns: [
            "No dependencies populated in any extracted terms",
            "Terms reference 'as defined in Schedule X' but schedule content not captured",
            "Monetary values missing because they are defined in a separate schedule",
          ],
          rootCause:
            "Contract drafting commonly uses cross-references to avoid repetition. Key details (prices, rates, service descriptions, cure periods) are often in schedules rather than the main body.",
          prevention:
            "During extraction, resolve cross-references to schedules and definitions clauses. Populate the dependencies field when a term references another clause or schedule.",
          recovery:
            "After initial extraction, review all terms for phrases like 'as set out in', 'in accordance with', 'subject to Clause X'. Add missing dependencies and resolve schedule references.",
          aiGuidance:
            "Watch for: 'as defined in Clause X', 'in accordance with Schedule Y', 'subject to the provisions of', 'notwithstanding Clause Z'. These indicate cross-references that should be captured as dependencies.",
        },
        {
          name: "Overlooking Inconsistent Defined Terms",
          whatHappens:
            "The contract defines terms in a definitions section but uses them inconsistently or uses undefined terms that resemble defined ones. Extraction picks up the wrong meaning.",
          frequency: "occasional",
          earlyWarningSigns: [
            "Extracted term uses a capitalised word that is defined differently in the contract's own definitions section",
            "Same concept appears with different names in different clauses",
            "Extracted obligatedParty name doesn't match any party defined in the agreement",
          ],
          rootCause:
            "Contracts are often assembled from templates and negotiated iteratively. Defined terms may be added or changed without updating all references throughout the document.",
          prevention:
            "In Pass 2 (entity extraction), build a glossary of defined terms from the contract's own definitions clause. In Pass 3, validate extracted values against this glossary.",
          recovery:
            "Cross-reference all entity names (obligatedParty, counterparty) against the parties identified in Pass 2. Flag any unrecognised names for review.",
          aiGuidance:
            "Always check whether the contract has its own definitions section. Use the party names as defined in the agreement (e.g., 'the Supplier' not 'Acme Corp' if the contract defines 'Supplier' as Acme Corp). Report both the defined term and the actual entity.",
        },
        {
          name: "Treating Boilerplate as Non-Material",
          whatHappens:
            "Standard boilerplate clauses (entire agreement, severability, waiver, assignment) are skipped during extraction because they appear generic, but they often contain material provisions like assignment restrictions or change of control triggers.",
          frequency: "occasional",
          earlyWarningSigns: [
            "No terms extracted from the 'General' or 'Miscellaneous' section of the contract",
            "Assignment or change of control rights not captured",
            "No governance-type terms extracted",
          ],
          rootCause:
            "Boilerplate clauses are perceived as standard and immaterial, but in vendor contracts they often contain restrictions on assignment, anti-assignment provisions on change of control, and governing law choices that materially affect the agreement.",
          prevention:
            "Always extract from the entire contract including 'General', 'Miscellaneous', and 'Boilerplate' sections. Specifically look for assignment, novation, change of control, and governing law provisions.",
          recovery:
            "Re-scan the final sections of the contract. Extract any clauses that restrict assignment, address change of control, or specify governing law.",
          aiGuidance:
            "Never skip the 'General' or 'Miscellaneous' section. Key provisions to extract: assignment restrictions, change of control, governing law, dispute resolution, entire agreement (as it affects side agreements), and survival clauses (as they affect which obligations persist after termination).",
        },
      ],
    },

    // ─── Section 10: Tacit Knowledge ────────────────────────────────
    tacit: {
      whyThingsWorkThisWay:
        "Vendor management contracts are heavily negotiated documents where the final text represents compromises between legal, commercial, and operational teams. The written terms may not reflect the parties' actual expectations — side agreements, relationship history, and market dynamics all influence how terms are interpreted and enforced in practice.",
      realisticExpectations: [
        {
          whatIsStated:
            "The contract contains a comprehensive set of SLAs with penalties for non-compliance.",
          whatActuallyHappens:
            "SLA penalties are rarely enforced for first-time or minor breaches. Vendor relationship managers negotiate informally. Penalties are only invoked when the relationship has already deteriorated.",
          why: "Enforcing penalties damages the vendor relationship. Most organisations prioritise the ongoing service over financial recovery from SLA breaches.",
        },
        {
          whatIsStated:
            "Termination for convenience is available with 90 days notice.",
          whatActuallyHappens:
            "Termination for convenience triggers significant transition costs and risks. In practice, organisations rarely terminate without cause unless they have a replacement vendor already lined up.",
          why: "The practical cost of transition (data migration, knowledge transfer, service continuity) far exceeds what the contract's termination provisions suggest.",
        },
        {
          whatIsStated:
            "The limitation of liability is capped at 12 months of fees.",
          whatActuallyHappens:
            "In the event of a serious breach (data breach, prolonged outage), actual losses often exceed the liability cap significantly. The cap represents a negotiated commercial position, not an estimate of potential loss.",
          why: "Liability caps are risk allocation tools, not actuarial calculations. They reflect relative bargaining power more than potential exposure.",
        },
      ],
      practitionerQuestions: [
        "Who drafted this contract — the buyer or the vendor? (This reveals which party's standard positions are the baseline.)",
        "Is this a renewal of an existing relationship or a new engagement? (Renewals may have accumulated amendments and side letters.)",
        "What is the relative bargaining power? (A small buyer contracting with a major vendor will see vendor-favourable terms as non-negotiable.)",
        "Are there any side letters, amendments, or statements of work that modify the main agreement?",
        "Has this contract template been customised from the vendor's standard, or is it the buyer's paper?",
        "Which terms were actually negotiated vs. accepted as standard? (Look for manuscript amendments or tracked change artefacts.)",
      ],
      politicalDynamics:
        "Contract review often involves tension between legal (risk-focused, wanting stronger protections), commercial (relationship-focused, wanting flexibility), and operations (delivery-focused, wanting clear SLAs). The final contract is a political compromise. Terms that appear weak may reflect deliberate trade-offs.",
      validationTechniques:
        "Cross-reference extracted terms against: (1) the contract's own table of contents to ensure no sections were missed, (2) a standard term checklist for the contract type, (3) any referenced schedules or appendices to verify all are accounted for.",
      aiGuidance:
        "When extracting contract terms, recognise that the written words are the floor, not the ceiling, of what matters. Flag terms that appear unusually one-sided (e.g., unlimited liability on one party, very short cure periods, aggressive auto-renewal). These often indicate either superior bargaining power or a template that wasn't fully negotiated.",
    },

    // ─── Section 11: Objects ────────────────────────────────────────
    objects: {
      objectTypes: [
        {
          typeName: "ContractTerm",
          description:
            "A discrete contract term, clause, or provision extracted from a vendor management agreement. Each ContractTerm represents a single obligation, right, restriction, or operational standard that can be independently assessed for risk and compliance.",
          iCMLPrimaryMapping: "Obligation",
          iCMLRelatedMappings: ["Entity", "Artefact"],
          sourceDocumentTypes: ["contract-or-standard"],
          attributes: [
            {
              name: "termName",
              type: "text",
              required: true,
              description:
                "A concise, descriptive name for this contract term (e.g., 'Uptime SLA', 'Data Breach Indemnity', 'Payment Terms — Net 30').",
            },
            {
              name: "termType",
              type: "enum",
              required: true,
              description:
                "Classification of the contract term by its primary function.",
              enumValues: [
                "payment",
                "delivery",
                "liability",
                "termination",
                "indemnity",
                "warranty",
                "confidentiality",
                "ip",
                "governance",
                "renewal",
                "sla",
                "penalty",
                "insurance",
                "dispute_resolution",
                "other",
              ],
            },
            {
              name: "clauseReference",
              type: "text",
              required: true,
              description:
                "The clause, section, or schedule reference in the source document (e.g., 'Clause 8.2', 'Schedule 3, Section 2.1', 'Article IV(b)').",
            },
            {
              name: "fullText",
              type: "text",
              required: true,
              description:
                "The exact text of the clause as it appears in the source document. For very long clauses, include the operative provision and first paragraph.",
            },
            {
              name: "summary",
              type: "text",
              required: true,
              description:
                "A plain-English summary of what this term means in practice, written for a non-legal audience. Should capture the commercial intent, not just paraphrase the legal language.",
            },
            {
              name: "obligationType",
              type: "enum",
              required: true,
              description:
                "The strength of the obligation imposed by this term.",
              enumValues: ["must", "should", "may", "shall_not"],
            },
            {
              name: "obligatedParty",
              type: "entity",
              required: true,
              description:
                "The party bearing the primary obligation under this term. Use the defined term from the contract (e.g., 'the Supplier', 'the Customer').",
            },
            {
              name: "counterparty",
              type: "entity",
              required: false,
              description:
                "The party benefiting from or enforcing this obligation, if identifiable.",
            },
            {
              name: "effectiveDate",
              type: "date",
              required: false,
              description:
                "When this specific term becomes effective, if different from the agreement date. ISO 8601 format.",
            },
            {
              name: "expiryDate",
              type: "date",
              required: false,
              description:
                "When this specific term expires or must be renewed. ISO 8601 format.",
            },
            {
              name: "monetaryValue",
              type: "numeric",
              required: false,
              description:
                "The monetary amount associated with this term (e.g., liability cap amount, liquidated damages value, fee amount). Omit if no specific amount stated.",
            },
            {
              name: "currency",
              type: "enum",
              required: false,
              description: "Currency of the monetary value.",
              enumValues: [
                "USD",
                "EUR",
                "GBP",
                "AUD",
                "CAD",
                "NZD",
                "CHF",
                "JPY",
                "other",
              ],
            },
            {
              name: "riskLevel",
              type: "enum",
              required: true,
              description:
                "Assessed risk level for the party receiving this analysis. Consider financial exposure, operational impact, and enforceability.",
              enumValues: ["high", "medium", "low"],
            },
            {
              name: "riskRationale",
              type: "text",
              required: true,
              description:
                "Explanation of why this risk level was assigned. Should reference specific provisions in the clause and their practical implications.",
            },
            {
              name: "dependencies",
              type: "list",
              required: false,
              description:
                "References to other contract terms that this term depends on, conflicts with, or modifies (by termName or clauseReference).",
            },
          ],
          scoring: {
            rubricReference:
              "@assessment_criteria.contract_term_completeness",
            scoringAttributes:
              "termName, termType, clauseReference, fullText, summary, obligationType, obligatedParty, riskLevel, riskRationale",
            minimumThreshold: 3,
          },
          relationships: [
            {
              fromObject: "ContractTerm",
              relationship: "depends_on",
              toObject: "ContractTerm",
              description:
                "A term may depend on another term (e.g., an SLA penalty depends on the SLA definition, an indemnity depends on a limitation of liability).",
            },
            {
              fromObject: "ContractTerm",
              relationship: "conflicts_with",
              toObject: "ContractTerm",
              description:
                "Terms may conflict (e.g., a termination for convenience clause may conflict with a minimum commitment period).",
            },
            {
              fromObject: "ContractTerm",
              relationship: "supersedes",
              toObject: "ContractTerm",
              description:
                "A term may supersede another (e.g., an amendment replacing an earlier clause, or a schedule overriding a general term).",
            },
            {
              fromObject: "ContractTerm",
              relationship: "references",
              toObject: "ContractTerm",
              description:
                "A term references another without creating a dependency (e.g., a notice clause mentioning the governing law clause for jurisdictional context).",
            },
            {
              fromObject: "ContractTerm",
              relationship: "implements",
              toObject: "ContractTerm",
              description:
                "A term implements a higher-level obligation (e.g., a specific SLA target implements a general service quality requirement).",
            },
          ],
          extractionGuidance:
            "Extract from the ENTIRE document including schedules, appendices, and general provisions sections. A typical vendor management contract yields 15-40 ContractTerm objects. For each term:\n\n1. IDENTIFICATION: Look for numbered clauses and sub-clauses. Each substantive provision is typically a separate term. A single clause may contain multiple terms if it addresses different obligations.\n\n2. CLAUSE TEXT: Capture the actual text, not a paraphrase. For very long clauses (>500 words), capture the operative provision.\n\n3. PARTY RESOLUTION: Use the defined party names from the contract (e.g., 'the Supplier', 'the Customer', 'the Service Provider'). Map these to the actual entities identified in Pass 2.\n\n4. RISK ASSESSMENT: Consider risk FROM THE PERSPECTIVE OF THE PARTY RECEIVING THIS ANALYSIS (typically the buyer/customer). High risk = material financial exposure or operational disruption. Medium risk = moderate exposure with some mitigation. Low risk = standard commercial terms with adequate protection.\n\n5. DEPENDENCIES: After extracting all terms, look for cross-references between them. Common patterns: SLA → SLA penalty, indemnity → limitation of liability, termination → notice period, payment → late payment penalty.\n\n6. DO NOT SKIP: General provisions, boilerplate, miscellaneous clauses, schedules, appendices. These often contain material terms (governing law, assignment, dispute resolution).",
          provenanceRequirements: {
            sourceClause: "required",
            confidenceLevel: "required",
            extractionNotes: "optional",
          },
          workedExamples: [
            {
              name: "Payment Terms — Net 30",
              source: "Master Services Agreement, Clause 6.2",
              attributes: [
                {
                  attribute: "termName",
                  extractedValue: "Payment Terms — Net 30",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "termType",
                  extractedValue: "payment",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "clauseReference",
                  extractedValue: "Clause 6.2",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "fullText",
                  extractedValue:
                    "The Customer shall pay all undisputed invoices within thirty (30) days of receipt of a valid invoice. Late payments shall accrue interest at 1.5% per month or the maximum rate permitted by law, whichever is less.",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "summary",
                  extractedValue:
                    "Customer must pay invoices within 30 days. Late payments incur 1.5% monthly interest. The obligation is on undisputed invoices only — disputed amounts can be withheld.",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "obligationType",
                  extractedValue: "must",
                  confidence: "high",
                  sourceReference: "Clause 6.2 — 'shall pay'",
                },
                {
                  attribute: "obligatedParty",
                  extractedValue: "the Customer",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "counterparty",
                  extractedValue: "the Supplier",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "riskLevel",
                  extractedValue: "low",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
                {
                  attribute: "riskRationale",
                  extractedValue:
                    "Standard 30-day payment terms with reasonable late interest. The 'undisputed' qualifier protects the Customer from being forced to pay disputed amounts. Risk is low as these are market-standard terms.",
                  confidence: "high",
                  sourceReference: "Clause 6.2",
                },
              ],
              rubricScore: 4,
              rubricMax: 5,
              rubricLevel: "Good",
              scoringRationale:
                "All required attributes populated accurately. Optional monetary value not applicable (interest rate stated but not a fixed amount). Risk rationale references specific contractual language ('undisputed'). Scored 4 rather than 5 because no dependencies identified (should reference the invoicing procedure clause if one exists).",
            },
            {
              name: "Termination for Cause — Material Breach",
              source: "Master Services Agreement, Clause 12.1(a)",
              attributes: [
                {
                  attribute: "termName",
                  extractedValue:
                    "Termination for Cause — Material Breach",
                  confidence: "high",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "termType",
                  extractedValue: "termination",
                  confidence: "high",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "clauseReference",
                  extractedValue: "Clause 12.1(a)",
                  confidence: "high",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "fullText",
                  extractedValue:
                    "Either party may terminate this Agreement immediately upon written notice if the other party commits a material breach of any term of this Agreement and (where such breach is remediable) fails to remedy that breach within thirty (30) days after receipt of written notice requiring it to do so.",
                  confidence: "high",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "summary",
                  extractedValue:
                    "Either party can terminate if the other commits a material breach that isn't fixed within 30 days of written notice. This is a mutual right — both parties have it. 'Material' breach is not defined, which creates interpretation risk.",
                  confidence: "high",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "obligationType",
                  extractedValue: "may",
                  confidence: "high",
                  sourceReference: "Clause 12.1(a) — 'may terminate'",
                },
                {
                  attribute: "obligatedParty",
                  extractedValue: "Either party",
                  confidence: "high",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "riskLevel",
                  extractedValue: "medium",
                  confidence: "medium",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "riskRationale",
                  extractedValue:
                    "Medium risk because: (1) 'material breach' is undefined, creating ambiguity about what triggers this right; (2) the 30-day cure period is reasonable but applies only to remediable breaches — irremediable breaches allow immediate termination; (3) the right is mutual, providing some protection. Risk would be lower if 'material breach' were defined.",
                  confidence: "medium",
                  sourceReference: "Clause 12.1(a)",
                },
                {
                  attribute: "dependencies",
                  extractedValue:
                    "Notice Period (Clause 12.3), Consequences of Termination (Clause 12.4)",
                  confidence: "medium",
                  sourceReference: "Clause 12",
                },
              ],
              rubricScore: 5,
              rubricMax: 5,
              rubricLevel: "Excellent",
              scoringRationale:
                "All required attributes populated with high accuracy. Risk rationale demonstrates nuanced understanding — identifies the ambiguity of 'material breach', the distinction between remediable and irremediable breaches, and the significance of mutuality. Dependencies to related termination clauses identified. Summary is clear and suitable for executive briefing.",
              extractionNotes:
                "Note that this clause should be extracted as a separate term from 'Termination for Convenience' (Clause 12.2) even though they appear in the same section.",
            },
          ],
        },
      ],
    },
  },

  versionHistory: [
    {
      version: "1.0.0",
      date: "2025-02-11",
      changes: "Initial release for Contract Intelligence MVP",
    },
  ],
};
