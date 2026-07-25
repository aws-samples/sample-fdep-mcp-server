/**
 * Cline / Roo Code platform adapter.
 *
 * Cline consumes rules from `.clinerules/` at the workspace root. Each
 * file is rendered as plain markdown; auto-steering by glob is expressed
 * via a "When working on <glob>" heading so the content is still
 * discoverable without native glob support.
 *
 * Output layout:
 *   .clinerules/<programId>-<steeringId>.md
 *   .clinerules/skills/<programId>-<skillId>.md
 *   .clinerules/engagement.md
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
import {
  renderSkillMarkdown,
  renderSteeringWithGlobHeading,
  capabilitySet,
} from "../_shared/helpers.js";

const CAPABILITIES: Record<string, boolean> = {
  AutoSteeringByGlob: false,
  SlashCommands: false,
  FrontmatterDirectives: false,
  MultiFileSteering: true,
  ToolInvocationHooks: false,
};

export const clineAdapter: PlatformAdapter = {
  id: "cline" as PlatformTarget,
  targetDir: ".clinerules",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: false,
    SlashCommands: false,
    FrontmatterDirectives: false,
    MultiFileSteering: true,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.clinerules/${steering.programId}-${steering.id}.md`;
    return [renderSteeringWithGlobHeading(steering, path)];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const path = `.clinerules/skills/${skill.programId}-${skill.id}.md`;
    return [renderSkillMarkdown(skill, path)];
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const content = [
      `# Engagement: ${spec.engagementId}`,
      "",
      `Current stage: ${spec.currentStage}`,
      "",
      "## Activated programs",
      "",
      ...spec.activatedPrograms.map((p) => `- ${p}`),
      "",
      spec.summary,
    ].join("\n");
    return [{ path: `.clinerules/engagement.md`, content }];
  },

  supports(capability: PlatformCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
