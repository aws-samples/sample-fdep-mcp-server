/**
 * Lens loader — parses and validates `lens.yaml` manifests, enforces id
 * uniqueness and cross-reference integrity, and pre-validates every
 * activation expression via the restricted DSL parser.
 *
 * The loader returns a `LoadedLens[]` compatible with the resolver's
 * `ResolveInput.lenses` shape. Diagnostic handling mirrors the program
 * loader: fatal errors throw `LoadError`; warnings are collected in the
 * result.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import AjvMod, { type ValidateFunction, type ErrorObject } from "ajv/dist/2020.js";
import addFormatsMod from "ajv-formats";
import { parse as parseExpression, ExpressionSyntaxError } from "../expression/index.js";
import { LoadError, type Diagnostic, type LoadedProgram } from "./index.js";
import type { LoadedLens } from "../resolver/types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv2020: any = (AjvMod as unknown as { default?: unknown }).default ?? AjvMod;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats: any = (addFormatsMod as unknown as { default?: unknown }).default ?? addFormatsMod;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ajv: any = null;
let _validate: ValidateFunction | null = null;

function getValidator(schemasDir: string): ValidateFunction {
  if (_validate) return _validate;
  _ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(_ajv);
  // Register program schema first so lens.schema.json can $ref it.
  const programSchema = JSON.parse(
    readFileSync(resolve(schemasDir, "program.schema.json"), "utf-8"),
  ) as Record<string, unknown>;
  _ajv.addSchema(programSchema);
  const schema = JSON.parse(
    readFileSync(resolve(schemasDir, "lens.schema.json"), "utf-8"),
  ) as Record<string, unknown>;
  _validate = _ajv.compile(schema);
  return _validate as ValidateFunction;
}

/** Reset the cached validator (test hook). */
export function resetLensValidator(): void {
  _ajv = null;
  _validate = null;
}

export interface LoadLensesResult {
  readonly lenses: LoadedLens[];
  readonly diagnostics: Diagnostic[];
}

/**
 * Load every lens from a root directory of the shape:
 *
 *   lenses/
 *     financial-services-lens/
 *       lens.yaml
 *       steering/ (referenced files)
 *       skills/ (referenced files)
 *
 * @param root - Root directory containing lens subdirectories.
 * @param schemasDir - Directory containing lens.schema.json.
 * @param programs - The already-loaded program catalog (used to validate
 *                   that every overlay `targetProgram` references a known
 *                   program id).
 * @returns LoadLensesResult with lenses and diagnostics.
 * @throws LoadError when any error-level diagnostic is present.
 */
export function loadLenses(
  root: string,
  schemasDir: string,
  programs: readonly LoadedProgram[],
): LoadLensesResult {
  resetLensValidator();

  const diagnostics: Diagnostic[] = [];
  const lenses: LoadedLens[] = [];
  const programIds = new Set(programs.map((p) => p.id));

  if (!existsSync(root)) {
    return { lenses, diagnostics };
  }

  const dirs = discoverLensDirs(root);

  // Phase 1 — parse + schema validate each lens.yaml.
  for (const dir of dirs) {
    const manifestPath = join(dir, "lens.yaml");
    if (!existsSync(manifestPath)) continue;

    let raw: string;
    try {
      raw = readFileSync(manifestPath, "utf-8");
    } catch {
      diagnostics.push({
        severity: "error",
        message: "Cannot read lens manifest",
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

    const validate = getValidator(schemasDir);
    const valid = validate(manifest);
    if (!valid) {
      for (const err of validate.errors ?? []) {
        const field = err.instancePath || (err.params?.missingProperty as string | undefined);
        diagnostics.push({
          severity: "error",
          message: formatAjvError(err),
          file: manifestPath,
          ...(field !== undefined ? { field } : {}),
        });
      }
      continue;
    }

    lenses.push({
      ...(manifest as unknown as Omit<LoadedLens, "_dir" | "_manifestPath">),
      _dir: dir,
      _manifestPath: manifestPath,
    } as LoadedLens);
  }

  // Phase 2 — id uniqueness.
  const idSeen = new Map<string, string[]>();
  for (const lens of lenses) {
    const existing = idSeen.get(lens.id) ?? [];
    existing.push(lens._manifestPath);
    idSeen.set(lens.id, existing);
  }
  for (const [id, paths] of idSeen) {
    if (paths.length > 1) {
      diagnostics.push({
        severity: "error",
        message: `Duplicate lens id '${id}' in: ${paths.join(", ")}`,
        field: "id",
      });
    }
  }

  // Phase 3 — validate overlay references and activation DSL expressions.
  for (const lens of lenses) {
    for (let i = 0; i < lens.overlays.length; i++) {
      const overlay = lens.overlays[i]!;
      if (!programIds.has(overlay.targetProgram)) {
        diagnostics.push({
          severity: "error",
          message: `Lens '${lens.id}' overlay[${i}] targets unknown program '${overlay.targetProgram}'`,
          file: lens._manifestPath,
          field: `overlays[${i}].targetProgram`,
        });
      }

      for (const ref of overlay.addSteering ?? []) {
        const abs = resolve(lens._dir, ref);
        if (!existsSync(abs)) {
          diagnostics.push({
            severity: "error",
            message: `Lens '${lens.id}' overlay addSteering file does not exist: ${ref}`,
            file: lens._manifestPath,
            field: `overlays[${i}].addSteering`,
          });
        }
      }
      for (const ref of overlay.addSkills ?? []) {
        const abs = resolve(lens._dir, ref);
        if (!existsSync(abs)) {
          diagnostics.push({
            severity: "error",
            message: `Lens '${lens.id}' overlay addSkills file does not exist: ${ref}`,
            file: lens._manifestPath,
            field: `overlays[${i}].addSkills`,
          });
        }
      }
    }

    for (let i = 0; i < lens.activation.rules.length; i++) {
      const rule = lens.activation.rules[i]!;
      try {
        parseExpression(rule.when);
      } catch (e) {
        if (e instanceof ExpressionSyntaxError) {
          diagnostics.push({
            severity: "error",
            message: `Lens '${lens.id}' activation rule[${i}] has invalid DSL: ${e.message}`,
            file: lens._manifestPath,
            field: `activation.rules[${i}].when`,
            line: e.line,
            column: e.column,
          });
        } else {
          diagnostics.push({
            severity: "error",
            message: `Lens '${lens.id}' activation rule[${i}] error: ${(e as Error).message}`,
            file: lens._manifestPath,
            field: `activation.rules[${i}].when`,
          });
        }
      }
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) {
    throw new LoadError(
      `Lens loading failed with ${errors.length} error(s)`,
      diagnostics,
    );
  }

  return { lenses, diagnostics };
}

function discoverLensDirs(root: string): string[] {
  const entries = readdirSync(root);
  const dirs: string[] = [];
  for (const entry of entries) {
    const abs = resolve(root, entry);
    try {
      if (statSync(abs).isDirectory()) dirs.push(abs);
    } catch {
      /* ignore unreadable entries */
    }
  }
  return dirs;
}

function formatAjvError(err: ErrorObject): string {
  const path = err.instancePath || "(root)";
  if (err.keyword === "required") {
    return `missing required field '${err.params?.missingProperty}' at ${path}`;
  }
  if (err.keyword === "pattern") {
    return `field ${path} does not match pattern ${err.params?.pattern}`;
  }
  if (err.keyword === "enum") {
    return `field ${path} must be one of: ${(err.params?.allowedValues as string[])?.join(", ")}`;
  }
  if (err.keyword === "additionalProperties") {
    return `unknown property '${err.params?.additionalProperty}' at ${path}`;
  }
  return `validation error at ${path}: ${err.message}`;
}
