/**
 * Continue.dev platform adapter.
 *
 * Continue reads rules from `.continue/rules/`. Skills are emitted as
 * markdown bodies that Continue can surface via slash commands (the
 * agent runtime picks them up from the `.continue/` subtree).
 *
 * Output layout:
 *   .continue/rules/<programId>-<steeringId>.md
 *   .continue/skills/<programId>-<skillId>.md
 *   .continue/engagement.md
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
  renderSteeringMarkdown,
  capabilitySet,
} from "../_shared/helpers.js";

const CAPABILITIES: Record<string, boolean> = {
  AutoSteeringByGlob: true,
  SlashCommands: true,
  FrontmatterDirectives: true,
  MultiFileSteering: true,
  ToolInvocationHooks: false,
};

export const continueAdapter: PlatformAdapter = {
  id: "continue" as PlatformTarget,
  targetDir: ".continue",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: true,
    SlashCommands: true,
    FrontmatterDirectives: true,
    MultiFileSteering: true,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.continue/rules/${steering.programId}-${steering.id}.md`;
    return [renderSteeringMarkdown(steering, path)];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const path = `.continue/skills/${skill.programId}-${skill.id}.md`;
    return [renderSkillMarkdown(skill, path)];
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const content = [
      `# Engagement: ${spec.engagementId}`,
      "",
      `Current stage: ${spec.currentStage}`,
      "",
      "## Activated programs",
      ...spec.activatedPrograms.map((p) => `- ${p}`),
      "",
      spec.summary,
    ].join("\n");
    return [{ path: `.continue/engagement.md`, content }];
  },

  supports(capability: PlatformCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
