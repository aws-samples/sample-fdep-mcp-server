/**
 * Pipeline Planner — deterministic, pure function over
 * (programs, state, pipelineDef) that produces a Pipeline instance.
 *
 * The planner evaluates each program's applicability rules against the
 * current engagement state, scores and ranks candidates per stage,
 * enforces dependency constraints, and returns a fully resolved Pipeline.
 */

import {
  parse as parseExpression,
  evaluate,
  type ExpressionContext,
} from "../expression/index.js";
import type { LoadedProgram } from "../loader/index.js";
import { FDE_KIT_VERSION } from "../index.js";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export type PipelineStage = "intent" | "assess" | "transform" | "ai-native";

export interface PipelineDef {
  stages: PipelineStage[];
  entry: Record<string, string>;
}

export interface PlanInput {
  programs: LoadedProgram[];
  state: PlanState;
  pipelineDef: PipelineDef;
}

export interface PlanState {
  customer: string;
  intent: string[];
  aimTier?: number | undefined;
  intake: Record<string, unknown>;
  currentStage: PipelineStage;
}

export interface ActivatedProgram {
  programId: string;
  reason: string;
  score: number;
}

export interface ExitCriterion {
  id: string;
  description: string;
  check: string;
  target?: string | undefined;
}

export interface PipelineStageInstance {
  stage: PipelineStage;
  activatedPrograms: ActivatedProgram[];
  status: "pending" | "active" | "done" | "skipped";
  entryCondition: string;
  exitCriteria: ExitCriterion[];
  expectedArtifacts: string[];
}

export interface Pipeline {
  engagementId: string;
  stages: PipelineStageInstance[];
  createdAt: string;
  version: string;
}

/* ------------------------------------------------------------------ */
/*  Core planner                                                       */
/* ------------------------------------------------------------------ */

/**
 * Check whether all dependencies of a program are satisfied by programs
 * activated in prior stages or in the current candidate set.
 */
function depsSatisfied(
  program: LoadedProgram,
  priorStages: PipelineStageInstance[],
  currentCandidateIds: Set<string>,
): boolean {
  if (!program.dependsOn || program.dependsOn.length === 0) return true;

  const activatedIds = new Set<string>();
  for (const stage of priorStages) {
    for (const ap of stage.activatedPrograms) {
      activatedIds.add(ap.programId);
    }
  }

  for (const dep of program.dependsOn) {
    if (!activatedIds.has(dep) && !currentCandidateIds.has(dep)) {
      return false;
    }
  }
  return true;
}

/**
 * Merge exit criteria from multiple programs, deduplicating by id.
 */
function mergeCriteria(
  programs: LoadedProgram[],
): ExitCriterion[] {
  const seen = new Set<string>();
  const result: ExitCriterion[] = [];
  for (const p of programs) {
    for (const ec of p.exitCriteria) {
      if (!seen.has(ec.id)) {
        seen.add(ec.id);
        result.push({
          id: ec.id,
          description: ec.description,
          check: ec.check,
          target: ec.target,
        });
      }
    }
  }
  return result;
}

/**
 * Collect expected artifact paths from a program's templates list.
 */
function outputsOf(program: LoadedProgram): string[] {
  return program.templates.slice();
}

/**
 * Produce a Pipeline instance from a program catalog, engagement state,
 * and pipeline definition.
 *
 * This function is **pure and deterministic**: given the same inputs
 * (regardless of program catalog ordering), it produces the same Pipeline.
 *
 * Determinism is achieved by:
 * 1. Sorting candidates by score descending, then by programId ascending
 *    (stable tiebreaker) before emitting activatedPrograms.
 * 2. Using no randomness or external state.
 */
export function plan(input: PlanInput): Pipeline {
  const { programs, state, pipelineDef } = input;
  const stages: PipelineStageInstance[] = [];

  for (const stage of pipelineDef.stages) {
    const candidates: Array<{
      program: LoadedProgram;
      score: number;
      reason: string;
    }> = [];

    for (const program of programs) {
      if (!program.stages.includes(stage)) continue;

      for (const rule of program.applicability) {
        const ctx: ExpressionContext = {
          intent: state.intent,
          aimTier: state.aimTier,
          intake: state.intake,
        };
        const ast = parseExpression(rule.when);
        const matched = evaluate(ast, ctx);
        if (matched) {
          candidates.push({
            program,
            score: rule.weight,
            reason: `matched rule: ${rule.when}`,
          });
          break; // first matching rule per program wins
        }
      }
    }

    // Build set of candidate ids for same-stage dep resolution
    const candidateIds = new Set(candidates.map((c) => c.program.id));

    // Filter by dependency satisfaction
    const active = candidates.filter((c) =>
      depsSatisfied(c.program, stages, candidateIds),
    );

    // Sort deterministically: descending by score, then ascending by programId
    active.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.program.id.localeCompare(b.program.id);
    });

    const activePrograms = active.map((c) => c.program);

    stages.push({
      stage,
      activatedPrograms: active.map((c) => ({
        programId: c.program.id,
        reason: c.reason,
        score: c.score,
      })),
      status: state.currentStage === stage ? "active" : "pending",
      entryCondition: pipelineDef.entry[stage] ?? "always",
      exitCriteria: mergeCriteria(activePrograms),
      expectedArtifacts: activePrograms.flatMap((p) => outputsOf(p)),
    });
  }

  return {
    engagementId: state.customer,
    stages,
    createdAt: new Date().toISOString(),
    version: FDE_KIT_VERSION,
  };
}

/* ------------------------------------------------------------------ */
/*  Replan                                                             */
/* ------------------------------------------------------------------ */

/**
 * Re-plan the pipeline under an updated engagement state while preserving
 * the historical record of already-completed stages.
 *
 * Behavior:
 * 1. Produces a fresh pipeline via `plan({ programs, state: newState, pipelineDef })`.
 * 2. For every stage in the newly-planned pipeline, if the corresponding
 *    stage in `currentPipeline` (matched by `stage` key) has `status === "done"`,
 *    the preserved stage from `currentPipeline` replaces the freshly-planned one
 *    byte-for-byte (deep-cloned so callers can't mutate history).
 * 3. Pending, active, and skipped stages are taken from the fresh plan so that
 *    state-driven changes to applicability/dependencies take effect.
 * 4. `engagementId` and `version` come from the fresh plan; `createdAt` is a
 *    fresh ISO timestamp (matching `plan()`'s contract).
 *
 * Pure and deterministic modulo `createdAt`: given identical inputs, the
 * returned pipeline's `stages`, `engagementId`, and `version` are identical.
 *
 * Defensive note: if `currentPipeline` and the fresh plan disagree on the set
 * of stages (shouldn't happen with a stable `pipelineDef`), only stages whose
 * `stage` key exists in both are preserved when done; otherwise the fresh
 * plan's stage is used.
 *
 * @see Requirement 3.5
 */
export function replan(
  currentPipeline: Pipeline,
  newState: PlanState,
  programs: LoadedProgram[],
  pipelineDef: PipelineDef,
): Pipeline {
  const fresh = plan({ programs, state: newState, pipelineDef });

  // Index current stages by their `stage` key for O(1) lookup.
  const currentByStage = new Map<PipelineStage, PipelineStageInstance>();
  for (const s of currentPipeline.stages) {
    currentByStage.set(s.stage, s);
  }

  const mergedStages: PipelineStageInstance[] = fresh.stages.map((freshStage) => {
    const prior = currentByStage.get(freshStage.stage);
    if (prior && prior.status === "done") {
      // Preserve the historical record byte-for-byte. structuredClone ensures
      // callers cannot mutate the returned pipeline and have that mutation
      // leak back into `currentPipeline`.
      return structuredClone(prior);
    }
    return freshStage;
  });

  return {
    engagementId: fresh.engagementId,
    stages: mergedStages,
    createdAt: fresh.createdAt,
    version: fresh.version,
  };
}
