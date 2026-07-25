/**
 * Zed AI platform adapter.
 *
 * Zed surfaces AI context via `.zed/ai-assistant.md` plus a `.zed/skills/`
 * subtree. Auto-steering by glob is expressed via inline "When working on"
 * headings since Zed does not natively gate on globs today.
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

export const zedAdapter: PlatformAdapter = {
  id: "zed" as PlatformTarget,
  targetDir: ".zed",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: false,
    SlashCommands: false,
    FrontmatterDirectives: false,
    MultiFileSteering: true,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.zed/steering/${steering.programId}-${steering.id}.md`;
    return [renderSteeringWithGlobHeading(steering, path)];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const path = `.zed/skills/${skill.programId}-${skill.id}.md`;
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
    return [{ path: `.zed/engagement.md`, content }];
  },

  supports(capability: PlatformCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
