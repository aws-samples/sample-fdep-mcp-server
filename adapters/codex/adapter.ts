/**
 * Codex platform adapter.
 *
 * Codex uses a single `.codex/AGENTS.md` file (no multi-file steering).
 * Auto-inclusion by glob is not supported; the adapter emits a
 * "When working on `<match>`" section heading as a degradation fallback.
 * Slash commands are not supported; command-triggered skills get a
 * natural-language invocation hint.
 *
 * Output layout:
 *   .codex/AGENTS.md                          — all steering collapsed into sections
 *   .codex/skills/<programId>-<skillId>.md    — skill files
 *   .codex/specs/<engagementId>/engagement.md
 */

import type {
  PlatformAdapter,
  PlatformCapability,
  PlatformTarget,
  WrittenFile,
  RenderContext,
  SteeringFile,
  Skill,
  EngagementSpec,
} from "../../core/src/renderer/index.js";
import { capabilitySet } from "../_shared/helpers.js";

/* ------------------------------------------------------------------ */
/*  Capability map                                                     */
/* ------------------------------------------------------------------ */

const CAPABILITIES: Record<string, boolean> = {
  AutoSteeringByGlob: false,
  SlashCommands: false,
  FrontmatterDirectives: false,
  MultiFileSteering: false,
  ToolInvocationHooks: false,
};

/* ------------------------------------------------------------------ */
/*  Adapter implementation                                             */
/* ------------------------------------------------------------------ */

export const codexAdapter: PlatformAdapter = {
  id: "codex" as PlatformTarget,
  targetDir: ".codex",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: false,
    SlashCommands: false,
    FrontmatterDirectives: false,
    MultiFileSteering: false,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    // Codex doesn't support multi-file steering — collapse everything
    // into sections within .codex/AGENTS.md.
    let heading: string;
    if (steering.inclusion === "auto" && steering.match !== undefined) {
      heading = `When working on \`${steering.match}\``;
    } else {
      heading = `${steering.programId}/${steering.id}`;
    }

    const content = [`## ${heading}`, "", steering.body].join("\n");

    return [{ path: ".codex/AGENTS.md", content }];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const filename = `${skill.programId}-${skill.id}.md`;
    const path = `.codex/skills/${filename}`;

    const lines: string[] = [];
    lines.push(`# ${skill.name}`, "");

    if (skill.trigger.kind === "command") {
      lines.push(`> **Invocation:** Say "${skill.trigger.phrase}" to run this skill.`, "");
    }

    lines.push(skill.body);

    return [{ path, content: lines.join("\n") }];
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const dir = `.codex/specs/${spec.engagementId}`;

    const content = [
      `# Engagement: ${spec.engagementId}`,
      "",
      `**Stage:** ${spec.currentStage}`,
      "",
      `**Activated Programs:** ${spec.activatedPrograms.join(", ")}`,
      "",
      spec.summary,
    ].join("\n");

    return [{ path: `${dir}/engagement.md`, content }];
  },

  supports(capability: PlatformCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
