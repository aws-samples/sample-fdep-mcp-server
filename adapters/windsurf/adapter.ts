/**
 * Windsurf / Cascade platform adapter.
 *
 * Windsurf uses `.windsurf/rules/` for steering and `.windsurf/workflows/`
 * for multi-step skill-like workflows.
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

export const windsurfAdapter: PlatformAdapter = {
  id: "windsurf" as PlatformTarget,
  targetDir: ".windsurf",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: true,
    SlashCommands: true,
    FrontmatterDirectives: true,
    MultiFileSteering: true,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.windsurf/rules/${steering.programId}-${steering.id}.md`;
    return [renderSteeringMarkdown(steering, path)];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const path = `.windsurf/workflows/${skill.programId}-${skill.id}.md`;
    return [renderSkillMarkdown(skill, path)];
  },

  renderSpec(spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    const content = [
      `# Engagement: ${spec.engagementId}`,
      "",
      `Current stage: ${spec.currentStage}`,
      "",
      ...spec.activatedPrograms.map((p) => `- ${p}`),
      "",
      spec.summary,
    ].join("\n");
    return [{ path: `.windsurf/engagement.md`, content }];
  },

  supports(capability: PlatformCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
