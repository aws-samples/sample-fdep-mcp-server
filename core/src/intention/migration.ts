/**
 * Intention migration shim — `loadIntakeAsIntention`.
 *
 * Reads a legacy `customer-intake.yaml` (as used by the intake-driven
 * pipeline) and returns a schema-valid `Intention`. The shim keeps
 * existing engagements functional during the pivot. Known mappings:
 *
 *   intake.customer                → intention.customer
 *   intake.industry                → intention.industry
 *   intake.intent (array | csv)    → intention.goals
 *   intake.aimTierEstimate         → intention.aim.overall
 *   intake.cloud (single string)   → intention.cloud.primary
 *   intake.multicloud (boolean)    → intention.cloud.multicloud
 *   intake.regulated               → intention.regulated
 *   intake.productionAiSystems     → intention.production.aiSystems
 *   intake.developerCount          → intention.production.developerCount
 *   intake.teamSize                → intention.team.size
 *   intake.primaryAgenticPlatforms → intention.team.primaryAgenticPlatforms
 *   intake.notes                   → intention.notes
 *
 * Unknown fields are dropped silently — they don't break the migrated
 * intention but can't drive the resolver either.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { validateIntention } from "./loader.js";
import type {
  Goal,
  HarnessTargetId,
  Industry,
  Intention,
} from "./types.js";

/** Valid goal enum for intake → goals mapping. */
const VALID_GOALS: readonly Goal[] = [
  "gen-ai-rollout",
  "responsible-ai",
  "ai-operations",
  "prototyping",
  "resilience",
  "other",
];

const VALID_INDUSTRIES: readonly Industry[] = [
  "financial-services",
  "healthcare",
  "entertainment",
  "public-sector",
  "retail",
  "manufacturing",
  "other",
];

const VALID_PLATFORMS: readonly HarnessTargetId[] = [
  "kiro",
  "claude",
  "copilot",
  "cursor",
  "codex",
  "cline",
  "continue",
  "aider",
  "windsurf",
  "zed",
  "chatgpt-custom-gpt",
  "gemini-code-assist",
  "mcp",
];

/**
 * Load a legacy intake YAML/JSON and return an `Intention`.
 */
export function loadIntakeAsIntention(
  path: string,
  schemasDir: string,
): Intention {
  const raw = readFileSync(path, "utf-8");
  const intake = path.endsWith(".json")
    ? (JSON.parse(raw) as Record<string, unknown>)
    : (parseYaml(raw) as Record<string, unknown>);

  const customer = toKebabCustomer(intake.customer ?? intake.customerName ?? "acme-customer");
  const industry = coerceIndustry(intake.industry);
  const goals = toGoalsArray(intake.intent ?? intake.goals);
  const aimOverall = toTier(intake.aimTierEstimate ?? intake.aimTier);

  const candidate: Record<string, unknown> = {
    schemaVersion: "1",
    customer,
    goals: goals.length > 0 ? goals : ["other"],
    updatedAt: new Date().toISOString(),
  };

  if (industry) candidate.industry = industry;
  if (typeof intake.regulated === "boolean") candidate.regulated = intake.regulated;

  if (aimOverall !== undefined) {
    candidate.aim = { overall: aimOverall };
  }

  const cloud: Record<string, unknown> = {};
  if (typeof intake.cloud === "string") {
    const primary = coerceCloudPrimary(intake.cloud);
    if (primary) cloud.primary = primary;
  }
  if (typeof intake.multicloud === "boolean") cloud.multicloud = intake.multicloud;
  if (Object.keys(cloud).length > 0) candidate.cloud = cloud;

  const production: Record<string, unknown> = {};
  if (typeof intake.productionAiSystems === "number") production.aiSystems = intake.productionAiSystems;
  if (typeof intake.developerCount === "number") production.developerCount = intake.developerCount;
  if (Object.keys(production).length > 0) candidate.production = production;

  const team: Record<string, unknown> = {};
  if (typeof intake.teamSize === "number") team.size = intake.teamSize;
  const platforms = toPlatformsArray(intake.primaryAgenticPlatforms);
  if (platforms.length > 0) team.primaryAgenticPlatforms = platforms;
  if (Object.keys(team).length > 0) candidate.team = team;

  if (typeof intake.notes === "string" && intake.notes.length > 0) {
    candidate.notes = intake.notes.slice(0, 4000);
  }

  return validateIntention(candidate, schemasDir);
}

function toKebabCustomer(value: unknown): string {
  const s = typeof value === "string" ? value : "acme-customer";
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 64) || "acme-customer";
}

function coerceIndustry(value: unknown): Industry | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.toLowerCase().trim();
  if (VALID_INDUSTRIES.includes(s as Industry)) return s as Industry;
  return undefined;
}

function toGoalsArray(value: unknown): Goal[] {
  let items: string[] = [];
  if (Array.isArray(value)) items = value.map((x) => String(x));
  else if (typeof value === "string") items = value.split(",").map((s) => s.trim()).filter(Boolean);
  const out: Goal[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (VALID_GOALS.includes(item as Goal) && !seen.has(item)) {
      out.push(item as Goal);
      seen.add(item);
    }
  }
  return out;
}

function toTier(value: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 1 || value > 5) return undefined;
  return value as 1 | 2 | 3 | 4 | 5;
}

function coerceCloudPrimary(value: string): "aws" | "azure" | "gcp" | "other" | undefined {
  const s = value.toLowerCase();
  if (s === "aws" || s === "azure" || s === "gcp" || s === "other") return s;
  return undefined;
}

function toPlatformsArray(value: unknown): HarnessTargetId[] {
  if (!Array.isArray(value)) return [];
  const out: HarnessTargetId[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const s = String(item);
    if (VALID_PLATFORMS.includes(s as HarnessTargetId) && !seen.has(s)) {
      out.push(s as HarnessTargetId);
      seen.add(s);
    }
  }
  return out;
}
