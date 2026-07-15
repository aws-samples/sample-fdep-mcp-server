/**
 * Pipeline definition loader — reads `pipelines/*.yaml` into PipelineDef.
 *
 * Requirements: 2.1
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { PipelineDef, PipelineStage } from "./index.js";

const VALID_STAGES: PipelineStage[] = ["intent", "assess", "transform", "ai-native"];

/**
 * Load a pipeline definition from `pipelines/<name>.yaml` under `root`.
 */
export function loadPipelineDef(root: string, name = "default"): PipelineDef {
  // Validate pipeline name: must be alphanumeric + hyphens only (no path separators or traversal)
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid pipeline name '${name}': must contain only alphanumeric characters, hyphens, and underscores`);
  }

  const file = resolve(root, "pipelines", `${name}.yaml`);
  if (!existsSync(file)) {
    throw new Error(`Pipeline definition not found: ${file}`);
  }
  const raw = readFileSync(file, "utf-8");
  const parsed = parseYaml(raw) as { stages?: unknown; entry?: unknown };

  if (!Array.isArray(parsed?.stages)) {
    throw new Error(`Pipeline definition '${name}' missing or invalid 'stages' array`);
  }

  const stages = (parsed.stages as string[]).map((s) => {
    if (!VALID_STAGES.includes(s as PipelineStage)) {
      throw new Error(
        `Unknown stage '${s}' in pipeline '${name}'. Valid: ${VALID_STAGES.join(", ")}`,
      );
    }
    return s as PipelineStage;
  });

  const entry = (parsed.entry ?? {}) as Record<string, string>;

  return { stages, entry };
}
