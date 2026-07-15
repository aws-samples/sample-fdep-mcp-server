/**
 * Harness Renderer orchestrator — `renderAll(pipeline, targets, engagementDir)`.
 *
 * Walks every activated program in the pipeline, invokes the appropriate
 * adapter's render methods, and writes files via `writeManaged` so each
 * file carries an FDE_MANAGED header with a content hash.
 *
 * When an adapter emits multiple `WrittenFile` entries that share the same
 * target path (e.g. Claude's `.claude/CLAUDE.md` collecting every steering
 * file into one monolith), the orchestrator concatenates the bodies in a
 * deterministic order (first-emitted-first) and issues a single
 * `writeManaged` call. Without this step the second write would see a
 * mismatched `FDE_MANAGED` hash and the content would be dropped as a
 * false conflict.
 *
 * Requirements: 4.1, 4.2, 4.5, 6.7, 10.3, 11.1
 */

import * as path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { LoadedProgram } from "../loader/index.js";
import { loadSteeringFile, loadSkillFile } from "../loader/artifacts.js";
import type { Pipeline } from "../planner/index.js";
import type { ActiveProgram, LoadedLens } from "../resolver/types.js";
import {
  writeManaged,
  type RenderReport,
} from "./managed.js";
import {
  type HarnessAdapter,
  type HarnessTarget,
  type RenderContext,
  type SteeringFile as PortableSteering,
  type Skill as PortableSkill,
  type ReferenceFile as PortableReference,
  type EngagementSpec,
  type WrittenFile,
} from "./index.js";
import { getAdapter } from "./registry.js";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface RenderAllInput {
  pipeline: Pipeline;
  /** Loaded program catalog (needed to resolve steering / skill bodies). */
  programs: LoadedProgram[];
  /** List of harness targets to render. */
  targets: HarnessTarget[];
  /** Root engagement directory; all output is relative to this. */
  engagementDir: string;
  /**
   * Resolver output: active programs with lens-overlay composed
   * effectiveSteering/effectiveSkills. When provided, the renderer
   * materializes lens-contributed files in addition to base program files.
   */
  resolvedActivePrograms?: readonly ActiveProgram[];
  /** Loaded lens catalog (needed to resolve lens overlay file paths). */
  lenses?: readonly LoadedLens[];
}

/**
 * Render the given pipeline into every requested harness target's subtree
 * under `engagementDir`. Returns a consolidated render report.
 */
export async function renderAll(input: RenderAllInput): Promise<RenderReport> {
  const { pipeline, programs, targets, engagementDir, resolvedActivePrograms, lenses } = input;

  const report: RenderReport = { written: [], skipped: [], conflicts: [] };

  // Collect activated program ids (unique across all stages)
  const activatedIds = new Set<string>();
  for (const stage of pipeline.stages) {
    for (const ap of stage.activatedPrograms) {
      activatedIds.add(ap.programId);
    }
  }

  const activePrograms = programs.filter((p) => activatedIds.has(p.id));

  // Build a lookup from program id → resolver's ActiveProgram (lens-composed)
  const resolvedByProgramId = new Map<string, ActiveProgram>();
  if (resolvedActivePrograms) {
    for (const rap of resolvedActivePrograms) {
      resolvedByProgramId.set(rap.id, rap);
    }
  }

  // Build a lookup from lens id → LoadedLens for path resolution
  const lensById = new Map<string, LoadedLens>();
  if (lenses) {
    for (const lens of lenses) {
      lensById.set(lens.id, lens);
    }
  }

  // Render each target in parallel (Requirement 10.3)
  await Promise.all(
    targets.map((target) =>
      renderTarget(target, activePrograms, pipeline, engagementDir, report, resolvedByProgramId, lensById),
    ),
  );

  return report;
}

/* ------------------------------------------------------------------ */
/*  Per-target rendering                                               */
/* ------------------------------------------------------------------ */

async function renderTarget(
  target: HarnessTarget,
  activePrograms: LoadedProgram[],
  pipeline: Pipeline,
  engagementDir: string,
  report: RenderReport,
  resolvedByProgramId: Map<string, ActiveProgram>,
  lensById: Map<string, LoadedLens>,
): Promise<void> {
  const adapter: HarnessAdapter = getAdapter(target);
  const ctx: RenderContext = { engagementId: pipeline.engagementId };

  // Collect every WrittenFile the adapter wants to emit, keyed by path.
  // When multiple calls target the same path (e.g. Claude's CLAUDE.md
  // collecting all steering), we concatenate in emission order.
  const buckets = new Map<string, string[]>();

  const emit = (files: WrittenFile[]): void => {
    for (const f of files) {
      const existing = buckets.get(f.path);
      if (existing) {
        existing.push(f.content);
      } else {
        buckets.set(f.path, [f.content]);
      }
    }
  };

  for (const program of activePrograms) {
    // Steering files
    for (const steeringRef of program.steering) {
      const steeringPath = path.resolve(program._dir, steeringRef);
      const loaded = loadSteeringFile(steeringPath);

      const portable: PortableSteering = {
        id: loaded.id,
        description: loaded.description,
        inclusion: loaded.inclusion,
        match: loaded.match,
        priority: loaded.priority,
        body: loaded.body,
        programId: program.id,
      };

      emit(adapter.renderSteering(portable, ctx));
    }

    // Skills
    const skillIds: string[] = [];
    for (const skillRef of program.skills) {
      const skillPath = path.resolve(program._dir, skillRef);
      const loaded = loadSkillFile(skillPath);
      skillIds.push(loaded.id);

      const trigger = loaded.trigger.kind === "command"
        ? { kind: "command" as const, phrase: loaded.trigger.phrase ?? "" }
        : { kind: "auto" as const, on: loaded.trigger.on ?? "stage-entry" };

      const portable: PortableSkill = {
        id: loaded.id,
        name: loaded.name,
        description: loaded.description,
        trigger,
        body: loaded.body,
        inputs: loaded.inputs,
        outputs: loaded.outputs,
        steeringRefs: loaded.steeringRefs,
        programId: program.id,
      };

      emit(adapter.renderSkill(portable, ctx));
    }

    // Reference files (architecture docs, deep-dives). Adapters that nest
    // references inside skill folders (Kiro) use skillIds; flat adapters
    // (Claude, Cursor, Copilot) ignore it.
    if (adapter.renderReference && program.references && program.references.length > 0) {
      for (const refPath of program.references) {
        const fullPath = path.resolve(program._dir, refPath);
        try {
          const body = readFileSync(fullPath, "utf-8");
          const filename = path.basename(refPath);

          const portable: PortableReference = {
            filename,
            body,
            programId: program.id,
            skillIds,
          };

          emit(adapter.renderReference(portable, ctx));
        } catch {
          // Skip unreadable reference files
        }
      }
    }

    // Intentionally skip playbooks (Requirement 6.7 — playbooks are human-only)

    // Lens overlay steering/skills — render any lens-contributed files that
    // are in effectiveSteering/effectiveSkills but NOT in the base program's
    // steering/skills arrays. These come from active lenses and live in the
    // lens's _dir, not the program's _dir.
    const resolved = resolvedByProgramId.get(program.id);
    if (resolved && resolved.overlayedBy.length > 0) {
      const baseSteeringSet = new Set(program.steering);
      const baseSkillsSet = new Set(program.skills);

      // Render lens-contributed steering
      for (const steeringRef of resolved.effectiveSteering) {
        if (baseSteeringSet.has(steeringRef)) continue; // already rendered above

        // Find which lens contributes this steering ref
        const lensPath = resolveLensArtifactPath(steeringRef, resolved.overlayedBy, lensById);
        if (!lensPath) continue;

        try {
          const loaded = loadSteeringFile(lensPath);
          const portable: PortableSteering = {
            id: loaded.id,
            description: loaded.description,
            inclusion: loaded.inclusion,
            match: loaded.match,
            priority: loaded.priority,
            body: loaded.body,
            programId: program.id,
          };
          emit(adapter.renderSteering(portable, ctx));
        } catch {
          // Skip unreadable lens steering files
        }
      }

      // Render lens-contributed skills
      for (const skillRef of resolved.effectiveSkills) {
        if (baseSkillsSet.has(skillRef)) continue; // already rendered above

        const lensPath = resolveLensArtifactPath(skillRef, resolved.overlayedBy, lensById);
        if (!lensPath) continue;

        try {
          const loaded = loadSkillFile(lensPath);
          const trigger = loaded.trigger.kind === "command"
            ? { kind: "command" as const, phrase: loaded.trigger.phrase ?? "" }
            : { kind: "auto" as const, on: loaded.trigger.on ?? "stage-entry" };

          const portable: PortableSkill = {
            id: loaded.id,
            name: loaded.name,
            description: loaded.description,
            trigger,
            body: loaded.body,
            inputs: loaded.inputs,
            outputs: loaded.outputs,
            steeringRefs: loaded.steeringRefs,
            programId: program.id,
          };
          emit(adapter.renderSkill(portable, ctx));
        } catch {
          // Skip unreadable lens skill files
        }
      }
    }
  }

  // Engagement-level spec
  const spec: EngagementSpec = {
    engagementId: pipeline.engagementId,
    currentStage:
      pipeline.stages.find((s) => s.status === "active")?.stage ?? "intent",
    activatedPrograms: [...new Set(
      pipeline.stages.flatMap((s) => s.activatedPrograms.map((ap) => ap.programId)),
    )],
    summary: `Engagement ${pipeline.engagementId} — pipeline version ${pipeline.version}`,
  };

  emit(adapter.renderSpec(spec, ctx));

  // Now commit one write per path with the concatenated content.
  for (const [relPath, chunks] of buckets) {
    const content = chunks.join("\n\n");
    writeManaged({ path: relPath, content }, engagementDir, report);
  }
}

/* ------------------------------------------------------------------ */
/*  Lens artifact path resolution                                      */
/* ------------------------------------------------------------------ */

/**
 * Given a steering or skill ref from effectiveSteering/effectiveSkills that
 * was contributed by a lens overlay, resolve its absolute file path by
 * searching across the contributing lenses.
 *
 * Lens overlays declare refs like `steering/hipaa-phi-handling.md` which
 * live relative to the lens's _dir (e.g. `lenses/healthcare-lens/`).
 *
 * Returns the first existing path found, or undefined if none match.
 */
function resolveLensArtifactPath(
  ref: string,
  overlayedBy: readonly string[],
  lensById: Map<string, LoadedLens>,
): string | undefined {
  for (const lensId of overlayedBy) {
    const lens = lensById.get(lensId);
    if (!lens) continue;

    const candidate = path.resolve(lens._dir, ref);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}
