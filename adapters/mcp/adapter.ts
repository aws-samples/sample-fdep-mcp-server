/**
 * MCP-native adapter.
 *
 * This adapter writes no files. Its purpose is to register a target that
 * the MCP server (see `core/src/mcp/`) satisfies by exposing steering and
 * skill content directly as MCP tools (`fde_get_steering`,
 * `fde_get_skill`). The renderer orchestrator recognizes `style: "mcp"`
 * and skips disk writes for this adapter.
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
import { capabilitySet } from "../_shared/helpers.js";

const CAPABILITIES: Record<string, boolean> = {
  AutoSteeringByGlob: false,
  SlashCommands: false,
  FrontmatterDirectives: false,
  MultiFileSteering: true,
  ToolInvocationHooks: true,
};

export const mcpAdapter: HarnessAdapter = {
  id: "mcp" as HarnessTarget,
  style: "mcp",
  capabilities: capabilitySet({
    AutoSteeringByGlob: false,
    SlashCommands: false,
    FrontmatterDirectives: false,
    MultiFileSteering: true,
    ToolInvocationHooks: true,
  }),

  renderSteering(_steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    return [];
  },
  renderSkill(_skill: Skill, _ctx: RenderContext): WrittenFile[] {
    return [];
  },
  renderSpec(_spec: EngagementSpec, _ctx: RenderContext): WrittenFile[] {
    return [];
  },
  supports(capability: HarnessCapability): boolean {
    return CAPABILITIES[capability] === true;
  },
};
