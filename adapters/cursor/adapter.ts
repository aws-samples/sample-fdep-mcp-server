/**
 * Cursor platform adapter.
 *
 * Cursor uses `.cursor/rules/<name>.mdc` files with frontmatter directives.
 * Auto-inclusion by glob is supported via a `globs:` frontmatter field.
 * Slash commands are not natively supported. Multi-file steering is supported.
 *
 * Output layout:
 *   .cursor/rules/<programId>-<steeringId>.mdc
 *   .cursor/skills/<programId>-<skillId>.md
 *   .cursor/specs/<engagementId>/engagement.md
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

export const cursorAdapter: PlatformAdapter = {
  id: "cursor" as PlatformTarget,
  targetDir: ".cursor",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: true,
    SlashCommands: false,
    FrontmatterDirectives: true,
    MultiFileSteering: true,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const filename = `${steering.programId}-${steering.id}.mdc`;
    const path = `.cursor/rules/${filename}`;

    const frontmatterFields: string[] = [
      `id: ${steering.id}`,
    ];
    if (steering.description !== undefined) {
      const safeDescription = steering.description.replace(/"/g, '\\"');
      frontmatterFields.push(`description: "${safeDescription}"`);
    }
    frontmatterFields.push(`inclusion: ${steering.inclusion}`);

    if (steering.match !== undefined) {
      frontmatterFields.push(`globs: "${steering.match}"`);
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
    const path = `.cursor/skills/${filename}`;

    const lines: string[] = [];
    lines.push(`# ${skill.name}`, "");

    if (skill.trigger.kind === "command") {
      lines.push(`> **Invocation:** Say "${skill.trigger.phrase}" to run this skill.`, "");
    }

    lines.push(skill.body);

    return [{ path, content: lines.join("\n") }];
  },

  renderReference(reference: ReferenceFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.cursor/references/${reference.programId}/${reference.filename}`;
    return [{ path, content: reference.body }];
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const dir = `.cursor/specs/${spec.engagementId}`;

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
