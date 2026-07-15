/**
 * MCP tool handlers — pure business logic behind the MCP server.
 *
 * Each handler is a plain async function so tests can drive it directly
 * without booting the SDK transport. All handlers share a single
 * `HandlerContext` carrying the workspace root, the loaded catalog, and
 * the session-scoped map of loaded intentions. The context is built once
 * by `server.ts` at startup and passed to each handler.
 *
 * Intentions are identified by an ephemeral `intentionId` string (UUID
 * v4 via `node:crypto.randomUUID()`). The server holds them in-memory
 * for the lifetime of the session — no persistence, no disk writes.
 */

import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { loadAll, type LoadedProgram } from "../loader/index.js";
import { loadLenses } from "../loader/lenses.js";
import { loadSkillFile, loadSteeringFile } from "../loader/artifacts.js";
import { validateIntention } from "../intention/loader.js";
import { applyIntentionPatch, type IntentionPatch } from "../intention/patch.js";
import { resolve as resolveGraph } from "../resolver/index.js";
import type { LoadedLens, ResolvedGraph } from "../resolver/types.js";
import type { Intention } from "../intention/types.js";
import { renderAll } from "../renderer/orchestrator.js";
import type { HarnessTarget } from "../renderer/index.js";
import { plan as legacyPlan } from "../planner/index.js";
import { loadPipelineDef } from "../planner/pipelineDef.js";
import { selectAimMode } from "../aim/select.js";
import type { AimAssessmentResult, AimMode, AimRecommendation } from "../aim/types.js";
import { initState, type EngagementState } from "../state/index.js";
import { validateEngagementDir, isPathContainedIn } from "../security/path-validation.js";
import { checkIntentionLimit, checkIntentionPayloadSize } from "../security/session-limits.js";
import { auditLog } from "../security/audit.js";

/**
 * Shared per-session context threaded through every handler.
 */
export interface HandlerContext {
  /** Absolute path to the fdep-kit workspace root. */
  readonly workspaceRoot: string;
  /** Loaded program catalog. */
  readonly programs: readonly LoadedProgram[];
  /** Loaded lens catalog. */
  readonly lenses: readonly LoadedLens[];
  /** Session-scoped intention handles. */
  readonly intentions: Map<string, Intention>;
}

/**
 * Build a handler context from a workspace root by loading programs and
 * lenses from disk. Used by `server.ts` and by tests.
 */
export function buildHandlerContext(workspaceRoot: string): HandlerContext {
  const schemasDir = join(workspaceRoot, "schemas");
  const programsDir = join(workspaceRoot, "programs");
  const lensesDir = join(workspaceRoot, "lenses");

  const { programs } = loadAll(programsDir, schemasDir);
  const lensResult = existsSync(lensesDir)
    ? loadLenses(lensesDir, schemasDir, programs)
    : { lenses: [] as LoadedLens[], diagnostics: [] };

  return {
    workspaceRoot,
    programs,
    lenses: lensResult.lenses,
    intentions: new Map(),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_list_programs                                            */
/* ------------------------------------------------------------------ */

export async function handleListPrograms(ctx: HandlerContext) {
  return {
    programs: ctx.programs.map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      tags: p.tags ?? [],
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_list_lenses                                              */
/* ------------------------------------------------------------------ */

export async function handleListLenses(ctx: HandlerContext) {
  return {
    lenses: ctx.lenses.map((l) => ({
      id: l.id,
      industry: l.industry,
      tags: l.tags ?? [],
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_load_intention                                           */
/* ------------------------------------------------------------------ */

export async function handleLoadIntention(
  ctx: HandlerContext,
  input: unknown,
): Promise<{ intentionId: string; diagnostics: [] }> {
  const startTime = Date.now();
  const schemasDir = join(ctx.workspaceRoot, "schemas");

  // T14 mitigation: enforce session-scoped intention limits
  checkIntentionLimit(ctx.intentions.size);
  checkIntentionPayloadSize(input);

  // Expand aimTierEstimate shorthand → aim: { business, governance, security, overall }
  // This lets operators pass a single tier number instead of per-perspective scores.
  if (input && typeof input === "object" && "aimTierEstimate" in input) {
    const raw = input as Record<string, unknown>;
    const tier = raw.aimTierEstimate as number;
    if (typeof tier === "number" && tier >= 1 && tier <= 5) {
      if (!raw.aim) {
        raw.aim = { business: tier, governance: tier, security: tier, overall: tier };
      }
      delete raw.aimTierEstimate;
    }
  }

  const intention = validateIntention(input, schemasDir);
  const id = randomUUID();
  ctx.intentions.set(id, intention);

  auditLog({
    ts: new Date().toISOString(),
    tool: "fde_load_intention",
    outcome: "success",
    durationMs: Date.now() - startTime,
    params: { customer: intention.customer, goals: intention.goals },
  });

  return { intentionId: id, diagnostics: [] };
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_resolve                                                  */
/* ------------------------------------------------------------------ */

export async function handleResolve(
  ctx: HandlerContext,
  input: { intentionId: string },
): Promise<ResolvedGraph> {
  const intention = ctx.intentions.get(input.intentionId);
  if (!intention) {
    throw new Error(`Unknown intentionId '${input.intentionId}'`);
  }
  return resolveGraph({
    intention,
    programs: ctx.programs,
    lenses: ctx.lenses,
  });
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_render                                                   */
/* ------------------------------------------------------------------ */

export interface RenderInput {
  intentionId: string;
  engagementDir: string;
  targets: HarnessTarget[];
}

export async function handleRender(ctx: HandlerContext, input: RenderInput) {
  const startTime = Date.now();
  const intention = ctx.intentions.get(input.intentionId);
  if (!intention) throw new Error(`Unknown intentionId '${input.intentionId}'`);

  // T3/T8 mitigation: validate engagementDir against path traversal attacks
  const absDir = validateEngagementDir(input.engagementDir);
  mkdirSync(absDir, { recursive: true });

  // Persist intention and resolution to disk for session resume (gap fix).
  const stateDir = join(absDir, "state");
  mkdirSync(stateDir, { recursive: true });
  const intentionForState = JSON.stringify(
    { intentionId: input.intentionId, intention },
    null,
    2,
  );
  writeFileSync(join(stateDir, "intention.json"), intentionForState, "utf-8");

  const graph = resolveGraph({
    intention,
    programs: ctx.programs,
    lenses: ctx.lenses,
  });

  // Bridge resolver output to the legacy renderer by synthesising a
  // single-stage pipeline whose activatedPrograms come from the graph.
  const pipelineDef = loadPipelineDef(ctx.workspaceRoot, "default");
  const pipeline = legacyPlan({
    programs: ctx.programs as LoadedProgram[],
    state: {
      customer: intention.customer,
      intent: [...intention.goals],
      aimTier: intention.aim?.overall,
      intake: intention as unknown as Record<string, unknown>,
      currentStage: "intent",
    },
    pipelineDef,
  });

  // Filter pipeline stages to only include programs present in the graph
  // so renderAll writes artifacts for the resolver-selected set.
  const activeIds = new Set(graph.activePrograms.map((p) => p.id));
  const scopedPipeline = {
    ...pipeline,
    stages: pipeline.stages.map((s) => ({
      ...s,
      activatedPrograms: s.activatedPrograms.filter((ap) => activeIds.has(ap.programId)),
    })),
  };

  const report = await renderAll({
    pipeline: scopedPipeline,
    programs: ctx.programs as LoadedProgram[],
    targets: input.targets,
    engagementDir: absDir,
    resolvedActivePrograms: graph.activePrograms,
    lenses: ctx.lenses,
  });

  // Persist resolved graph for session resume.
  writeFileSync(join(stateDir, "resolution.json"), JSON.stringify(graph, null, 2), "utf-8");

  // Bootstrap state/current.yaml so downstream skills can read/write it.
  // Only create if it doesn't already exist (avoid clobbering mid-engagement state).
  const currentYamlPath = join(stateDir, "current.yaml");
  if (!existsSync(currentYamlPath)) {
    const now = new Date().toISOString();
    const engagementState: EngagementState = {
      customer: intention.customer,
      intent: [...intention.goals],
      intake: intention as unknown as Record<string, unknown>,
      aimTier: intention.aim?.overall as (1 | 2 | 3 | 4 | 5 | undefined),
      currentStage: "intent",
      decisions: [
        {
          ts: now,
          actor: "harness",
          kind: "engagement-created",
          detail: {
            customer: intention.customer,
            goals: intention.goals,
            industry: intention.industry,
            regulated: (intention as unknown as Record<string, unknown>).regulated ?? false,
          },
        },
      ],
      startedAt: now,
      updatedAt: now,
    };
    initState(absDir, engagementState);
  }

  // Generate README.md for the engagement
  const activeProgs = graph.activePrograms.map((p: { id: string; score: number }) => p.id);
  const readmeContent = generateEngagementReadme(intention, activeProgs);
  writeFileSync(join(absDir, "README.md"), readmeContent, "utf-8");

  // Generate .fde-manifest.json — local reference index for agents.
  // Lists all available references by category so the agent knows what to
  // read before generating code/design, without needing an MCP call.
  const manifest = generateAineManifest(ctx.programs as LoadedProgram[], activeIds, input.targets);
  writeFileSync(join(absDir, ".fde-manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  auditLog({
    ts: new Date().toISOString(),
    tool: "fde_render",
    outcome: "success",
    durationMs: Date.now() - startTime,
    params: {
      intentionId: input.intentionId,
      engagementDir: absDir,
      targets: input.targets,
      filesWritten: report.written.length,
      conflicts: report.conflicts.length,
    },
  });

  return { report, graph };
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_patch_intention                                          */
/* ------------------------------------------------------------------ */

export async function handlePatchIntention(
  ctx: HandlerContext,
  input: { intentionId: string; patch: IntentionPatch; mode?: "merge" | "replace" },
): Promise<{ intention: Intention }> {
  const base = ctx.intentions.get(input.intentionId);
  if (!base) throw new Error(`Unknown intentionId '${input.intentionId}'`);
  const schemasDir = join(ctx.workspaceRoot, "schemas");
  const next = applyIntentionPatch(base, input.patch, input.mode ?? "merge", schemasDir);
  ctx.intentions.set(input.intentionId, next);
  return { intention: next };
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_get_skill                                                */
/* ------------------------------------------------------------------ */

export async function handleGetSkill(
  ctx: HandlerContext,
  input: { skillId: string; file?: string },
) {
  // Search program skills
  for (const program of ctx.programs) {
    for (const ref of program.skills) {
      const skillPath = join(program._dir, ref);
      try {
        const skill = loadSkillFile(skillPath);
        if (skill.id === input.skillId) {
          // If a file parameter is provided, serve that file. The file path
          // may be relative to either the skill's own directory (e.g. a skill
          // that bundles `assets/...`) or the program directory (e.g. shared
          // `references/...`). Try both bases and use the first that resolves
          // to an existing file inside the program tree.
          if (input.file) {
            const programRoot = resolve(program._dir);
            const skillDir = dirname(skillPath);
            const candidates = [
              resolve(skillDir, input.file),
              resolve(programRoot, input.file),
            ];

            let resolved: string | undefined;
            for (const candidate of candidates) {
              // T5 mitigation: path-traversal guard using robust containment check.
              // Prevents symlink and case-sensitivity bypass of simple startsWith().
              if (!isPathContainedIn(candidate, programRoot)) continue;
              if (existsSync(candidate) && statSync(candidate).isFile()) {
                resolved = candidate;
                break;
              }
            }

            if (!resolved) {
              throw new Error(
                `File '${input.file}' not found in program '${program.id}'.` +
                  ` Looked under the skill directory and the program root.`,
              );
            }

            const content = readFileSync(resolved, "utf-8");
            return { file: input.file, programId: program.id, content };
          }
          return { skill };
        }
      } catch (e) {
        // If the error is from our file-not-found logic above, re-throw it
        if (e instanceof Error && e.message.includes("not found in program")) throw e;
        // otherwise continue searching
      }
    }
  }

  // Search lens skills (overlay-contributed skills)
  for (const lens of ctx.lenses) {
    for (const overlay of lens.overlays) {
      for (const ref of overlay.addSkills ?? []) {
        const skillPath = join(lens._dir, ref);
        try {
          const skill = loadSkillFile(skillPath);
          if (skill.id === input.skillId) {
            if (input.file) {
              const lensRoot = resolve(lens._dir);
              const skillDir = dirname(skillPath);
              const candidates = [
                resolve(skillDir, input.file),
                resolve(lensRoot, input.file),
              ];

              let resolved: string | undefined;
              for (const candidate of candidates) {
                // T5 mitigation: path-traversal guard for lens files.
                if (!isPathContainedIn(candidate, lensRoot)) continue;
                if (existsSync(candidate) && statSync(candidate).isFile()) {
                  resolved = candidate;
                  break;
                }
              }

              if (!resolved) {
                throw new Error(
                  `File '${input.file}' not found in lens '${lens.id}'.` +
                    ` Looked under the skill directory and the lens root.`,
                );
              }

              const content = readFileSync(resolved, "utf-8");
              return { file: input.file, lensId: lens.id, content };
            }
            return { skill };
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes("not found in lens")) throw e;
          // otherwise continue searching
        }
      }
    }
  }

  throw new Error(`Unknown skillId '${input.skillId}'`);
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_get_steering                                             */
/* ------------------------------------------------------------------ */

export async function handleGetSteering(
  ctx: HandlerContext,
  input: { steeringId: string },
) {
  // Search program steering files
  for (const program of ctx.programs) {
    for (const ref of program.steering) {
      const filePath = join(program._dir, ref);
      try {
        const steering = loadSteeringFile(filePath);
        if (steering.id === input.steeringId) {
          return { steering };
        }
      } catch {
        // continue
      }
    }
  }

  // Search lens steering files (overlay-contributed steering)
  for (const lens of ctx.lenses) {
    for (const overlay of lens.overlays) {
      for (const ref of overlay.addSteering ?? []) {
        const filePath = join(lens._dir, ref);
        try {
          const steering = loadSteeringFile(filePath);
          if (steering.id === input.steeringId) {
            return { steering };
          }
        } catch {
          // continue
        }
      }
    }
  }

  throw new Error(`Unknown steeringId '${input.steeringId}'`);
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_aim_assess                                               */
/* ------------------------------------------------------------------ */

export interface AimAssessInput {
  intentionId: string;
  mode?: AimMode;
  responses?: Record<string, Record<string, unknown>>;
  forceMode?: AimMode;
}

export async function handleAimAssess(
  ctx: HandlerContext,
  input: AimAssessInput,
): Promise<{
  mode: AimMode;
  assessment: AimAssessmentResult;
  intention: Intention;
  graph: ResolvedGraph;
}> {
  const base = ctx.intentions.get(input.intentionId);
  if (!base) throw new Error(`Unknown intentionId '${input.intentionId}'`);

  const mode =
    input.mode ??
    selectAimMode(base, {
      mcpServerAvailable: true,
      ...(input.forceMode !== undefined ? { forceMode: input.forceMode } : {}),
    });

  // Score the responses. When none are supplied we treat the assessment
  // as an invitation for the agent to drive the interview (mode=runtime)
  // and return an empty patch.
  const assessment = scoreResponses(input.responses ?? {});

  // Patch the intention with the score subtree and re-resolve.
  const schemasDir = join(ctx.workspaceRoot, "schemas");
  const patched =
    Object.keys(assessment.aim).length > 0
      ? applyIntentionPatch(base, { aim: assessment.aim } as IntentionPatch, "merge", schemasDir)
      : base;
  ctx.intentions.set(input.intentionId, patched);

  const graph = resolveGraph({
    intention: patched,
    programs: ctx.programs,
    lenses: ctx.lenses,
  });

  return { mode, assessment, intention: patched, graph };
}

/**
 * Score a response map using a minimalist rubric: each perspective's
 * responses are averaged (when numeric), clamped to 1..5, and rounded.
 * Non-numeric responses are ignored. This is the "best available" scorer
 * for the MVP; it produces deterministic output without requiring a live
 * LLM call.
 */
function scoreResponses(
  responses: Record<string, Record<string, unknown>>,
): AimAssessmentResult {
  const perspectives = [
    "business",
    "people",
    "governance",
    "platform",
    "security",
    "operations",
  ] as const;

  const aim: Record<string, 1 | 2 | 3 | 4 | 5> = {};
  const evidence: Array<{ questionId: string; excerpt: string; source?: string }> = [];

  for (const p of perspectives) {
    const answers = responses[p];
    if (!answers) continue;

    const tiers: number[] = [];
    for (const [q, value] of Object.entries(answers)) {
      if (typeof value === "number" && value >= 1 && value <= 5) {
        tiers.push(value);
      } else if (typeof value === "string") {
        evidence.push({ questionId: `${p}.${q}`, excerpt: value.slice(0, 200) });
      }
    }
    if (tiers.length > 0) {
      const avg = tiers.reduce((s, t) => s + t, 0) / tiers.length;
      aim[p] = Math.max(1, Math.min(5, Math.round(avg))) as 1 | 2 | 3 | 4 | 5;
    }
  }

  if (Object.keys(aim).length > 0) {
    const overall = Math.min(...Object.values(aim));
    aim.overall = overall as 1 | 2 | 3 | 4 | 5;
  }

  return {
    aim,
    evidence,
    recommendations: deriveRecommendations(aim),
  };
}

/* ------------------------------------------------------------------ */
/*  AIM recommendation derivation                                      */
/* ------------------------------------------------------------------ */

/**
 * Canonical, deterministic uplift guidance per AIM perspective. The text
 * is intentionally stable (no LLM, no timestamps) so captures and tests
 * are reproducible. Keyed by perspective; `overall` is excluded since it
 * is a derived minimum, not a directly-actionable perspective.
 */
const PERSPECTIVE_GUIDANCE: Record<string, { id: string; reason: string }> = {
  governance: {
    id: "governance-uplift",
    reason:
      "Governance is the weakest perspective. Stand up an AI governance baseline: model risk policy, an approval workflow, and a documented review cadence before scaling generative workloads.",
  },
  security: {
    id: "security-uplift",
    reason:
      "Security maturity is low. Add guardrails, secrets hygiene, data-classification controls, and red-team review to the AI delivery path.",
  },
  people: {
    id: "people-uplift",
    reason:
      "People readiness lags. Run enablement (School of Responsible AI / role-based training) so teams can operate AI systems safely.",
  },
  business: {
    id: "business-uplift",
    reason:
      "Business alignment is early. Anchor initiatives to measurable KPIs and a working-backwards narrative before broad rollout.",
  },
  platform: {
    id: "platform-uplift",
    reason:
      "Platform foundations need investment. Establish a reusable AI platform pattern (shared services, evaluation harness, deployment guardrails).",
  },
  operations: {
    id: "operations-uplift",
    reason:
      "Operational maturity is low. Define incident response, monitoring, and an AI operating manual for production systems.",
  },
};

/**
 * Derive prioritised recommendations from scored tiers. The lowest tiers
 * become the highest-priority actions (priority 1 = most urgent). Pure and
 * deterministic: ordering is by ascending tier, then by a fixed
 * perspective order for stable tie-breaking.
 */
function deriveRecommendations(
  aim: Record<string, 1 | 2 | 3 | 4 | 5>,
): AimRecommendation[] {
  const PERSPECTIVE_ORDER = [
    "business",
    "people",
    "governance",
    "platform",
    "security",
    "operations",
  ];

  const scored = Object.entries(aim)
    .filter(([k]) => k !== "overall" && PERSPECTIVE_GUIDANCE[k] !== undefined)
    .sort((a, b) => {
      const byTier = a[1] - b[1];
      if (byTier !== 0) return byTier;
      return PERSPECTIVE_ORDER.indexOf(a[0]) - PERSPECTIVE_ORDER.indexOf(b[0]);
    });

  // Only surface perspectives at or below tier 3 (the "needs attention"
  // band); a tier-1/2 gap is urgent, tier-3 is worth noting.
  return scored
    .filter(([, tier]) => tier <= 3)
    .map(([perspective, tier], idx) => {
      const guidance = PERSPECTIVE_GUIDANCE[perspective]!;
      return {
        id: guidance.id,
        target: perspective,
        tier,
        priority: idx + 1,
        reason: guidance.reason,
      };
    });
}


/* ------------------------------------------------------------------ */
/*  Tool: fde_get_engagement_context                                   */
/* ------------------------------------------------------------------ */

export interface GetEngagementContextInput {
  engagementDir: string;
}

export async function handleGetEngagementContext(
  ctx: HandlerContext,
  input: GetEngagementContextInput,
): Promise<{
  intentionId: string | null;
  intention: Intention | null;
  resolution: ResolvedGraph | null;
  aidlcState: Record<string, unknown> | null;
  currentStage: string | null;
  activePrograms: string[];
  engagementDir: string;
}> {
  // T3/T8 mitigation: validate engagementDir against path traversal attacks
  const absDir = validateEngagementDir(input.engagementDir);

  // Try to load intention from state/intention.json
  let intentionId: string | null = null;
  let intention: Intention | null = null;
  const intentionPath = join(absDir, "state", "intention.json");
  if (existsSync(intentionPath)) {
    try {
      const raw = JSON.parse(readFileSync(intentionPath, "utf-8"));
      if (raw.intention) {
        intention = raw.intention as Intention;
        // Rehydrate into session so subsequent calls work
        const id = raw.intentionId ?? randomUUID();
        ctx.intentions.set(id, intention);
        intentionId = id;
      }
    } catch {
      // ignore parse errors
    }
  }

  // Try to load resolution from state/resolution.json
  let resolution: ResolvedGraph | null = null;
  const resolutionPath = join(absDir, "state", "resolution.json");
  if (existsSync(resolutionPath)) {
    try {
      resolution = JSON.parse(readFileSync(resolutionPath, "utf-8")) as ResolvedGraph;
    } catch {
      // ignore
    }
  }

  // Try to load aidlc-state if it exists
  let aidlcState: Record<string, unknown> | null = null;
  const aidlcStatePath = join(absDir, "aidlc-docs", "aidlc-state.md");
  if (existsSync(aidlcStatePath)) {
    try {
      aidlcState = { content: readFileSync(aidlcStatePath, "utf-8") };
    } catch {
      // ignore
    }
  }

  // Try to load current stage from state/current.yaml or engagement spec
  let currentStage: string | null = null;
  const specDir = join(absDir, ".kiro", "specs");
  if (existsSync(specDir)) {
    try {
      const specFolders = readdirSync(specDir);
      for (const folder of specFolders) {
        const engFile = join(specDir, folder, "engagement.md");
        if (existsSync(engFile)) {
          const content = readFileSync(engFile, "utf-8");
          const stageMatch = content.match(/currentStage:\s*(\S+)/);
          if (stageMatch) currentStage = stageMatch[1];
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  // Extract active programs from resolution
  const activePrograms: string[] = resolution?.activePrograms?.map(
    (p: { id: string }) => p.id,
  ) ?? [];

  return {
    intentionId,
    intention,
    resolution,
    aidlcState,
    currentStage,
    activePrograms,
    engagementDir: absDir,
  };
}

/* ------------------------------------------------------------------ */
/*  Utility: generate engagement README                                */
/* ------------------------------------------------------------------ */

function generateEngagementReadme(
  intention: Intention,
  activePrograms: string[],
): string {
  const customer = intention.customer;
  const goals = intention.goals.join(", ");
  const industry = intention.industry ?? "other";
  const notes = intention.notes ?? "";
  const hasAidlc = activePrograms.includes("aws-aidlc");
  const hasAppBuilder = activePrograms.includes("ai-native-app-builder");

  const programList = activePrograms.map((p) => `- \`${p}\``).join("\n");

  const skillCommands = hasAidlc
    ? `| Command | What it does |
|---------|-------------|
| \`/aidlc-install\` | Install AWS AI-DLC rules into this workspace |
| \`/aidlc-inception\` | Start AI-DLC Inception (requirements capture) |
| \`/aidlc-sync\` | Sync AI-DLC requirements to FDE intake + re-resolve programs |
| \`/aidlc-construction\` | Advance to AI-DLC Construction (design + code) |
| \`/aidlc-operations\` | Complete AI-DLC Operations (deploy, monitor, resilience) |
${hasAppBuilder ? `| \`/build-app\` | Build an AI-native app on AWS (multi-layer architecture) |\n| \`/scaffold-app\` | Generate project structure |\n| \`/deploy-agent\` | Deploy agent to Amazon Bedrock AgentCore |` : ""}`
    : `| Command | What it does |
|---------|-------------|
${hasAppBuilder ? `| \`/build-app\` | Build an AI-native app on AWS (multi-layer architecture) |\n| \`/scaffold-app\` | Generate project structure |\n| \`/deploy-agent\` | Deploy agent to Amazon Bedrock AgentCore |` : ""}`;

  const lifecycleFlow = hasAidlc
    ? `## Lifecycle Flow

This engagement uses **AWS AI-DLC** as the orchestrator. Follow this sequence:

\`\`\`
Step 1: /aidlc-install        Install AI-DLC rules
Step 2: /aidlc-inception      Capture requirements (AI-DLC asks structured questions)
Step 3: /aidlc-sync           Sync to FDE â€” programs re-resolve based on requirements
Step 4: /aidlc-construction   Design + code (AI-DLC per-unit loop with FDE references)
Step 5: /aidlc-operations     Deploy + operate (routed to FDE programs)
\`\`\`

At each transition, FDE automatically re-resolves which programs are active.
New steering and skills may appear in \`.kiro/\` as the engagement progresses.`
    : `## Getting Started

Run \`/build-app\` to begin the application build process.`;

  const restartGuide = `## Resuming After Restart

If you restart your session, the engagement state is persisted. Call:

\`\`\`
fde_get_engagement_context({ engagementDir: "<this directory>" })
\`\`\`

This reloads the intention, active programs, and current stage into the MCP session.`;

  const steeringInfo = `## Steering (Auto-loaded Rules)

The \`.kiro/steering/\` directory contains rules that are **automatically loaded** by Kiro.
These guide the agent's behavior throughout the engagement:

- **Priority 95**: No simulated data in code generation
- **Priority 88**: appLevel scoping (PoC / MVP / Production)
- **Priority 87**: AI-DLC â†” FDE bridge (who owns what per phase)
- **Priority 86**: FDE integration points (when to call MCP tools)
- **Priority 85**: Program overview and context

Do not delete or modify files with \`FDE_MANAGED\` headers â€” they are regenerated on re-render.`;

  const stateInfo = `## State

| File | Purpose |
|------|---------|
| \`state/intention.json\` | Customer intention (goals, industry, notes) |
| \`state/resolution.json\` | Active programs and activation traces |
| \`.kiro/specs/${customer}/engagement.md\` | Engagement tracker (stage, programs) |
| \`aidlc-docs/\` | AI-DLC artifacts (requirements, design, code, audit) |
| \`artifacts/\` | FDE program artifacts |`;

  return `# ${customer}

${notes}

**Industry:** ${industry}
**Goals:** ${goals}
**Active Programs:** ${activePrograms.length}

## Active Programs

${programList}

${lifecycleFlow}

## Available Commands

${skillCommands}

${restartGuide}

${steeringInfo}

${stateInfo}

## Key Rules

1. **Never fabricate data** â€” if a requirement says "real upload", implement real upload
2. **Consult references before code** â€” layer references contain tested patterns
3. **User confirmation required** â€” AI-DLC gates require explicit typed approval
4. **Verbatim capture** â€” audit log records exact user input, never paraphrased
5. **Two artifact trees** â€” AI-DLC writes to \`aidlc-docs/\`, FDE writes to \`artifacts/\`

---
*Generated by FDE MCP Server v0.1.0*
`;
}

/* ------------------------------------------------------------------ */
/*  Manifest generator                                                  */
/* ------------------------------------------------------------------ */

interface ManifestReference {
  file: string;
  skillId: string;
  category: string;
  readBefore: string;
}

function generateAineManifest(
  programs: LoadedProgram[],
  activeIds: Set<string>,
  targets: HarnessTarget[],
): Record<string, unknown> {
  const references: ManifestReference[] = [];

  for (const program of programs) {
    if (!activeIds.has(program.id)) continue;

    // Scan for reference files in the program directory
    const refsDir = join(program._dir, "references");
    if (existsSync(refsDir)) {
      let entries: string[];
      try {
        entries = readdirSync(refsDir).filter((f) => f.endsWith(".md")).sort();
      } catch {
        entries = [];
      }
      for (const entry of entries) {
        const category = categorizeReference(entry);
        const readBefore = mapReadBefore(category);
        // Find which skill owns references for this program
        const skillId = program.skills.length > 0
          ? program.skills[0]!.replace(/^skills\//, "").replace(/\.md$/, "")
          : program.id;
        references.push({
          file: `references/${entry}`,
          skillId,
          category,
          readBefore,
        });
      }
    }
  }

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    description: "FDE reference manifest. Read this file at session start to know which references to consult before generating code or design artifacts.",
    usage: "Call fde_get_skill(skillId=<skillId>, file=<file>) to read each reference before writing code for that category.",
    mandatory_before_write: true,
    targets,
    references,
    categories: {
      infrastructure: "Read before writing CDK stacks, VPC config, IAM roles",
      frontend: "Read before writing React/UI code, chat components, dashboards",
      "ai-pipeline": "Read before writing agent code, workflows, model config",
      governance: "Read before adding guardrails, PII filters, audit trails",
      observability: "Read before adding monitoring, alarms, evaluations",
      resilience: "Read before adding error handling, circuit breakers, fallbacks",
      testing: "Read before writing tests, evaluation suites, seed data",
      deployment: "Read before deploying to AgentCore or configuring CI/CD",
      domain: "Read before implementing domain-specific business logic",
    },
  };
}

function categorizeReference(filename: string): string {
  if (filename.includes("infra") || filename.includes("foundation")) return "infrastructure";
  if (filename.includes("layer-5") || filename.includes("ui-") || filename.includes("app-creation")) return "frontend";
  if (filename.includes("layer-4") || filename.includes("layer-6") || filename.includes("agent") || filename.includes("model")) return "ai-pipeline";
  if (filename.includes("governance") || filename.includes("security")) return "governance";
  if (filename.includes("observability") || filename.includes("evaluation")) return "observability";
  if (filename.includes("resilience") || filename.includes("operations")) return "resilience";
  if (filename.includes("testing") || filename.includes("quality")) return "testing";
  if (filename.includes("deploy") || filename.includes("agentcore")) return "deployment";
  if (filename.includes("industry") || filename.includes("insurance") || filename.includes("claims")) return "domain";
  return "general";
}

function mapReadBefore(category: string): string {
  const map: Record<string, string> = {
    infrastructure: "writing CDK/IaC code",
    frontend: "writing UI/React code",
    "ai-pipeline": "writing agent/model/workflow code",
    governance: "adding guardrails or safety features",
    observability: "adding monitoring or evaluation",
    resilience: "adding error handling or fallbacks",
    testing: "writing tests or evaluations",
    deployment: "deploying or configuring CI/CD",
    domain: "implementing business logic",
    general: "any code generation",
  };
  return map[category] ?? "code generation";
}

import { contentHash, buildHeader } from "../renderer/managed.js";

/* ------------------------------------------------------------------ */
/*  Tool: fde_init_workspace                                           */
/* ------------------------------------------------------------------ */

export interface InitWorkspaceInput {
  workspaceDir: string;
}

export async function handleInitWorkspace(
  ctx: HandlerContext,
  input: InitWorkspaceInput,
): Promise<{ installed: string[]; workspaceDir: string }> {
  // T3/T8 mitigation: validate workspaceDir against path traversal attacks
  const absDir = validateEngagementDir(input.workspaceDir);
  const installed: string[] = [];

  // Create .kiro directories
  const steeringDir = join(absDir, ".kiro", "steering");
  const skillsDir = join(absDir, ".kiro", "skills");
  mkdirSync(steeringDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });

  // Helper: write a file with FDE_MANAGED header so fde_render can overwrite idempotently.
  // Uses the same frontmatter-aware placement as writeManaged — the marker goes
  // after the closing --- of frontmatter so Kiro can still detect frontmatter on line 1.
  function writeManagedFile(destPath: string, body: string): void {
    const hash = contentHash(body);
    const header = buildHeader(hash);

    if (body.startsWith("---\n") || body.startsWith("---\r\n")) {
      // Place marker after closing --- of frontmatter
      const lines = body.split("\n");
      let closingIdx = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]!.trimEnd() === "---") {
          closingIdx = i;
          break;
        }
      }
      if (closingIdx > 0) {
        const before = lines.slice(0, closingIdx + 1).join("\n");
        const after = lines.slice(closingIdx + 1).join("\n");
        writeFileSync(destPath, `${before}\n${header}\n${after}`, "utf-8");
        return;
      }
    }

    writeFileSync(destPath, `${header}\n${body}`, "utf-8");
  }

  // Copy fde-orchestration steering (the init guide)
  const orchestrationProgram = ctx.programs.find((p) => p.id === "fde-orchestration");
  if (orchestrationProgram) {
    // Install orchestration steering files
    for (const ref of orchestrationProgram.steering) {
      const srcPath = join(orchestrationProgram._dir, ref);
      try {
        const loaded = loadSteeringFile(srcPath);
        const destFilename = `fde-orchestration-${loaded.id}.md`;
        const destPath = join(steeringDir, destFilename);

        const frontmatterFields: string[] = [
          `id: ${loaded.id}`,
        ];
        if (loaded.description !== undefined) {
          const safeDescription = loaded.description.replace(/"/g, '\\"');
          frontmatterFields.push(`description: "${safeDescription}"`);
        }
        frontmatterFields.push(`inclusion: ${loaded.inclusion}`);
        if (loaded.match !== undefined) {
          frontmatterFields.push(`match: "${loaded.match}"`);
        }
        frontmatterFields.push(`priority: ${loaded.priority}`);

        const content = [
          "---",
          ...frontmatterFields,
          "---",
          "",
          loaded.body,
        ].join("\n");

        writeManagedFile(destPath, content);
        installed.push(destPath);
      } catch {
        // skip if file can't be loaded
      }
    }

    // Install orchestration skills (as folders with SKILL.md)
    for (const ref of orchestrationProgram.skills) {
      const srcPath = join(orchestrationProgram._dir, ref);
      try {
        const loaded = loadSkillFile(srcPath);
        const folderName = `fde-orchestration-${loaded.id}`;
        const destDir = join(skillsDir, folderName);
        mkdirSync(destDir, { recursive: true });
        const destPath = join(destDir, "SKILL.md");

        const safeDescription = (loaded.description ?? "").replace(/"/g, '\\"');
        const frontmatterFields: string[] = [
          `id: ${loaded.id}`,
          `name: "${loaded.name} (fde-orchestration)"`,
          `description: "${safeDescription}"`,
        ];

        if (loaded.trigger?.kind === "command") {
          frontmatterFields.push(`trigger: command`);
          frontmatterFields.push(`phrase: "${loaded.trigger.phrase ?? ""}"`);
        } else {
          frontmatterFields.push(`trigger: auto`);
          frontmatterFields.push(`on: ${loaded.trigger?.on ?? "stage-entry"}`);
        }

        const content = [
          "---",
          ...frontmatterFields,
          "---",
          "",
          loaded.body,
        ].join("\n");

        writeManagedFile(destPath, content);
        installed.push(destPath);
      } catch {
        // skip
      }
    }
  }

  // Also copy the top-level ace-init steering if it exists in the kit's .kiro
  const kitSteering = join(ctx.workspaceRoot, ".kiro", "steering", "ace-init.md");
  if (existsSync(kitSteering)) {
    const destPath = join(steeringDir, "ace-init.md");
    writeFileSync(destPath, readFileSync(kitSteering, "utf-8"), "utf-8");
    installed.push(destPath);
  }

  return { installed, workspaceDir: absDir };
}

/* ------------------------------------------------------------------ */
/*  Tool: fde_install_assets                                           */
/* ------------------------------------------------------------------ */

export interface InstallAssetsInput {
  programId: string;
  engagementDir: string;
  target: string;
}

/**
 * Platform-specific asset placement rules for AI-DLC rules.
 * Maps target platform → { rulesDir, detailsDir, coreWorkflowPath? }
 *
 * When `coreWorkflowPath` is set, the platform uses a single-file entry
 * point (e.g. CLAUDE.md, AGENTS.md) rather than a directory of rules.
 */
interface AssetPlacement {
  /** Where to place the aws-aidlc-rules/ directory contents */
  rulesDir: string;
  /** Where to place the aws-aidlc-rule-details/ directory contents */
  detailsDir: string;
  /**
   * If set, only core-workflow.md is placed at this path (not the full rules dir).
   * Used by platforms that use a monolithic instructions file.
   */
  coreWorkflowOnly?: string;
}

function getAssetPlacement(target: string): AssetPlacement {
  switch (target) {
    case "kiro":
      return {
        rulesDir: ".kiro/steering/aws-aidlc-rules",
        detailsDir: ".kiro/aws-aidlc-rule-details",
      };
    case "cursor":
      return {
        rulesDir: ".cursor/rules",
        detailsDir: ".aidlc-rule-details",
        coreWorkflowOnly: ".cursor/rules/ai-dlc-workflow.mdc",
      };
    case "cline":
      return {
        rulesDir: ".clinerules",
        detailsDir: ".aidlc-rule-details",
        coreWorkflowOnly: ".clinerules/core-workflow.md",
      };
    case "claude":
      return {
        rulesDir: ".",
        detailsDir: ".aidlc-rule-details",
        coreWorkflowOnly: "CLAUDE.md",
      };
    case "copilot":
      return {
        rulesDir: ".github",
        detailsDir: ".aidlc-rule-details",
        coreWorkflowOnly: ".github/copilot-instructions.md",
      };
    case "codex":
      return {
        rulesDir: ".",
        detailsDir: ".aidlc-rule-details",
        coreWorkflowOnly: "AGENTS.md",
      };
    default:
      // Fallback: use .aidlc-rules/ and .aidlc-rule-details/
      return {
        rulesDir: ".aidlc-rules",
        detailsDir: ".aidlc-rule-details",
      };
  }
}

/**
 * Recursively copy a source directory to a destination, returning all
 * written file paths (relative to engagementDir).
 */
function copyDirRecursive(srcDir: string, destDir: string, engagementDir: string, installed: string[]): void {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });

  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, engagementDir, installed);
    } else {
      const content = readFileSync(srcPath, "utf-8");
      writeFileSync(destPath, content, "utf-8");
      // Store path relative to engagementDir
      const relative = destPath.slice(engagementDir.length + 1).replace(/\\/g, "/");
      installed.push(relative);
    }
  }
}

export async function handleInstallAssets(
  ctx: HandlerContext,
  input: InstallAssetsInput,
): Promise<{ installed: string[]; programId: string; target: string; count: number }> {
  const startTime = Date.now();
  const program = ctx.programs.find((p) => p.id === input.programId);
  if (!program) {
    throw new Error(`Unknown programId '${input.programId}'`);
  }

  // Look for bundled assets at skills/assets/ within the program directory
  const assetsRoot = join(program._dir, "skills", "assets");
  if (!existsSync(assetsRoot)) {
    throw new Error(
      `Program '${input.programId}' has no bundled assets at skills/assets/. ` +
        `Assets must be installed manually per the program's installation guide.`,
    );
  }

  // T3/T8 mitigation: validate engagementDir against path traversal attacks
  const absDir = validateEngagementDir(input.engagementDir);
  mkdirSync(absDir, { recursive: true });

  const placement = getAssetPlacement(input.target);
  const installed: string[] = [];

  // Find the aidlc-rules subdirectories
  const rulesSource = join(assetsRoot, "aidlc-rules", "aws-aidlc-rules");
  const detailsSource = join(assetsRoot, "aidlc-rules", "aws-aidlc-rule-details");

  if (placement.coreWorkflowOnly) {
    // Platforms that use a single entry-point file
    const coreWorkflow = join(rulesSource, "core-workflow.md");
    if (existsSync(coreWorkflow)) {
      const destPath = join(absDir, placement.coreWorkflowOnly);
      mkdirSync(dirname(destPath), { recursive: true });

      let content = readFileSync(coreWorkflow, "utf-8");

      // For Cursor, wrap in frontmatter
      if (input.target === "cursor") {
        content = `---\ndescription: "AI-DLC (AI-Driven Development Life Cycle) adaptive workflow for software development"\nalwaysApply: true\n---\n\n${content}`;
      }

      writeFileSync(destPath, content, "utf-8");
      installed.push(placement.coreWorkflowOnly);
    }
  } else {
    // Platforms that use the full rules directory
    const destRulesDir = join(absDir, placement.rulesDir);
    copyDirRecursive(rulesSource, destRulesDir, absDir, installed);
  }

  // Always copy rule-details
  const destDetailsDir = join(absDir, placement.detailsDir);
  copyDirRecursive(detailsSource, destDetailsDir, absDir, installed);

  // Copy VERSION file if present
  const versionFile = join(assetsRoot, "aidlc-rules", "VERSION");
  if (existsSync(versionFile)) {
    const versionDest = join(absDir, placement.detailsDir, "VERSION");
    writeFileSync(versionDest, readFileSync(versionFile, "utf-8"), "utf-8");
    installed.push(`${placement.detailsDir}/VERSION`);
  }

  auditLog({
    ts: new Date().toISOString(),
    tool: "fde_install_assets",
    outcome: "success",
    durationMs: Date.now() - startTime,
    params: {
      programId: input.programId,
      target: input.target,
      engagementDir: absDir,
      filesInstalled: installed.length,
    },
  });

  return {
    installed,
    programId: input.programId,
    target: input.target,
    count: installed.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Utility: intention fingerprint (for debug surfaces only)            */
/* ------------------------------------------------------------------ */

export function intentionFingerprint(intention: Intention): string {
  const canonical = JSON.stringify(intention);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
