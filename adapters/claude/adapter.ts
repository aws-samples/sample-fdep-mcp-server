/**
 * Claude Code harness adapter.
 *
 * Claude Code uses a single `.claude/CLAUDE.md` file for steering (no multi-file
 * steering support). Auto-inclusion by glob is not natively supported, so the
 * adapter emits a "When working on `<match>`" section heading as a degradation
 * fallback. Slash commands are not supported; command-triggered skills get a
 * natural-language invocation hint instead.
 *
 * Output layout:
 *   .claude/CLAUDE.md              — all steering collapsed into sections
 *   .claude/commands/<programId>-<skillId>.md  — skill files
 *   .claude/specs/<engagementId>/engagement.md
 */

import type {
  HarnessAdapter,
  HarnessCapability,
  HarnessTarget,
  WrittenFile,
  RenderContext,
  SteeringFile,
  Skill,
  ReferenceFile,
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

export const claudeAdapter: HarnessAdapter = {
  id: "claude" as HarnessTarget,
  targetDir: ".claude",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: false,
    SlashCommands: false,
    FrontmatterDirectives: false,
    MultiFileSteering: false,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    // Claude doesn't support multi-file steering — collapse everything
    // into sections within .claude/CLAUDE.md.
    // For auto-inclusion, emit a heading with the match pattern so the
    // content remains discoverable (graceful degradation).

    let heading: string;
    if (steering.inclusion === "auto" && steering.match !== undefined) {
      heading = `When working on \`${steering.match}\``;
    } else {
      heading = `${steering.programId}/${steering.id}`;
    }

    const content = [`## ${heading}`, "", steering.body].join("\n");

    return [{ path: ".claude/CLAUDE.md", content }];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const filename = `${skill.programId}-${skill.id}.md`;
    const path = `.claude/commands/${filename}`;

    // Claude doesn't support slash commands — emit a natural-language
    // invocation hint at the top of the skill body.
    const lines: string[] = [];

    if (skill.trigger.kind === "command") {
      lines.push(
        `# ${skill.name}`,
        "",
        `> **Invocation:** Say "${skill.trigger.phrase}" to run this skill.`,
        "",
      );
    } else {
      lines.push(`# ${skill.name}`, "");
    }

    lines.push(skill.body);

    return [{ path, content: lines.join("\n") }];
  },

  renderReference(reference: ReferenceFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.claude/references/${reference.programId}/${reference.filename}`;
    return [{ path, content: reference.body }];
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const dir = `.claude/specs/${spec.engagementId}`;

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

  supports(capability: HarnessCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
