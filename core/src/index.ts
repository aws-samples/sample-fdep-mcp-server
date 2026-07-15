/**
 * @ace/core — public library API surface.
 *
 * This module re-exports the loader, planner, renderer, state, and expression
 * subsystems once they land (see tasks 3–13 in the spec). For now it is an
 * intentional stub so the package resolves during scaffolding.
 */

export const FDE_KIT_VERSION = "0.1.0";

// Intention model (intention-driven harness pivot).
export {
  isRegulatedIndustry,
  IntentionValidationError,
  REGULATED_INDUSTRIES,
} from "./intention/types.js";
export type {
  AimScores,
  AimTier,
  CloudPosture,
  Goal,
  HarnessTargetId,
  Industry,
  Intention,
  IntentionDiagnostic,
  ProductionInventory,
  TeamShape,
} from "./intention/types.js";

// AIM bootstrap skill selection.
export { selectAimMode } from "./aim/select.js";
export type {
  AimAssessmentResult,
  AimMode,
  AimPreferences,
  EvidenceRef,
} from "./aim/types.js";

// Renderer types (harness target + adapter contract).
export {
  HarnessCapability,
} from "./renderer/index.js";
export type {
  AdapterStyle,
  EngagementSpec,
  HarnessAdapter,
  HarnessTarget,
  RenderContext,
  Skill as RendererSkill,
  SteeringFile,
  WrittenFile,
} from "./renderer/index.js";
