/**
 * GitHub Copilot platform adapter.
 *
 * Copilot uses `.github/instructions/<name>.instructions.md` files with
 * `applyTo:` frontmatter for auto-inclusion by glob. Slash commands are
 * not natively supported; command-triggered skills get a natural-language
 * invocation hint. Multi-file steering is supported (one file per steering).
 *
 * Output layout:
 *   .github/instructions/<programId>-<steeringId>.instructions.md
 *   .github/skills/<programId>-<skillId>.md
 *   .github/specs/<engagementId>/engagement.md
 */

import type {
  PlatformAdapter,
  PlatformCapability,
  PlatformTarget,
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
  AutoSteeringByGlob: true,
  SlashCommands: false,
  FrontmatterDirectives: true,
  MultiFileSteering: true,
  ToolInvocationHooks: false,
};

/* ------------------------------------------------------------------ */
/*  Adapter implementation                                             */
/* ------------------------------------------------------------------ */

export const copilotAdapter: PlatformAdapter = {
  id: "copilot" as PlatformTarget,
  targetDir: ".github",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: true,
    SlashCommands: false,
    FrontmatterDirectives: true,
    MultiFileSteering: true,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const filename = `${steering.programId}-${steering.id}.instructions.md`;
    const path = `.github/instructions/${filename}`;

    const frontmatterFields: string[] = [];

    // Map match → applyTo for auto-inclusion
    if (steering.inclusion === "auto" && steering.match !== undefined) {
      frontmatterFields.push(`applyTo: "${steering.match}"`);
    }
    frontmatterFields.push(`priority: ${steering.priority}`);

    const content = [
      "---",
      ...frontmatterFields,
      "---",
      "",
      steering.body,
    ].join("\n");

    return [{ path, content }];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const filename = `${skill.programId}-${skill.id}.md`;
    const path = `.github/skills/${filename}`;

    const lines: string[] = [];
    lines.push(`# ${skill.name}`, "");

    if (skill.trigger.kind === "command") {
      lines.push(`> **Invocation:** Say "${skill.trigger.phrase}" to run this skill.`, "");
    }

    lines.push(skill.body);

    return [{ path, content: lines.join("\n") }];
  },

  renderReference(reference: ReferenceFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.github/references/${reference.programId}/${reference.filename}`;
    return [{ path, content: reference.body }];
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const dir = `.github/specs/${spec.engagementId}`;

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
