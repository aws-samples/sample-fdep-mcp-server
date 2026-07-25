/**
 * Intention patch semantics.
 *
 * Skills (notably the AIM bootstrap skill) and the MCP
 * `fde_patch_intention` tool update a loaded intention incrementally.
 * This module exposes the two documented modes:
 *
 *   - `"replace"`: the patch becomes the new intention wholesale; the
 *     caller still gets schema validation on the way out.
 *   - `"merge"`: deep-merge of subtree objects (`aim`, `cloud`,
 *     `production`, `team`), concat-dedupe of arrays (`goals`,
 *     `team.primaryAgenticPlatforms`), and shallow replace of scalar
 *     fields. The `updatedAt` field is overwritten from the patch if
 *     present, otherwise left as the base value.
 *
 * Both modes are idempotent: applying the same patch twice yields the
 * same result (correctness property P7). The returned intention is
 * re-validated against the schema before it is handed back to the
 * caller.
 */

import { validateIntention } from "./loader.js";
import type { Intention } from "./types.js";

export type PatchMode = "replace" | "merge";

export type IntentionPatch = Partial<Intention>;

/**
 * Apply a patch to a loaded intention.
 *
 * @param base - The currently loaded intention.
 * @param patch - Partial intention. In `"replace"` mode the patch must
 *                itself be a schema-valid Intention.
 * @param mode - `"merge"` (default) or `"replace"`.
 * @param schemasDir - Path to the schemas directory for re-validation.
 * @returns A schema-valid, re-validated Intention.
 */
export function applyIntentionPatch(
  base: Intention,
  patch: IntentionPatch,
  mode: PatchMode,
  schemasDir: string,
): Intention {
  const next = mode === "replace" ? ({ ...patch } as unknown) : deepMerge(base, patch);
  return validateIntention(next, schemasDir);
}

function deepMerge(base: Intention, patch: IntentionPatch): Intention {
  const out: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    if (key === "aim" || key === "cloud" || key === "production" || key === "team") {
      const baseSub = (base as unknown as Record<string, unknown>)[key];
      out[key] = mergeSubtree(baseSub, value, key);
      continue;
    }

    if (key === "goals" && Array.isArray(value)) {
      const baseGoals = Array.isArray(base.goals) ? base.goals : [];
      out[key] = [...new Set([...baseGoals, ...(value as string[])])];
      continue;
    }

    out[key] = value;
  }

  return out as unknown as Intention;
}

function mergeSubtree(baseValue: unknown, patchValue: unknown, key: string): unknown {
  if (
    baseValue == null ||
    typeof baseValue !== "object" ||
    patchValue == null ||
    typeof patchValue !== "object"
  ) {
    return patchValue;
  }

  const merged: Record<string, unknown> = {
    ...(baseValue as Record<string, unknown>),
  };

  for (const [k, v] of Object.entries(patchValue as Record<string, unknown>)) {
    if (v === undefined) continue;
    // Special-case for team.primaryAgenticPlatforms: concat-dedupe.
    if (key === "team" && k === "primaryAgenticPlatforms" && Array.isArray(v)) {
      const baseArr = Array.isArray((baseValue as Record<string, unknown>)[k])
        ? ((baseValue as Record<string, unknown>)[k] as string[])
        : [];
      merged[k] = [...new Set([...baseArr, ...(v as string[])])];
      continue;
    }
    merged[k] = v;
  }

  return merged;
}
