/**
 * Resolver — evaluates activation predicates against an intention and
 * applies matching lens overlays to active programs, producing a
 * deterministic ResolvedGraph.
 *
 * The resolver is a pure function modulo `generatedAt`. Two calls with
 * the same `(intention, programs, lenses)` produce element-by-element
 * equal `activePrograms`, `activeLenses`, and `diagnostics` arrays
 * (correctness property P1). The result is also independent of input
 * ordering (P2) and of any downstream target list (P4). Lens composition
 * is conservative: with no matching lens, effective == base (P6).
 *
 * See design.md §Algorithmic Pseudocode — resolve() for the formal
 * specification, preconditions, postconditions, and loop invariants.
 */

import { createHash } from "node:crypto";
import { parse, evaluate, type ExpressionContext } from "../expression/index.js";
import type { Intention } from "../intention/types.js";
import type {
  ActiveLens,
  ActiveProgram,
  ActivationBlock,
  ActivationTrace,
  ExitCriterion,
  LensOverlay,
  ResolveInput,
  ResolvedGraph,
  ResolverDiagnostic,
} from "./types.js";

/* ------------------------------------------------------------------ */
/*  Public entrypoint                                                  */
/* ------------------------------------------------------------------ */

export function resolve(input: ResolveInput): ResolvedGraph {
  const { intention, programs, lenses } = input;
  const ctx = buildContext(intention);
  const diagnostics: ResolverDiagnostic[] = [];

  // Phase 1 — evaluate program activations.
  const programActivations = programs
    .map((program) => {
      const { score, trace } = evaluateActivation(program.applicability
        ? legacyApplicabilityAsBlock(program.applicability)
        : (program as unknown as { activation?: ActivationBlock }).activation ?? { rules: [] },
        ctx,
      );
      return { program, score, trace };
    })
    .filter((entry) => entry.score > 0);

  // Phase 2 — evaluate lens activations.
  const lensActivations = lenses
    .map((lens) => {
      const { score, trace } = evaluateActivation(lens.activation, ctx);
      return { lens, score, trace };
    })
    .filter((entry) => entry.score > 0)
    // Deterministic overlay order: lens id ASC so two lenses targeting the
    // same program always compose the same way across runs (P1, P2).
    .sort((a, b) => a.lens.id.localeCompare(b.lens.id));

  // Phase 3 — dependency diagnostics.
  const activeIds = new Set(programActivations.map((entry) => entry.program.id));
  for (const entry of programActivations) {
    for (const dep of entry.program.dependsOn ?? []) {
      if (!activeIds.has(dep)) {
        diagnostics.push({
          severity: "warning",
          code: "UnresolvedDependency",
          programId: entry.program.id,
          detail: `depends on '${dep}' which is not active`,
        });
      }
    }
  }

  // Phase 4 — apply lens overlays to active programs.
  const activePrograms: ActiveProgram[] = programActivations.map((entry) => {
    let steering = [...entry.program.steering];
    let skills = [...entry.program.skills];
    let exitCriteria: ExitCriterion[] = (entry.program.exitCriteria ?? []).map(toExitCriterion);
    const overlayedBy = new Set<string>();

    for (const active of lensActivations) {
      for (const overlay of active.lens.overlays) {
        if (overlay.targetProgram !== entry.program.id) continue;
        overlayedBy.add(active.lens.id);
        steering = dedupe([...steering, ...(overlay.addSteering ?? [])]);
        skills = dedupe([...skills, ...(overlay.addSkills ?? [])]);
        exitCriteria = mergeExitCriteria(
          exitCriteria,
          overlay,
          entry.program.id,
          active.lens.id,
          diagnostics,
        );
      }
    }

    // Deterministic final ordering (P1, P2).
    steering.sort();
    skills.sort();
    exitCriteria.sort((a, b) => a.id.localeCompare(b.id));

    return {
      id: entry.program.id,
      score: entry.score,
      trace: entry.trace,
      effectiveSteering: steering,
      effectiveSkills: skills,
      effectiveExitCriteria: exitCriteria,
      overlayedBy: [...overlayedBy].sort(),
    };
  });

  // Phase 5 — detect cross-lens overlay conflicts (two active lenses both
  // overriding the same exit-criterion id on the same program).
  const overrideWitness = new Map<string, string>();
  for (const active of lensActivations) {
    for (const overlay of active.lens.overlays) {
      for (const override of overlay.overrideExitCriteria ?? []) {
        const key = `${overlay.targetProgram}::${override.id}`;
        const prev = overrideWitness.get(key);
        if (prev && prev !== active.lens.id) {
          diagnostics.push({
            severity: "warning",
            code: "OverlayConflict",
            programId: overlay.targetProgram,
            lensId: active.lens.id,
            detail: `lens '${active.lens.id}' overrides exit criterion '${override.id}' on program '${overlay.targetProgram}' also overridden by '${prev}'`,
          });
        } else {
          overrideWitness.set(key, active.lens.id);
        }
      }
    }
  }

  // Phase 6 — final sort (score DESC, id ASC).
  activePrograms.sort((a, b) => {
    const byScore = b.score - a.score;
    if (byScore !== 0) return byScore;
    return a.id.localeCompare(b.id);
  });

  const activeLenses: ActiveLens[] = lensActivations.map((entry) => ({
    id: entry.lens.id,
    score: entry.score,
    trace: entry.trace,
  }));

  return {
    intentionChecksum: canonicalChecksum(intention),
    activePrograms,
    activeLenses,
    diagnostics,
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Activation evaluator                                               */
/* ------------------------------------------------------------------ */

function evaluateActivation(
  block: ActivationBlock,
  ctx: ExpressionContext,
): { score: number; trace: ActivationTrace[] } {
  const trace: ActivationTrace[] = [];
  if (block.rules.length === 0) return { score: 0, trace };

  if (block.combine === "all") {
    let total = 0;
    for (const rule of block.rules) {
      const matched = evaluateRule(rule.when, ctx);
      trace.push({
        when: rule.when,
        weight: rule.weight,
        matched,
        ...(rule.reason !== undefined ? { reason: rule.reason } : {}),
      });
      if (!matched) {
        // `all` requires every rule to match; any miss zeroes the score.
        return { score: 0, trace };
      }
      total += rule.weight;
    }
    return { score: total, trace };
  }

  // Default: "any" — highest matching weight wins; every rule recorded.
  let highest = 0;
  for (const rule of block.rules) {
    const matched = evaluateRule(rule.when, ctx);
    trace.push({
      when: rule.when,
      weight: rule.weight,
      matched,
      ...(rule.reason !== undefined ? { reason: rule.reason } : {}),
    });
    if (matched && rule.weight > highest) {
      highest = rule.weight;
    }
  }
  return { score: highest, trace };
}

function evaluateRule(expr: string, ctx: ExpressionContext): boolean {
  // Rules are parsed here for now. A future optimization (design §LLD)
  // caches the AST at load time so resolve() can skip re-parsing.
  return evaluate(parse(expr), ctx);
}

/* ------------------------------------------------------------------ */
/*  Lens overlay composition                                           */
/* ------------------------------------------------------------------ */

function mergeExitCriteria(
  base: readonly ExitCriterion[],
  overlay: LensOverlay,
  programId: string,
  lensId: string,
  diagnostics: ResolverDiagnostic[],
): ExitCriterion[] {
  const merged: ExitCriterion[] = [...base];
  const baseIds = new Set(merged.map((criterion) => criterion.id));
  const overrideIds = new Set((overlay.overrideExitCriteria ?? []).map((c) => c.id));

  // Additive criteria: skip when already present unless the same overlay
  // lists it in overrideExitCriteria (in which case the override wins).
  for (const additive of overlay.addExitCriteria ?? []) {
    if (baseIds.has(additive.id)) {
      if (!overrideIds.has(additive.id)) {
        // Silently skip — lens is re-adding something already there.
        continue;
      }
      // Falls through: the override below will replace the existing entry.
      continue;
    }
    merged.push(additive);
    baseIds.add(additive.id);
  }

  // Overrides: replace existing by id; missing ids produce an OverlayError
  // diagnostic and leave the base unchanged.
  for (const override of overlay.overrideExitCriteria ?? []) {
    const idx = merged.findIndex((criterion) => criterion.id === override.id);
    if (idx === -1) {
      diagnostics.push({
        severity: "error",
        code: "OverlayError",
        programId,
        lensId,
        detail: `cannot override non-existent exit criterion '${override.id}'`,
      });
      continue;
    }
    merged[idx] = override;
  }

  return merged;
}

/* ------------------------------------------------------------------ */
/*  Expression context construction                                    */
/* ------------------------------------------------------------------ */

function buildContext(intention: Intention): ExpressionContext {
  return {
    // Legacy fields — populated from the intention where the mapping is
    // obvious, so programs authored against the old `intent`/`aimTier`/
    // `intake` contract keep evaluating.
    intent: [...intention.goals],
    aimTier: intention.aim?.overall,
    intake: intention as unknown as Record<string, unknown>,

    // Intention-driven fields.
    industry: intention.industry,
    regulated: intention.regulated,
    aim: (intention.aim ?? {}) as Record<string, unknown>,
    cloud: (intention.cloud ?? {}) as Record<string, unknown>,
    goals: intention.goals,
    production: (intention.production ?? {}) as Record<string, unknown>,
    team: (intention.team ?? {}) as Record<string, unknown>,
    workload: (intention.workload ?? {}) as Record<string, unknown> | undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Legacy compatibility                                               */
/* ------------------------------------------------------------------ */

/**
 * Adapt a legacy program's `applicability` array into the newer
 * `ActivationBlock` shape. Legacy programs use combine: any semantics
 * implicitly, which matches the new default.
 */
function legacyApplicabilityAsBlock(
  applicability: Array<{ when: string; weight: number }>,
): ActivationBlock {
  return {
    combine: "any",
    rules: applicability.map((rule) => ({ when: rule.when, weight: rule.weight })),
  };
}

function toExitCriterion(x: {
  id: string;
  description: string;
  check: string;
  target?: string;
}): ExitCriterion {
  return {
    id: x.id,
    description: x.description,
    check: x.check as ExitCriterion["check"],
    ...(x.target !== undefined ? { target: x.target } : {}),
  };
}

/* ------------------------------------------------------------------ */
/*  Canonical intention checksum                                       */
/* ------------------------------------------------------------------ */

function canonicalChecksum(intention: Intention): string {
  const canonical = JSON.stringify(sortObjectKeys(intention));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
  }
  return out;
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export type { ResolvedGraph, ResolveInput } from "./types.js";
