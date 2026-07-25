/**
 * State workflow — wires `updateState` together with the planner and
 * renderer so that every state change triggers a replan and re-render
 * across the platform targets previously rendered for the engagement.
 *
 * Requirements: 3.5
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadAll } from "../loader/index.js";
import { loadPipelineDef } from "../planner/pipelineDef.js";
import { replan, type Pipeline } from "../planner/index.js";
import { renderAll } from "../renderer/orchestrator.js";
import type { PlatformTarget } from "../renderer/index.js";
import type { RenderReport } from "../renderer/managed.js";

import {
  updateState,
  type Decision,
  type EngagementState,
  type StatePatch,
} from "./index.js";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface ApplyStateUpdateInput {
  /** Absolute path to the engagement directory. */
  engagementDir: string;
  /** Path to the fde-kit root (source of programs, pipelines, schemas). */
  kitRoot: string;
  /** Field patch to merge into the engagement state. */
  patch: StatePatch;
  /** Decision record describing why the patch was applied. */
  decision: Omit<Decision, "ts" | "stateChecksum">;
  /** Pipeline name (defaults to "default"). */
  pipelineName?: string;
  /**
   * Optional override for the platform targets to re-render. Defaults to the
   * `targets` listed in the engagement's `render-manifest.json`, or to
   * `["kiro", "claude"]` if the manifest is missing.
   */
  targets?: PlatformTarget[];
}

export interface ApplyStateUpdateResult {
  state: EngagementState;
  pipeline: Pipeline;
  report: RenderReport;
  targets: PlatformTarget[];
}

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_TARGETS: PlatformTarget[] = ["kiro", "claude"];

/**
 * Read the engagement's `render-manifest.json` and return its `targets`
 * list, or `undefined` if the manifest is absent or malformed.
 */
function readManifestTargets(engagementDir: string): PlatformTarget[] | undefined {
  const manifestPath = join(engagementDir, "render-manifest.json");
  if (!existsSync(manifestPath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
      targets?: unknown;
    };
    if (!Array.isArray(parsed.targets)) return undefined;
    return (parsed.targets as string[]).filter(
      (t): t is PlatformTarget =>
        t === "kiro" ||
        t === "claude" ||
        t === "copilot" ||
        t === "codex" ||
        t === "cursor",
    );
  } catch {
    return undefined;
  }
}

/**
 * Load the previously-cached pipeline (written by `cmdInit`) from
 * `pipeline.json` so `replan` can preserve completed stages.
 */
function readCachedPipeline(engagementDir: string): Pipeline | undefined {
  const p = join(engagementDir, "pipeline.json");
  if (!existsSync(p)) return undefined;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as Pipeline;
  } catch {
    return undefined;
  }
}

/**
 * Apply a state update, re-plan the pipeline preserving completed stages,
 * and re-render every platform target previously rendered for this
 * engagement.
 *
 * The flow is:
 * 1. `updateState(engagementDir, patch, decision)` — writes the updated
 *    state and appends a decision row (with checksum) to history.jsonl.
 * 2. Detect previously rendered targets via `render-manifest.json`,
 *    falling back to `["kiro", "claude"]` if the manifest is absent.
 * 3. Load the program catalog and pipeline definition from `kitRoot`.
 * 4. Reconstruct the prior `Pipeline` from `pipeline.json`; if absent,
 *    start from a fresh plan so `replan` still has something to preserve.
 * 5. Call `replan(previous, newState, programs, pipelineDef)` to produce
 *    a refreshed pipeline that keeps completed stages byte-for-byte.
 * 6. Call `renderAll` against the resolved targets.
 * 7. Persist the refreshed `pipeline.json` and an updated
 *    `render-manifest.json`.
 *
 * @see Requirement 3.5
 */
export async function applyStateUpdateAndReplan(
  input: ApplyStateUpdateInput,
): Promise<ApplyStateUpdateResult> {
  const {
    engagementDir,
    kitRoot,
    patch,
    decision,
    pipelineName = "default",
    targets: overrideTargets,
  } = input;

  // 1. Update state (writes current.yaml + appends decision to history).
  const state = updateState(engagementDir, patch, decision);

  // 2. Resolve platform targets.
  const targets: PlatformTarget[] =
    overrideTargets && overrideTargets.length > 0
      ? overrideTargets
      : (readManifestTargets(engagementDir) ?? DEFAULT_TARGETS);

  // 3. Load catalog + pipeline definition.
  const schemasDir = join(kitRoot, "schemas");
  const programsDir = join(kitRoot, "programs");
  const { programs } = loadAll(programsDir, schemasDir);
  const pipelineDef = loadPipelineDef(kitRoot, pipelineName);

  // 4. Read the previously cached pipeline (if any) so replan can preserve
  //    completed stages. If it's missing, synthesize a minimal "empty"
  //    pipeline — `replan` falls back to a fresh plan for every stage.
  const prior: Pipeline = readCachedPipeline(engagementDir) ?? {
    engagementId: state.customer,
    stages: [],
    createdAt: state.startedAt,
    version: "0.0.0",
  };

  // 5. Replan.
  const pipeline = replan(
    prior,
    {
      customer: state.customer,
      intent: state.intent,
      aimTier: state.aimTier,
      intake: state.intake,
      currentStage: state.currentStage,
    },
    programs,
    pipelineDef,
  );

  // 6. Render.
  const report = await renderAll({
    pipeline,
    programs,
    targets,
    engagementDir,
  });

  // 7. Persist pipeline.json + render-manifest.json.
  writeFileSync(
    join(engagementDir, "pipeline.json"),
    JSON.stringify(pipeline, null, 2),
    "utf-8",
  );
  writeFileSync(
    join(engagementDir, "render-manifest.json"),
    JSON.stringify(
      {
        engagementId: state.customer,
        generatedAt: new Date().toISOString(),
        targets,
        written: report.written,
        conflicts: report.conflicts,
      },
      null,
      2,
    ),
    "utf-8",
  );

  return { state, pipeline, report, targets };
}
