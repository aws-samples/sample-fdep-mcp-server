/**
 * Shared helpers used by multiple harness adapters to keep their bodies
 * compact and consistent.
 */

import {
  HarnessCapability,
  type Skill,
  type SteeringFile,
  type WrittenFile,
} from "../../core/src/renderer/index.js";

/**
 * Build a typed `ReadonlySet<HarnessCapability>` from a capability map that
 * uses the enum member names as keys. Keeps adapter bodies DRY while
 * satisfying the `HarnessAdapter.capabilities` contract.
 */
export function capabilitySet(
  flags: Partial<Record<keyof typeof HarnessCapability, boolean>>,
): ReadonlySet<HarnessCapability> {
  const set = new Set<HarnessCapability>();
  for (const key of Object.keys(HarnessCapability) as Array<
    keyof typeof HarnessCapability
  >) {
    if (flags[key]) set.add(HarnessCapability[key]);
  }
  return set;
}

/** Emit a steering file as frontmatter + body at the given relative path. */
export function renderSteeringMarkdown(
  steering: SteeringFile,
  path: string,
): WrittenFile {
  const frontmatter: string[] = [
    `id: ${steering.id}`,
  ];
  if (steering.description !== undefined) {
    const safeDescription = steering.description.replace(/"/g, '\\"');
    frontmatter.push(`description: "${safeDescription}"`);
  }
  frontmatter.push(`inclusion: ${steering.inclusion}`);
  if (steering.match !== undefined) {
    frontmatter.push(`match: "${steering.match}"`);
  }
  frontmatter.push(`priority: ${steering.priority}`);

  const content = ["---", ...frontmatter, "---", "", steering.body].join("\n");
  return { path, content };
}

/**
 * Emit a steering file with a "## When working on <glob>" heading prefix
 * for targets that do not support auto-steering by glob natively. The
 * heading is purely informational so the content is still discoverable.
 */
export function renderSteeringWithGlobHeading(
  steering: SteeringFile,
  path: string,
): WrittenFile {
  const heading = steering.inclusion === "auto" && steering.match
    ? `## When working on \`${steering.match}\`\n\n`
    : "";
  const content = heading + steering.body;
  return { path, content };
}

/** Emit a skill as frontmatter + body at the given relative path. */
export function renderSkillMarkdown(skill: Skill, path: string): WrittenFile {
  const frontmatter: string[] = [
    `id: ${skill.id}`,
    `name: "${skill.name}"`,
    `description: "${skill.description}"`,
  ];
  if (skill.trigger.kind === "command") {
    frontmatter.push("trigger: command");
    frontmatter.push(`phrase: "${skill.trigger.phrase}"`);
  } else {
    frontmatter.push("trigger: auto");
    frontmatter.push(`on: ${skill.trigger.on}`);
  }
  const content = ["---", ...frontmatter, "---", "", skill.body].join("\n");
  return { path, content };
}
