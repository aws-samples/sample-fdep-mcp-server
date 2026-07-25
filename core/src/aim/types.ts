/**
 * Types for the AIM (AI Maturity Model) bootstrap skill surface.
 *
 * These are pure data shapes used by:
 *   - `selectAimMode` (see `./select.ts`), which picks between the
 *     pre-generated and runtime-agentic AIM assessment skills.
 *   - the `fde_aim_assess` MCP handler, which emits an
 *     `AimAssessmentResult` patch against the intention.
 *
 * Pure; no I/O. See `design.md` §"AIM Assessment Skill Structure" and
 * §"Decision point (pre-generated vs runtime)".
 */

import type { AimScores } from "../intention/types.js";

/**
 * Which AIM bootstrap skill body to run for a given intention.
 *
 * - `"pre-generated"` — a static markdown skill with a full question bank
 *   and scoring rubric. Deterministic, offline-capable, auditable. Used
 *   for regulated engagements and when no MCP server is available.
 * - `"runtime"` — a thin agentic skill that delegates to the agent to
 *   conduct an adaptive interview, calling back into the MCP server for
 *   scoring. Used when an MCP server is available and the engagement is
 *   not regulated.
 */
export type AimMode = "pre-generated" | "runtime";

/**
 * Caller-supplied preferences that steer AIM mode selection.
 *
 * Both fields are optional. When both are unset the selection algorithm
 * falls through to the intention-derived defaults (see `selectAimMode`).
 */
export interface AimPreferences {
  /**
   * When set, `selectAimMode` returns this mode unconditionally.
   * This is the highest-priority signal — it overrides every other
   * branch of the decision algorithm.
   */
  readonly forceMode?: AimMode;

  /**
   * Whether an MCP server is currently reachable for the session.
   * Used only when `forceMode` is unset and the intention is not
   * regulated. Defaults to `false` when unset.
   */
  readonly mcpServerAvailable?: boolean;
}

/**
 * A single piece of evidence captured during an AIM assessment.
 * Skills cite responses back into the assessment artifact so a reviewer
 * can audit how a tier was assigned.
 */
export interface EvidenceRef {
  /** The question id the evidence answers (e.g. `governance.q3`). */
  readonly questionId: string;
  /** Free-text excerpt of the customer response; no PII normalisation. */
  readonly excerpt: string;
  /** Optional citation (file path, URL, interview note id). */
  readonly source?: string;
}

/**
 * A single prioritised follow-up action surfaced by an AIM assessment.
 * Recommendations are derived deterministically from the scored tiers:
 * the lowest-scoring perspectives drive the highest-priority actions.
 */
export interface AimRecommendation {
  /** Stable id, e.g. `governance-uplift`. */
  readonly id: string;
  /** The perspective this recommendation targets. */
  readonly target: string;
  /** The tier that triggered this recommendation (1..5). */
  readonly tier: number;
  /** Priority rank — 1 is most urgent (lowest tier). */
  readonly priority: number;
  /** Human-readable rationale shown to the FDE / customer. */
  readonly reason: string;
}

/**
 * The structured output of an AIM assessment. Shared by both the
 * pre-generated and runtime-agentic skill modes so downstream
 * consumers (notably `applyIntentionPatch`) don't care which mode
 * produced the scores.
 */
export interface AimAssessmentResult {
  /** AIM score patch to merge into the intention's `aim` subtree. */
  readonly aim: AimScores;
  /** Citations to the responses that justify each score. */
  readonly evidence: readonly EvidenceRef[];
  /** Prioritised follow-up actions surfaced to the FDE. */
  readonly recommendations: readonly AimRecommendation[];
}
