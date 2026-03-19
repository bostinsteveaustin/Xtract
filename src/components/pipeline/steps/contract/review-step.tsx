"use client";

import { useMemo, useState } from "react";
import { MetricCards } from "../../interactions/metric-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, AlertTriangle, Check, Flag } from "lucide-react";
import type { StepBodyProps } from "../../step-registry";
import type { MetricItem } from "@/types/pipeline";
import type {
  ContractExtractionResult,
  ContractObligation,
  ContractExtractionMetrics,
} from "@/types/contract";

type ReviewStatus = "approved" | "flagged" | "pending";

interface ReviewState {
  [objectId: string]: ReviewStatus;
}

function riskBadgeVariant(risk?: string): "destructive" | "secondary" | "outline" {
  if (risk === "critical" || risk === "high") return "destructive";
  if (risk === "medium") return "secondary";
  return "outline";
}

function ObligationCard({
  obligation,
  status,
  onStatus,
}: {
  obligation: ContractObligation;
  status: ReviewStatus;
  onStatus: (id: string, s: ReviewStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-md border text-sm ${
        status === "flagged"
          ? "border-amber-300 bg-amber-50"
          : status === "approved"
          ? "border-green-200 bg-green-50/50"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium flex-1 truncate">{obligation.name}</span>
        {obligation.riskLevel && obligation.riskLevel !== "minimal" && obligation.riskLevel !== "low" && (
          <Badge variant={riskBadgeVariant(obligation.riskLevel)} className="text-[10px] shrink-0">
            {obligation.riskLevel}
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] shrink-0">
          {obligation.confidence}
        </Badge>
        <span className="text-[10px] text-muted-foreground shrink-0">{obligation.sourceClause}</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t pt-2">
          <p className="text-muted-foreground text-xs">{obligation.description}</p>
          {obligation.trigger && (
            <p className="text-xs"><span className="font-medium">Trigger:</span> {obligation.trigger}</p>
          )}
          {obligation.dueDate && (
            <p className="text-xs"><span className="font-medium">Due:</span> {obligation.dueDate}</p>
          )}
          {obligation.survivalPeriod && (
            <p className="text-xs"><span className="font-medium">Survival:</span> {obligation.survivalPeriod}</p>
          )}
          <p className="text-[11px] text-muted-foreground italic border-l-2 pl-2 mt-1">
            {obligation.fullText.slice(0, 300)}{obligation.fullText.length > 300 ? "…" : ""}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-3 pb-2">
        <Button
          size="sm"
          variant={status === "approved" ? "default" : "outline"}
          className={`h-6 text-[10px] px-2 ${status === "approved" ? "bg-green-600 hover:bg-green-700" : ""}`}
          onClick={(e) => { e.stopPropagation(); onStatus(obligation.obligationID, "approved"); }}
        >
          <Check className="h-3 w-3 mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant={status === "flagged" ? "secondary" : "outline"}
          className="h-6 text-[10px] px-2"
          onClick={(e) => { e.stopPropagation(); onStatus(obligation.obligationID, "flagged"); }}
        >
          <Flag className="h-3 w-3 mr-1" />
          Flag
        </Button>
      </div>
    </div>
  );
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{label}</p>
      <Badge variant="outline" className="text-[10px]">{count}</Badge>
    </div>
  );
}

export default function ContractReviewStep({
  stepState,
  allStepStates,
  onComplete,
}: StepBodyProps) {
  const extractionResult = allStepStates.extract?.data?.extractionResult as ContractExtractionResult | undefined;
  const extractionMetrics = allStepStates.extract?.data?.metrics as ContractExtractionMetrics | undefined;

  const [reviewState, setReviewState] = useState<ReviewState>({});

  const handleStatus = (id: string, status: ReviewStatus) => {
    setReviewState((prev) => ({ ...prev, [id]: status }));
  };

  const allObjectIds = useMemo(() => {
    if (!extractionResult) return [];
    return [
      ...extractionResult.obligations.map((o) => o.obligationID),
      ...extractionResult.financialTerms.map((f) => f.financialTermID),
      ...extractionResult.serviceLevels.map((s) => s.serviceLevelID),
      ...extractionResult.liabilityProvisions.map((l) => l.liabilityID),
      ...extractionResult.terminationProvisions.map((t) => t.terminationID),
    ];
  }, [extractionResult]);

  const approved = allObjectIds.filter((id) => reviewState[id] === "approved").length;
  const flagged = allObjectIds.filter((id) => reviewState[id] === "flagged").length;
  const total = allObjectIds.length;

  const summaryMetrics: MetricItem[] = [
    { label: "Total Objects", value: total },
    { label: "High Confidence", value: extractionMetrics?.highConfidence ?? 0 },
    { label: "Flagged", value: flagged },
    { label: "Approved", value: approved, highlight: true },
  ];

  const canProceed = total > 0;

  const handleComplete = () => {
    onComplete({
      reviewState,
      approvedCount: approved,
      flaggedCount: flagged,
      extractionResult,
    });
  };

  if (!extractionResult) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <AlertTriangle className="h-4 w-4" />
        No extraction result found. Please complete the Extract step first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MetricCards metrics={summaryMetrics} />

      {/* Agreement summary */}
      {extractionResult.agreement && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium text-[11px] uppercase tracking-[0.06em] text-muted-foreground mb-2">Agreement</p>
          <p><span className="font-medium">Title:</span> {extractionResult.agreement.title}</p>
          <p><span className="font-medium">Type:</span> {(extractionResult.agreement.agreementType ?? "unknown").replace(/_/g, " ").toUpperCase()}</p>
          {extractionResult.agreement.effectiveDate && (
            <p><span className="font-medium">Effective:</span> {extractionResult.agreement.effectiveDate}</p>
          )}
          {extractionResult.agreement.expiryDate && (
            <p><span className="font-medium">Expiry:</span> {extractionResult.agreement.expiryDate}</p>
          )}
          {extractionResult.agreement.governingLaw && (
            <p><span className="font-medium">Governing Law:</span> {extractionResult.agreement.governingLaw}</p>
          )}
        </div>
      )}

      {/* Parties */}
      {extractionResult.parties.length > 0 && (
        <div>
          <SectionHeading label="Parties" count={extractionResult.parties.length} />
          <div className="space-y-1">
            {extractionResult.parties.map((p) => (
              <div key={p.partyID} className="flex items-center gap-2 text-sm rounded border px-3 py-2 bg-card">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {p.role.replace("_", " ")}
                </Badge>
                <span className="font-medium">{p.legalName}</span>
                {p.commonName && <span className="text-muted-foreground">({p.commonName})</span>}
                <span className="text-[10px] text-muted-foreground ml-auto">{p.sourceClause}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Obligations */}
      {extractionResult.obligations.length > 0 && (
        <div>
          <SectionHeading label="Obligations" count={extractionResult.obligations.length} />
          <div className="space-y-2">
            {extractionResult.obligations.map((o) => (
              <ObligationCard
                key={o.obligationID}
                obligation={o}
                status={reviewState[o.obligationID] ?? "pending"}
                onStatus={handleStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Financial Terms */}
      {extractionResult.financialTerms.length > 0 && (
        <div>
          <SectionHeading label="Financial Terms" count={extractionResult.financialTerms.length} />
          <div className="space-y-1">
            {extractionResult.financialTerms.map((f) => (
              <div key={f.financialTermID} className="rounded border px-3 py-2 text-sm bg-card space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{f.name}</span>
                  <Badge variant="outline" className="text-[10px]">{f.termType.replace("_", " ")}</Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground">{f.sourceClause}</span>
                </div>
                {f.amount != null && (
                  <p className="text-xs text-muted-foreground">
                    {f.currency} {f.amount.toLocaleString()}{f.frequency ? ` — ${f.frequency}` : ""}
                  </p>
                )}
                {f.paymentTerms && <p className="text-xs text-muted-foreground">{f.paymentTerms}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLAs */}
      {extractionResult.serviceLevels.length > 0 && (
        <div>
          <SectionHeading label="Service Levels" count={extractionResult.serviceLevels.length} />
          <div className="space-y-1">
            {extractionResult.serviceLevels.map((s) => (
              <div key={s.serviceLevelID} className="rounded border px-3 py-2 text-sm bg-card space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{s.sourceClause}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.metric}: <span className="font-medium text-foreground">{s.target}</span></p>
                {s.remedy && <p className="text-xs text-muted-foreground">Remedy: {s.remedy}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liability */}
      {extractionResult.liabilityProvisions.length > 0 && (
        <div>
          <SectionHeading label="Liability & Risk" count={extractionResult.liabilityProvisions.length} />
          <div className="space-y-1">
            {extractionResult.liabilityProvisions.map((l) => (
              <div key={l.liabilityID} className="rounded border px-3 py-2 text-sm bg-card space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{l.name}</span>
                  <Badge variant="outline" className="text-[10px]">{l.provisionType.replace(/_/g, " ")}</Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground">{l.sourceClause}</span>
                </div>
                {l.capAmount != null && (
                  <p className="text-xs text-muted-foreground">Cap: {l.currency} {l.capAmount.toLocaleString()}</p>
                )}
                {l.capFormula && <p className="text-xs text-muted-foreground">{l.capFormula}</p>}
                {l.carveOuts && <p className="text-xs text-muted-foreground">Carve-outs: {l.carveOuts}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Termination */}
      {extractionResult.terminationProvisions.length > 0 && (
        <div>
          <SectionHeading label="Termination & Renewal" count={extractionResult.terminationProvisions.length} />
          <div className="space-y-1">
            {extractionResult.terminationProvisions.map((t) => (
              <div key={t.terminationID} className="rounded border px-3 py-2 text-sm bg-card space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline" className="text-[10px]">{t.provisionType.replace(/_/g, " ")}</Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground">{t.sourceClause}</span>
                </div>
                {t.noticePeriod && <p className="text-xs text-muted-foreground">Notice: {t.noticePeriod}</p>}
                {t.triggerCondition && <p className="text-xs text-muted-foreground">{t.triggerCondition}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute Resolution */}
      {extractionResult.disputeResolution && (
        <div>
          <SectionHeading label="Dispute Resolution" count={1} />
          <div className="rounded border px-3 py-2 text-sm bg-card space-y-0.5">
            <p><span className="font-medium">Governing Law:</span> {extractionResult.disputeResolution.governingLaw}</p>
            <p><span className="font-medium">Mechanism:</span> {extractionResult.disputeResolution.mechanism}</p>
            {extractionResult.disputeResolution.escalationSequence && (
              <p className="text-xs text-muted-foreground">{extractionResult.disputeResolution.escalationSequence}</p>
            )}
          </div>
        </div>
      )}

      {/* Proceed */}
      {canProceed && stepState.status !== "complete" && (
        <Button
          onClick={handleComplete}
          className="bg-[var(--pipeline-navy)] hover:bg-[var(--pipeline-navy)]/90"
        >
          Proceed to Export
        </Button>
      )}
    </div>
  );
}
