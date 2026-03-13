import type { BenchmarkQuery } from "@/types/pipeline";

interface BenchmarkConfig {
  name: string;
  description: string;
  requiredClasses?: string[];
  requiredProperties?: string[];
}

// Default C-Track benchmark queries from PRD
const CTRACK_BENCHMARKS: BenchmarkConfig[] = [
  {
    name: "Vehicle class hierarchy",
    description: "Vehicle, ElectricVehicle as subclass with correct parent chain",
    requiredClasses: ["Vehicle", "ElectricVehicle"],
  },
  {
    name: "DrivingEvent taxonomy",
    description: "DrivingEvent with HarshMovement, OverSpeed sub-events",
    requiredClasses: ["DrivingEvent", "HarshMovement", "OverSpeed"],
  },
  {
    name: "Trip-Driver relationship",
    description: "Trip has drivenBy property linking to Driver",
    requiredProperties: ["drivenBy", "hasDriver"],
  },
  {
    name: "Fleet composition",
    description: "Fleet entity with hasVehicle relationship",
    requiredClasses: ["Fleet"],
    requiredProperties: ["hasVehicle"],
  },
  {
    name: "Telemetry data properties",
    description: "TelemetryUnit with relevant data properties",
    requiredClasses: ["TelemetryUnit"],
  },
];

function findInTurtle(turtle: string, term: string): boolean {
  // Check for the term as a local name in the turtle (case-insensitive for flexibility)
  const patterns = [
    new RegExp(`:\\s*${term}\\b`, "i"),
    new RegExp(`/${term}[#>]`, "i"),
    new RegExp(`#${term}\\b`, "i"),
    new RegExp(`"${term}"`, "i"),
  ];
  return patterns.some((p) => p.test(turtle));
}

export function runBenchmarks(
  turtle: string,
  benchmarks?: BenchmarkConfig[]
): BenchmarkQuery[] {
  const configs = benchmarks ?? CTRACK_BENCHMARKS;

  return configs.map((benchmark) => {
    const expectedClasses = benchmark.requiredClasses ?? [];
    const expectedProps = benchmark.requiredProperties ?? [];
    const allExpected = [...expectedClasses, ...expectedProps];

    const foundClasses = expectedClasses.filter((c) => findInTurtle(turtle, c));
    const foundProps = expectedProps.filter((p) => findInTurtle(turtle, p));
    const allFound = [...foundClasses, ...foundProps];

    const passed = allExpected.length > 0 && allFound.length === allExpected.length;

    return {
      name: benchmark.name,
      description: benchmark.description,
      expected: allExpected,
      actual: allFound,
      passed,
    };
  });
}
