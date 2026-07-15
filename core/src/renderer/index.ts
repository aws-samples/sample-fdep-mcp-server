/**
 * Harness Renderer — types and orchestration for per-target rendering
 * via adapters. Enforces harness isolation, idempotent writes, and
 * managed-file headers.
 */

/* ------------------------------------------------------------------ */
/*  Capability enum                                                    */
/* ------------------------------------------------------------------ */

export enum HarnessCapability {
  AutoSteeringByGlob = "AutoSteeringByGlob",
  SlashCommands = "SlashCommands",
  FrontmatterDirectives = "FrontmatterDirectives",
  MultiFileSteering = "MultiFileSteering",
  ToolInvocationHooks = "ToolInvocationHooks",
}

/* ------------------------------------------------------------------ */
/*  Harness target type                                                */
/* ------------------------------------------------------------------ */

/**
 * The closed set of supported agentic platforms. Extended in the
 * intention-driven harness pivot to 14 targets (design.md §Multi-Platform
 * Adapter Registry). The first five are file-based adapters that pre-date
 * the pivot; the next eight are new file-based adapters; `mcp` is an
 * MCP-style adapter that writes no files and instead exposes content via
 * the MCP server tool surface.
 */
export type HarnessTarget =
  // Pre-pivot file-based adapters.
  | "kiro"
  | "claude"
  | "copilot"
  | "codex"
  | "cursor"
  // Post-pivot file-based adapters.
  | "cline"
  | "continue"
  | "aider"
  | "windsurf"
  | "zed"
  | "chatgpt-custom-gpt"
  | "gemini-code-assist"
  // MCP-native adapter (no file output).
  | "mcp";

/**
 * Delivery style for an adapter. File-based adapters write artifacts
 * under their `targetDir`; MCP-style adapters expose content through
 * MCP tools and write no files.
 */
export type AdapterStyle = "file" | "mcp";

/* ------------------------------------------------------------------ */
/*  Written file descriptor                                            */
/* ------------------------------------------------------------------ */

/** Describes a file that an adapter would write. */
export interface WrittenFile {
  /** Relative path from the engagement root (e.g. ".kiro/steering/aim-framework.md"). */
  path: string;
  /** Full text content of the file. */
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Render context                                                     */
/* ------------------------------------------------------------------ */

export interface RenderContext {
  /** The engagement identifier (customer name). */
  engagementId: string;
}

/* ------------------------------------------------------------------ */
/*  Portable artifact types consumed by adapters                       */
/* ------------------------------------------------------------------ */

export interface SteeringFile {
  id: string;
  /** Short description of what this steering file provides. */
  description?: string | undefined;
  inclusion: "always" | "auto" | "manual";
  match?: string | undefined;
  priority: number;
  body: string;
  /** The program this steering belongs to. */
  programId: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  trigger: { kind: "command"; phrase: string } | { kind: "auto"; on: string };
  body: string;
  inputs?: Array<{ name: string; type: string; required: boolean; prompt?: string | undefined }> | undefined;
  outputs?: Array<{ name: string; path: string; kind: string }> | undefined;
  steeringRefs?: string[] | undefined;
  /** The program this skill belongs to. */
  programId: string;
}

export interface ReferenceFile {
  /** Relative path within the program's references directory (e.g. "layer-5-ai-app-creation.md"). */
  filename: string;
  /** Full file content. */
  body: string;
  /** The program this reference belongs to. */
  programId: string;
  /** The skill ids defined by the owning program. Adapters that nest references
   *  inside skill folders (e.g. Kiro) use this to place a copy under each skill. */
  skillIds: string[];
}

export interface EngagementSpec {
  engagementId: string;
  currentStage: string;
  activatedPrograms: string[];
  summary: string;
}

/* ------------------------------------------------------------------ */
/*  Adapter interface                                                  */
/* ------------------------------------------------------------------ */

export interface HarnessAdapter {
  readonly id: HarnessTarget;
  /**
   * Root directory under the engagement where this adapter writes files.
   * Required for file-based adapters (`style === "file"`). Omitted for
   * MCP-style adapters (`style === "mcp"`) which write no files.
   */
  readonly targetDir?: string;
  /**
   * Delivery style. File-based adapters write artifacts under `targetDir`;
   * MCP-style adapters expose content through MCP tools and write no files.
   */
  readonly style: AdapterStyle;
  /**
   * Declarative capability set used by the orchestrator to select graceful
   * degradation paths (e.g. emitting `"## When working on <glob>"` headings
   * when auto-steering is unavailable).
   */
  readonly capabilities: ReadonlySet<HarnessCapability>;

  renderSteering(steering: SteeringFile, ctx: RenderContext): WrittenFile[];
  renderSkill(skill: Skill, ctx: RenderContext): WrittenFile[];
  renderReference?(reference: ReferenceFile, ctx: RenderContext): WrittenFile[];
  renderSpec(spec: EngagementSpec, ctx: RenderContext): WrittenFile[];
  supports(capability: HarnessCapability): boolean;
}
