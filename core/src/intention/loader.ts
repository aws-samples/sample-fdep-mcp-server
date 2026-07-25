/**
 * Intention file loader — reads YAML or JSON from disk, validates against
 * `schemas/intention.schema.json`, infers `regulated` from `industry`
 * when unset, and returns a typed Intention.
 *
 * Throws {@link IntentionValidationError} on schema violations with a
 * list of per-field diagnostics. No partial writes or side effects
 * beyond reading the file.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import AjvMod, { type ValidateFunction, type ErrorObject } from "ajv/dist/2020.js";
import addFormatsMod from "ajv-formats";
import {
  IntentionValidationError,
  isRegulatedIndustry,
  type Intention,
  type IntentionDiagnostic,
} from "./types.js";

// Same CJS-interop shape the program loader uses (see loader/index.ts).
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
  const schema = JSON.parse(
    readFileSync(resolve(schemasDir, "intention.schema.json"), "utf-8"),
  ) as Record<string, unknown>;
  _validate = _ajv.compile(schema);
  return _validate as ValidateFunction;
}

/** Reset cached validator (used by tests). */
export function resetIntentionValidator(): void {
  _ajv = null;
  _validate = null;
}

/**
 * Parse and validate an intention file.
 *
 * @param path - Path to an intention `.yaml` / `.yml` / `.json` file.
 * @param schemasDir - Path to the directory containing intention.schema.json.
 * @returns A validated, type-checked Intention. `regulated` is inferred
 *          from `industry` when unset and the industry is in
 *          `REGULATED_INDUSTRIES`.
 * @throws IntentionValidationError on any validation failure.
 */
export function loadIntention(path: string, schemasDir: string): Intention {
  const raw = readFileSync(path, "utf-8");
  const data = path.endsWith(".json")
    ? (JSON.parse(raw) as unknown)
    : (parseYaml(raw) as unknown);

  return validateIntention(data, schemasDir, path);
}

/**
 * Validate an already-parsed intention object without reading from disk.
 * Useful for the MCP `fde_load_intention` tool which receives JSON
 * directly from the agent.
 */
export function validateIntention(
  data: unknown,
  schemasDir: string,
  sourcePath?: string,
): Intention {
  const validate = getValidator(schemasDir);
  const valid = validate(data);
  if (!valid) {
    const diagnostics: IntentionDiagnostic[] = (validate.errors ?? []).map(
      (err) => toDiagnostic(err, sourcePath),
    );
    throw new IntentionValidationError(
      `Intention validation failed with ${diagnostics.length} error(s)`,
      diagnostics,
    );
  }

  const intention = data as Intention;

  // Post-validation: infer regulated when absent.
  if (intention.regulated === undefined && isRegulatedIndustry(intention.industry)) {
    return { ...intention, regulated: true };
  }
  return intention;
}

function toDiagnostic(err: ErrorObject, file?: string): IntentionDiagnostic {
  const fieldPath = err.instancePath || "/";
  const missing = err.params?.missingProperty as string | undefined;
  const field = missing ? `${fieldPath === "/" ? "" : fieldPath}/${missing}` : fieldPath;
  return {
    severity: "error",
    ...(file !== undefined ? { file } : {}),
    field,
    message: formatAjvMessage(err),
  };
}

function formatAjvMessage(err: ErrorObject): string {
  if (err.keyword === "required") {
    return `missing required property '${err.params?.missingProperty}'`;
  }
  if (err.keyword === "enum") {
    const allowed = (err.params?.allowedValues as string[]) ?? [];
    return `must be one of: ${allowed.join(", ")}`;
  }
  if (err.keyword === "pattern") {
    return `does not match pattern ${err.params?.pattern}`;
  }
  if (err.keyword === "additionalProperties") {
    return `unknown property '${err.params?.additionalProperty}'`;
  }
  if (err.keyword === "const") {
    return `must equal ${JSON.stringify(err.params?.allowedValue)}`;
  }
  return err.message ?? "validation error";
}
