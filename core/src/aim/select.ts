/**
 * Selects which AIM bootstrap skill mode to run for a given intention.
 *
 * Implements the decision algorithm from `design.md` §"Decision point
 * (pre-generated vs runtime)":
 *
 *   1. If `preferences.forceMode` is set, return it (caller override wins).
 *   2. If `intention.regulated === true`, return `"pre-generated"`
 *      (auditability: regulated engagements require the deterministic
 *      question bank + scoring rubric).
 *   3. If `preferences.mcpServerAvailable === true`, return `"runtime"`
 *      (adaptive interview via MCP callbacks).
 *   4. Otherwise return `"pre-generated"` (safe offline default).
 *
 * Pure; no I/O. No closures over globals. Deterministic on its inputs.
 */

import type { Intention } from "../intention/types.js";
import type { AimMode, AimPreferences } from "./types.js";

/**
 * Decide which AIM bootstrap skill body to run.
 *
 * @param intention   the current engagement intention (regulated flag
 *                    drives the auditability branch).
 * @param preferences optional caller preferences. `forceMode` wins
 *                    unconditionally; `mcpServerAvailable` is consulted
 *                    only for non-regulated engagements with no forced
 *                    mode.
 * @returns the selected `AimMode`.
 */
export function selectAimMode(
  intention: Intention,
  preferences: AimPreferences,
): AimMode {
  // 1. Explicit caller override wins.
  if (preferences.forceMode !== undefined) {
    return preferences.forceMode;
  }

  // 2. Regulated engagements always use the pre-generated, auditable body.
  if (intention.regulated === true) {
    return "pre-generated";
  }

  // 3. MCP server present → use the adaptive runtime body.
  if (preferences.mcpServerAvailable === true) {
    return "runtime";
  }

  // 4. Safe offline default.
  return "pre-generated";
}
