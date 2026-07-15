/**
 * Aider harness adapter.
 *
 * Aider consumes a single `CONVENTIONS.md` plus `.aider.conf.yml` at the
 * workspace root. Steering files are concatenated into CONVENTIONS.md
 * with "When working on" headings for discoverability.
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

export const aiderAdapter: HarnessAdapter = {
  id: "aider" as HarnessTarget,
  targetDir: ".aider",
  style: "file",
  capabilities: capabilitySet({
    AutoSteeringByGlob: false,
    SlashCommands: false,
    FrontmatterDirectives: false,
    MultiFileSteering: false,
    ToolInvocationHooks: false,
  }),

  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    // Write one file per steering for traceability; a downstream build step
    // can concatenate them into CONVENTIONS.md. We additionally emit a stub
    // CONVENTIONS.md entry per steering to make the heading discoverable.
    const path = `.aider/steering/${steering.programId}-${steering.id}.md`;
    return [renderSteeringWithGlobHeading(steering, path)];
  },

  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    const path = `.aider/skills/${skill.programId}-${skill.id}.md`;
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
    return [{ path: `.aider/engagement.md`, content }];
  },

  supports(capability: HarnessCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
