/**
 * Intention model — types mirroring `schemas/intention.schema.json`.
 *
 * An intention is a schema-validated YAML or JSON document describing a
 * customer's observable state: AI Maturity Model (AIM) scores, industry,
 * cloud posture, regulatory context, production AI inventory, team shape,
 * and engagement goals. It is the sole input to resolution in the
 * intention-driven harness (design.md §Components — Intention Model).
 *
 * These types are the TypeScript contract for the schema; the authoritative
 * shape is the JSON schema. Keep them in sync.
 */

/** AIM tier value in the closed interval [1, 5]. */
export type AimTier = 1 | 2 | 3 | 4 | 5;

/** Industry taxonomy recognised by the resolver and lenses. */
export type Industry =
  | "financial-services"
  | "healthcare"
  | "entertainment"
  | "public-sector"
  | "retail"
  | "manufacturing"
  | "other";

/** The closed set of industries treated as regulated by default. */
export const REGULATED_INDUSTRIES: readonly Industry[] = [
  "financial-services",
  "healthcare",
  "public-sector",
] as const;

/** Engagement goal. */
export type Goal =
  | "gen-ai-rollout"
  | "responsible-ai"
  | "ai-operations"
  | "prototyping"
  | "resilience"
  | "build"
  | "aidlc"
  | "other";

/** Supported agentic platform id (14 targets). */
export type HarnessTargetId =
  | "kiro"
  | "claude"
  | "copilot"
  | "cursor"
  | "codex"
  | "cline"
  | "continue"
  | "aider"
  | "windsurf"
  | "zed"
  | "chatgpt-custom-gpt"
  | "gemini-code-assist"
  | "mcp";

/** AIM score subtree. All perspectives optional. */
export interface AimScores {
  readonly business?: AimTier;
  readonly people?: AimTier;
  readonly governance?: AimTier;
  readonly platform?: AimTier;
  readonly security?: AimTier;
  readonly operations?: AimTier;
  readonly overall?: AimTier;
}

/** Cloud posture subtree. */
export interface CloudPosture {
  readonly primary?: "aws" | "azure" | "gcp" | "other";
  readonly multicloud?: boolean;
  readonly posture?: "all-in" | "hybrid" | "repatriating";
}

/** Production AI inventory. */
export interface ProductionInventory {
  readonly aiSystems?: number;
  readonly developerCount?: number;
}

/** Team shape and platform preferences. */
export interface TeamShape {
  readonly size?: number;
  readonly primaryAgenticPlatforms?: readonly HarnessTargetId[];
}

/** Workload application archetype. */
export type AppType =
  | "document-pipeline"
  | "claims-processing"
  | "contact-center"
  | "enterprise-chatbot"
  | "rag-assistant"
  | "multi-agent"
  | "custom";

/** Workload maturity level. */
export type AppLevel = "PoC" | "MVP" | "Production";

/** Workload context for build/prototype engagements. */
export interface Workload {
  readonly appType?: AppType;
  readonly appLevel?: AppLevel;
  readonly primaryDescription?: string;
}

/** An intention file. */
export interface Intention {
  readonly schemaVersion: "1";
  readonly customer: string;
  readonly industry?: Industry;
  readonly regulated?: boolean;
  readonly aim?: AimScores;
  readonly cloud?: CloudPosture;
  readonly goals: readonly Goal[];
  readonly production?: ProductionInventory;
  readonly team?: TeamShape;
  readonly workload?: Workload;
  readonly notes?: string;
  /** ISO-8601 timestamp. */
  readonly updatedAt: string;
}

/**
 * Diagnostics emitted by the intention loader on validation failure.
 * Field paths follow JSON-Pointer style (e.g. `/aim/governance`).
 */
export interface IntentionDiagnostic {
  readonly severity: "error" | "warning";
  readonly file?: string;
  readonly field?: string;
  readonly message: string;
}

/** Thrown when an intention file fails schema validation. */
export class IntentionValidationError extends Error {
  constructor(
    message: string,
    public readonly diagnostics: readonly IntentionDiagnostic[],
  ) {
    super(message);
    this.name = "IntentionValidationError";
  }
}

/**
 * Return `true` when `industry` should cause `regulated` to be inferred as
 * `true`. Pure; no I/O. The inference is applied only when `regulated` is
 * unset on the loaded intention.
 */
export function isRegulatedIndustry(industry: Industry | undefined): boolean {
  if (!industry) return false;
  return REGULATED_INDUSTRIES.includes(industry);
}
