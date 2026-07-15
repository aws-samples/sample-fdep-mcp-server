/**
 * Kiro harness adapter.
 *
 * Kiro supports frontmatter directives, auto-steering by glob, slash commands,
 * and multi-file steering natively. This adapter preserves the portable FDE
 * artifact format with minimal transformation.
 *
 * Output layout:
 *   .kiro/steering/<programId>-<steeringId>.md
 *   .kiro/skills/<programId>-<skillId>/SKILL.md
 *   .kiro/skills/<programId>-<skillId>/references/<filename>
 *   .kiro/specs/<engagementId>/
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
  AutoSteeringByGlob: true,
  SlashCommands: true,
  FrontmatterDirectives: true,
  MultiFileSteering: true,
  ToolInvocationHooks: false,
};

/* ------------------------------------------------------------------ */
/*  Adapter implementation                                             */
/* ------------------------------------------------------------------ */

export const kiroAdapter: HarnessAdapter = {
  id: "kiro" as HarnessTarget,
  targetDir: ".kiro",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: true,
    SlashCommands: true,
    FrontmatterDirectives: true,
    MultiFileSteering: true,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const filename = `${steering.programId}-${steering.id}.md`;
    const path = `.kiro/steering/${filename}`;

    // Build frontmatter preserving inclusion + match + description
    const frontmatterFields: string[] = [
      `id: ${steering.id}`,
    ];
    if (steering.description !== undefined) {
      const safeDescription = steering.description.replace(/"/g, '\\"');
      frontmatterFields.push(`description: "${safeDescription}"`);
    }
    frontmatterFields.push(`inclusion: ${steering.inclusion}`);
    if (steering.match !== undefined) {
      frontmatterFields.push(`match: "${steering.match}"`);
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
    const folderName = `${skill.programId}-${skill.id}`;
    const path = `.kiro/skills/${folderName}/SKILL.md`;

    // Escape double quotes in description to prevent malformed frontmatter
    const safeDescription = skill.description.replace(/"/g, '\\"');

    // Build frontmatter
    const frontmatterFields: string[] = [
      `id: ${skill.id}`,
      `name: "${skill.name} (${skill.programId})"`,
      `description: "${safeDescription}"`,
    ];

    if (skill.trigger.kind === "command") {
      frontmatterFields.push(`trigger: command`);
      frontmatterFields.push(`phrase: "${skill.trigger.phrase}"`);
    } else {
      frontmatterFields.push(`trigger: auto`);
      frontmatterFields.push(`on: ${skill.trigger.on}`);
    }

    const content = [
      "---",
      ...frontmatterFields,
      "---",
      "",
      skill.body,
    ].join("\n");

    return [{ path, content }];
  },

  renderReference(reference: ReferenceFile, _ctx: RenderContext): WrittenFile[] {
    // Kiro skills are self-contained folders with an optional references/
    // subfolder. Place a copy of each program reference inside every skill
    // folder the program defines, matching Kiro's native skill layout:
    //   .kiro/skills/<programId>-<skillId>/references/<filename>
    // If the program defines no skills, fall back to a dedicated references
    // skill folder so the material is still rendered.
    const targets = reference.skillIds.length > 0
      ? reference.skillIds.map((skillId) => `${reference.programId}-${skillId}`)
      : [`${reference.programId}-references`];

    return targets.map((folderName) => ({
      path: `.kiro/skills/${folderName}/references/${reference.filename}`,
      content: reference.body,
    }));
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const dir = `.kiro/specs/${spec.engagementId}`;

    const content = [
      "---",
      `engagementId: ${spec.engagementId}`,
      `currentStage: ${spec.currentStage}`,
      `activatedPrograms:`,
      ...spec.activatedPrograms.map((p) => `  - ${p}`),
      "---",
      "",
      spec.summary,
    ].join("\n");

    return [{ path: `${dir}/engagement.md`, content }];
  },

  supports(capability: HarnessCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
