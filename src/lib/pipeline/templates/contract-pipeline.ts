import type { PipelineTemplate } from "@/types/pipeline";

export const CONTRACT_PIPELINE: PipelineTemplate = {
  templateId: "contract-extraction-v1",
  name: "Contract Extraction",
  version: "1.0.0",
  description:
    "Extract structured intelligence from commercial agreements (MSA, SaaS, vendor, licensing, services contracts). No CTX file required — schema is built in.",
  defaultMode: "guided",
  steps: [
    {
      stepId: "configuration",
      stepNumber: 1,
      label: "Step 1 of 5",
      title: "Configuration",
      description:
        "Upload contract document and set engagement reference. Accepts PDF, TXT, or Markdown.",
      interactionTypes: ["file-drop-zone", "pipeline-config"],
      config: {
        fileInputs: [
          {
            id: "contract-document",
            label: "Contract Document",
            accept: ".txt,.md,.pdf",
            required: true,
          },
        ],
        configFields: [
          {
            key: "engagementRef",
            label: "Engagement Reference",
            type: "text",
            placeholder: "e.g. ACME-MSA-2026",
          },
          {
            key: "clientName",
            label: "Client / Matter Name",
            type: "text",
            placeholder: "e.g. Acme Corp",
          },
        ],
      },
    },
    {
      stepId: "ingest-classify",
      stepNumber: 2,
      label: "Step 2 of 5",
      title: "Ingest & Classify",
      description:
        "Parse document structure, identify parties, classify document type, and prepare extraction chunks.",
      interactionTypes: ["pipeline-log", "metric-cards"],
      executionEndpoint: "/api/contract/ingest",
      config: {
        metrics: [
          { key: "wordCount", label: "Words" },
          { key: "chunks", label: "Sections" },
          { key: "partiesFound", label: "Parties Identified", highlight: true },
          { key: "documentType", label: "Document Type" },
        ],
      },
    },
    {
      stepId: "extract",
      stepNumber: 3,
      label: "Step 3 of 5",
      title: "Extract",
      description:
        "AI extraction of obligations, financial terms, SLAs, liability provisions, termination clauses, and dispute resolution.",
      interactionTypes: ["pipeline-log", "metric-cards"],
      executionEndpoint: "/api/contract/extract",
      config: {
        metrics: [
          { key: "obligations", label: "Obligations" },
          { key: "financialTerms", label: "Financial Terms" },
          { key: "serviceLevels", label: "SLAs" },
          { key: "highRisk", label: "High Risk Items", highlight: true },
        ],
      },
    },
    {
      stepId: "review",
      stepNumber: 4,
      label: "Step 4 of 5",
      title: "Review",
      description:
        "Review extracted objects grouped by type. Approve, flag, or dismiss individual items before export.",
      interactionTypes: ["metric-cards"],
      config: {
        metrics: [
          { key: "total", label: "Total Objects" },
          { key: "highConfidence", label: "High Confidence" },
          { key: "flagged", label: "Flagged" },
          { key: "approved", label: "Approved", highlight: true },
        ],
      },
    },
    {
      stepId: "export",
      stepNumber: 5,
      label: "Step 5 of 5",
      title: "Export",
      description:
        "Download iCML JSON, 7-tab XLSX workbook, and run summary.",
      interactionTypes: ["metric-cards", "download-grid"],
      executionEndpoint: "/api/contract/export",
      config: {
        metrics: [
          { key: "totalObjects", label: "Total Objects" },
          { key: "obligations", label: "Obligations" },
          { key: "relationships", label: "Relationships" },
          { key: "approved", label: "Approved", highlight: true },
        ],
        downloads: [
          { key: "icml", name: "extraction.icml.json", format: "json" },
          { key: "xlsx", name: "contract_extraction.xlsx", format: "xlsx" },
          { key: "runSummary", name: "run_summary.json", format: "json" },
        ],
      },
    },
  ],
};
