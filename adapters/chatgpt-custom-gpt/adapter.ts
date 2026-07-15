/**
 * ChatGPT Custom GPT harness adapter.
 *
 * Custom GPTs consume a single `instructions.md` plus an `actions/`
 * subtree that OpenAPI-shaped action fragments. This adapter writes
 * file-per-artifact; bundling into a single instructions blob is a
 * downstream build step.
 */

import type {
  HarnessAdapter,
  HarnessCapability,
  HarnessTarget,
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
  MultiFileSteering: false,
  ToolInvocationHooks: false,
};

export const chatgptCustomGptAdapter: HarnessAdapter = {
  id: "chatgpt-custom-gpt" as HarnessTarget,
  targetDir: ".chatgpt",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: false,
    SlashCommands: false,
    FrontmatterDirectives: false,
    MultiFileSteering: false,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    const path = `.chatgpt/instructions/${steering.programId}-${steering.id}.md`;
    return [renderSteeringWithGlobHeading(steering, path)];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const path = `.chatgpt/actions/${skill.programId}-${skill.id}.md`;
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
    return [{ path: `.chatgpt/engagement.md`, content }];
  },

  supports(capability: HarnessCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
