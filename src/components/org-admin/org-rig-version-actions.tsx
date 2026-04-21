"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { transitionOrgRigVersionState } from "@/app/org-admin/rigs/actions";

/**
 * Client control for state transitions on an Organisation rig_version.
 * Wraps the server action in a confirmation dialog — promotion to validated
 * or deprecated is not reversible.
 */
export function OrgRigVersionActions({
  rigVersionId,
  currentState,
}: {
  rigVersionId: string;
  currentState: "draft" | "experimental" | "validated" | "deprecated";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextOptions: Array<{
    target: "experimental" | "validated" | "deprecated";
    label: string;
    description: string;
  }> = [];

  if (currentState === "draft") {
    nextOptions.push({
      target: "experimental",
      label: "Promote to experimental",
      description:
        "The version becomes bindable by workspaces flagged for experimental access. Runs execute and debit credits but are marked experimental. Composition fields become immutable.",
    });
  }
  if (currentState === "experimental") {
    nextOptions.push({
      target: "validated",
      label: "Promote to validated",
      description:
        "The version becomes fully bindable and is the default for commercial use. Requires at least two independent successful domain runs with calibration evidence attached.",
    });
    nextOptions.push({
      target: "deprecated",
      label: "Deprecate",
      description:
        "Starts a 90-day deprecation window. No new bindings accepted; existing bindings continue to run until the window closes.",
    });
  }
  if (currentState === "validated") {
    nextOptions.push({
      target: "deprecated",
      label: "Deprecate",
      description:
        "Starts a 90-day deprecation window. No new bindings accepted; existing bindings continue to run until the window closes.",
    });
  }

  if (nextOptions.length === 0) {
    return (
      <span className="text-xs italic text-slate-500">
        {currentState === "deprecated" ? "Terminal state." : null}
      </span>
    );
  }

  function run(target: "experimental" | "validated" | "deprecated") {
    setError(null);
    startTransition(async () => {
      try {
        await transitionOrgRigVersionState(rigVersionId, target);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transition failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {nextOptions.map((opt) => (
        <AlertDialog key={opt.target}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant={opt.target === "deprecated" ? "outline" : "default"}
              disabled={isPending}
              className={
                opt.target === "deprecated"
                  ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                  : "bg-[#0EA5A0] text-white hover:bg-[#0B8A86]"
              }
            >
              {opt.label}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{opt.label}?</AlertDialogTitle>
              <AlertDialogDescription>{opt.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(opt.target)}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}
