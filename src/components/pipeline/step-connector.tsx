import type { StepStatus } from "@/types/pipeline";

interface StepConnectorProps {
  prevStatus: StepStatus;
}

export function StepConnector({ prevStatus }: StepConnectorProps) {
  const isComplete = prevStatus === "complete";
  return (
    <div className="flex justify-start pl-[34px]">
      <div
        className="w-[2px] h-6 transition-colors duration-300"
        style={{
          backgroundColor: isComplete
            ? "var(--pipeline-navy)"
            : "var(--pipeline-connector)",
        }}
      />
    </div>
  );
}
