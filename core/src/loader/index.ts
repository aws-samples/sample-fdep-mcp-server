/**
 * Program Loader — parses and validates program.yaml manifests, skill and
 * steering files, and enforces cross-file reference integrity.
 *
 * Diagnostics are collected and returned (or thrown) so callers get
 * actionable error messages with file paths, field names, and cycle details.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, delimiter as pathDelimiter } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import AjvMod, { type ValidateFunction, type ErrorObject } from "ajv/dist/2020.js";
import addFormatsMod from "ajv-formats";
import { parse as parseExpression, ExpressionSyntaxError } from "../expression/index.js";
import { scanForPortabilityViolations } from "../security/portability.js";

// `ajv/dist/2020` and `ajv-formats` publish CJS default exports; under Node16/NodeNext
// module resolution the interop default is the constructor/function we need.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv2020: any = (AjvMod as unknown as { default?: unknown }).default ?? AjvMod;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats: any = (addFormatsMod as unknown as { default?: unknown }).default ?? addFormatsMod;

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface Diagnostic {
  severity: "error" | "warning";
  message: string;
  file?: string;
  field?: string;
  line?: number;
  column?: number;
}

export interface LoadedProgram {
  id: string;
  name: string;
  version: string;
  summary: string;
  owner: string;
  stages: string[];
  applicability: Array<{ when: string; weight: number }>;
  skills: string[];
  steering: string[];
  templates: string[];
  playbooks: string[];
  references: string[];
  exitCriteria: Array<{
    id: string;
    description: string;
    check: string;
    target?: string;
  }>;
  dependsOn?: string[];
  tags?: string[];
  /** Absolute path to the program directory on disk. */
  _dir: string;
  /** Absolute path to the program.yaml file. */
  _manifestPath: string;
}

export interface LoadedSteering {
  id: string;
  description?: string | undefined;
  inclusion: "always" | "auto" | "manual";
  match?: string | undefined;
  priority: number;
  body: string;
}

export interface LoadedSkill {
  id: string;
  name: string;
  description: string;
  trigger: { kind: string; phrase?: string | undefined; on?: string | undefined };
  body: string;
  inputs?: Array<{ name: string; type: string; required: boolean; prompt?: string | undefined }> | undefined;
  outputs?: Array<{ name: string; path: string; kind: string }> | undefined;
  steeringRefs?: string[] | undefined;
}

export class LoadError extends Error {
  constructor(
    message: string,
    public readonly diagnostics: Diagnostic[],
  ) {
    super(message);
    this.name = "LoadError";
  }
}

export interface LoadResult {
  programs: LoadedProgram[];
  diagnostics: Diagnostic[];
}

/**
 * Options influencing the loader's cross-file checks. All default to `true`
 * so existing callers see no behavior change.
 */
export interface LoadOptions {
  /**
   * When `true` (default), after successful program loading the portability
   * linter is invoked over each root that carries a `.portability.yaml` file.
   * When the file is missing, no scan runs and no diagnostics are emitted —
   * the linter is opt-in per-repo.
   *
   * @see Requirement 9.3
   */
  checkPortability?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Schema compilation (lazy singleton)                                */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ajv: any = null;
let _validateProgram: ValidateFunction | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAjv(): any {
  if (_ajv) return _ajv;
  _ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(_ajv);
  return _ajv;
}

function loadSchemaFile(schemasDir: string, name: string): Record<string, unknown> {
  const raw = readFileSync(resolve(schemasDir, name), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function getProgramValidator(schemasDir: string): ValidateFunction {
  if (_validateProgram) return _validateProgram;
  const ajv = getAjv();
  _validateProgram = ajv.compile(loadSchemaFile(schemasDir, "program.schema.json"));
  return _validateProgram as ValidateFunction;
}


/* ------------------------------------------------------------------ */
/*  Frontmatter parser                                                 */
/* ------------------------------------------------------------------ */

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content };
  }
  const meta = parseYaml(match[1]!) as Record<string, unknown>;
  return { meta, body: match[2]! };
}

/* ------------------------------------------------------------------ */
/*  Cycle detection                                                    */
/* ------------------------------------------------------------------ */

function detectCycles(programs: LoadedProgram[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const p of programs) {
    graph.set(p.id, p.dependsOn ?? []);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of graph.get(node) ?? []) {
      dfs(dep, path);
    }

    path.pop();
    inStack.delete(node);
  }

  for (const id of graph.keys()) {
    dfs(id, []);
  }

  return cycles;
}

/* ------------------------------------------------------------------ */
/*  Core loader                                                        */
/* ------------------------------------------------------------------ */

/** Reset cached validators (useful in tests). */
export function resetValidators(): void {
  _ajv = null;
  _validateProgram = null;
}

/**
 * Load all programs from the given root directory.
 *
 * @param root - Path to the directory containing program subdirectories
 *               (e.g. `./programs`).
 * @param schemasDir - Path to the directory containing JSON Schema files.
 * @param options - Optional cross-file check toggles (see {@link LoadOptions}).
 * @returns LoadResult with programs and diagnostics.
 * @throws LoadError if any fatal diagnostics are found.
 */
export function loadAll(
  root: string,
  schemasDir: string,
  options: LoadOptions = {},
): LoadResult {
  return loadAllFromRoots([root], schemasDir, options);
}

/**
 * Load all programs from `root` plus any additional directories listed in the
 * `FDE_PROGRAMS_PATH` environment variable.
 *
 * `FDE_PROGRAMS_PATH` is split on the OS path separator (`path.delimiter`).
 * Empty entries are ignored. When the variable is unset or empty, behavior is
 * identical to {@link loadAll}. The primary `root` is always included.
 *
 * Program `id` uniqueness is enforced across the merged set; duplicates
 * across directories produce the same diagnostic format as intra-root
 * duplicates (listing every offending manifest path).
 *
 * @param root - Primary path to the directory containing program subdirectories.
 * @param schemasDir - Path to the directory containing JSON Schema files.
 * @param env - Environment record (defaults to `process.env`); used to read
 *              `FDE_PROGRAMS_PATH`.
 * @returns LoadResult with the merged programs and diagnostics.
 * @throws LoadError if any fatal diagnostics are found.
 *
 * @see Requirement 5.8
 */
export function loadAllWithEnv(
  root: string,
  schemasDir: string,
  env: NodeJS.ProcessEnv = process.env,
  options: LoadOptions = {},
): LoadResult {
  const extra = parseProgramsPath(env.FDE_PROGRAMS_PATH);
  // Primary root first, then every distinct extra directory. Deduplicate on
  // resolved absolute paths so the same directory listed twice doesn't trigger
  // spurious id-collision reports.
  const seen = new Set<string>();
  const roots: string[] = [];
  for (const r of [root, ...extra]) {
    const abs = resolve(r);
    if (seen.has(abs)) continue;
    seen.add(abs);
    roots.push(r);
  }
  return loadAllFromRoots(roots, schemasDir, options);
}

/**
 * Split an `FDE_PROGRAMS_PATH` string on the OS path separator. Empty
 * entries (produced by leading/trailing/duplicated separators) are discarded.
 */
function parseProgramsPath(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(pathDelimiter)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Internal: load programs from one or more root directories and run all
 * cross-file validations over the merged set.
 */
function loadAllFromRoots(
  roots: string[],
  schemasDir: string,
  options: LoadOptions = {},
): LoadResult {
  resetValidators();

  const diagnostics: Diagnostic[] = [];
  const programs: LoadedProgram[] = [];

  // Discover program directories across every root, preserving order.
  const programDirs: string[] = [];
  for (const root of roots) {
    programDirs.push(...discoverProgramDirs(root));
  }

  // Phase 1: Parse and schema-validate each program.yaml
  for (const dir of programDirs) {
    const manifestPath = join(dir, "program.yaml");
    if (!existsSync(manifestPath)) continue;

    let raw: string;
    try {
      raw = readFileSync(manifestPath, "utf-8");
    } catch {
      diagnostics.push({
        severity: "error",
        message: `Cannot read manifest file`,
        file: manifestPath,
      });
      continue;
    }

    let manifest: Record<string, unknown>;
    try {
      manifest = parseYaml(raw) as Record<string, unknown>;
    } catch (e) {
      diagnostics.push({
        severity: "error",
        message: `Invalid YAML: ${(e as Error).message}`,
        file: manifestPath,
      });
      continue;
    }

    // Schema validation
    const validate = getProgramValidator(schemasDir);
    const valid = validate(manifest);
    if (!valid) {
      for (const err of validate.errors ?? []) {
        diagnostics.push({
          severity: "error",
          message: formatAjvError(err),
          file: manifestPath,
          field: (err.instancePath || err.params?.missingProperty as string) ?? undefined,
        });
      }
      continue;
    }

    programs.push({
      ...(manifest as unknown as Omit<LoadedProgram, "_dir" | "_manifestPath">),
      references: (manifest as Record<string, unknown>).references as string[] ?? [],
      _dir: dir,
      _manifestPath: manifestPath,
    });
  }

  // Phase 2: Check id uniqueness
  const idMap = new Map<string, string[]>();
  for (const p of programs) {
    const existing = idMap.get(p.id) ?? [];
    existing.push(p._manifestPath);
    idMap.set(p.id, existing);
  }
  for (const [id, paths] of idMap) {
    if (paths.length > 1) {
      diagnostics.push({
        severity: "error",
        message: `Duplicate program id '${id}' found in: ${paths.join(", ")}`,
        field: "id",
      });
    }
  }

  // Phase 3: Validate file references
  for (const p of programs) {
    const refFields = ["skills", "steering", "templates", "playbooks", "references"] as const;
    for (const field of refFields) {
      const refs = p[field] as string[];
      for (const ref of refs) {
        const fullPath = resolve(p._dir, ref);
        if (!existsSync(fullPath)) {
          diagnostics.push({
            severity: "error",
            message: `Referenced ${field.slice(0, -1)} file does not exist: ${ref}`,
            file: p._manifestPath,
            field,
          });
        }
      }
    }
  }

  // Phase 4: Validate steering files (auto inclusion requires match)
  for (const p of programs) {
    for (const steeringRef of p.steering) {
      const fullPath = resolve(p._dir, steeringRef);
      if (!existsSync(fullPath)) continue;

      try {
        const content = readFileSync(fullPath, "utf-8");
        const { meta } = parseFrontmatter(content);

        if (meta.inclusion === "auto" && !meta.match) {
          diagnostics.push({
            severity: "error",
            message: `Steering file with inclusion 'auto' requires a 'match' glob pattern`,
            file: fullPath,
            field: "match",
          });
        }
      } catch {
        // File read errors already caught in phase 3
      }
    }
  }

  // Phase 5: Detect dependency cycles
  const cycles = detectCycles(programs);
  for (const cycle of cycles) {
    diagnostics.push({
      severity: "error",
      message: `Dependency cycle detected: ${cycle.join(" → ")}`,
      field: "dependsOn",
    });
  }

  // Phase 6: Validate applicability[].when expressions
  for (const p of programs) {
    for (let i = 0; i < p.applicability.length; i++) {
      const rule = p.applicability[i]!;
      try {
        parseExpression(rule.when);
      } catch (e) {
        if (e instanceof ExpressionSyntaxError) {
          diagnostics.push({
            severity: "error",
            message: `Invalid 'when' expression: ${e.message}`,
            file: p._manifestPath,
            field: `applicability[${i}].when`,
            line: e.line,
            column: e.column,
          });
        } else {
          diagnostics.push({
            severity: "error",
            message: `Invalid 'when' expression: ${(e as Error).message}`,
            file: p._manifestPath,
            field: `applicability[${i}].when`,
          });
        }
      }
    }
  }

  // Phase 7: Content-portability linter.
  //
  // For every root that carries a `.portability.yaml` disallow list, scan
  // each loaded program's directory. When the list is missing the scanner
  // returns an empty array (opt-in per-repo behavior; no error).
  //
  // @see Requirement 9.3
  const checkPortability = options.checkPortability ?? true;
  if (checkPortability) {
    for (const root of roots) {
      const absRoot = resolve(root);
      for (const p of programs) {
        if (!p._dir.startsWith(absRoot)) continue;
        const findings = scanForPortabilityViolations(p._dir, join(absRoot, ".portability.yaml"));
        for (const f of findings) {
          diagnostics.push({
            severity: "error",
            message: `Disallowed customer-specific term '${f.term}' (rule: ${f.rule}) — programs must use generic placeholders`,
            file: f.filePath,
            line: f.line,
            field: "portability",
          });
        }
      }
    }
  }

  // If there are any error-level diagnostics, throw
  const errors = diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) {
    throw new LoadError(
      `Program loading failed with ${errors.length} error(s)`,
      diagnostics,
    );
  }

  return { programs, diagnostics };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function discoverProgramDirs(root: string): string[] {
  if (!existsSync(root)) return [];

  const dirs: string[] = [];
  try {
    const entries = readdirSync(root);
    for (const entry of entries) {
      const full = resolve(root, entry);
      try {
        if (statSync(full).isDirectory()) {
          dirs.push(full);
        }
      } catch {
        // skip unreadable entries
      }
    }
  } catch {
    // root not readable
  }
  return dirs;
}

function formatAjvError(err: ErrorObject): string {
  const path = err.instancePath || "(root)";
  if (err.keyword === "required") {
    return `Missing required field '${err.params?.missingProperty}' at ${path}`;
  }
  if (err.keyword === "pattern") {
    return `Field ${path} does not match pattern: ${err.params?.pattern}`;
  }
  if (err.keyword === "enum") {
    return `Field ${path} must be one of: ${(err.params?.allowedValues as string[])?.join(", ")}`;
  }
  return `Validation error at ${path}: ${err.message}`;
}

/* ------------------------------------------------------------------ */
/*  Canonical YAML printer                                             */
/* ------------------------------------------------------------------ */

/**
 * Emit a canonical YAML representation of a manifest/skill/steering value.
 * Key ordering is stable and normalized.
 */
export function printYaml(value: Record<string, unknown>): string {
  return stringifyYaml(value, { sortMapEntries: false });
}

/**
 * Parse a YAML string into a plain object.
 */
export function parseManifestYaml(raw: string): Record<string, unknown> {
  return parseYaml(raw) as Record<string, unknown>;
}
