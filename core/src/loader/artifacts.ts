/**
 * Helpers to load steering and skill artifact files (markdown + frontmatter)
 * from disk after program manifests have been validated.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { LoadedSteering, LoadedSkill } from "./index.js";

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = (parseYaml(match[1]!) ?? {}) as Record<string, unknown>;
  return { meta, body: match[2]! };
}

/** Load a steering file from disk. Throws on missing required fields. */
export function loadSteeringFile(filePath: string): LoadedSteering {
  const raw = readFileSync(filePath, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  const id = String(meta.id ?? "");
  const description = meta.description !== undefined ? String(meta.description) : undefined;
  const inclusion = (meta.inclusion ?? "always") as "always" | "auto" | "manual";
  const priority = Number(meta.priority ?? 50);
  const match = meta.match !== undefined ? String(meta.match) : undefined;

  if (!id) {
    throw new Error(`Steering file missing 'id' field: ${filePath}`);
  }

  return { id, description, inclusion, match, priority, body };
}

/** Load a skill file from disk. Throws on missing required fields. */
export function loadSkillFile(filePath: string): LoadedSkill {
  const raw = readFileSync(filePath, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  const id = String(meta.id ?? "");
  const name = String(meta.name ?? id);
  const description = String(meta.description ?? "");
  const trigger = (meta.trigger ?? { kind: "command", phrase: `/${id}` }) as {
    kind: string;
    phrase?: string;
    on?: string;
  };

  if (!id) {
    throw new Error(`Skill file missing 'id' field: ${filePath}`);
  }

  return {
    id,
    name,
    description,
    trigger,
    body,
    inputs: meta.inputs as LoadedSkill["inputs"],
    outputs: meta.outputs as LoadedSkill["outputs"],
    steeringRefs: meta.steeringRefs as string[] | undefined,
  };
}
