/**
 * Content-portability linter — rejects programs that hard-code customer
 * names that would break portability of the kit.
 *
 * Covers: Requirement 9.3 (reject any program whose markdown or manifest
 * content contains customer-specific names declared disallowed).
 *
 * Design notes:
 *   - Opt-in: when no `.portability.yaml` exists at `programsRoot`, the
 *     scanner returns an empty findings list (never throws).
 *   - Matches are case-insensitive and anchored on `\b` word boundaries so
 *     `Acmescope` does NOT match a rule `Acme`.
 *   - Only scans `.md`, `.yaml`, and `.yml` files — the content authoring
 *     surface. Source code under a program directory is out of scope.
 */

import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, extname, basename } from "node:path";
import { parse as parseYaml } from "yaml";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface PortabilityFinding {
  filePath: string;
  line: number;
  /** The disallowed term as it appeared in the file (original case). */
  term: string;
  /** The rule name — i.e. the disallowed term as declared in the YAML. */
  rule: string;
}

/**
 * Load-time diagnostic shape emitted by the lens portability scanner.
 *
 * This is the shape consumed by the lens loader (task 5.2) so that
 * portability violations surface alongside schema and id diagnostics.
 */
export interface PortabilityDiagnostic {
  severity: "error";
  /** File path where the violation was found. */
  path: string;
  /** The disallowed-term rule that matched. */
  pattern: string;
  /** Human-readable diagnostic message. */
  message: string;
}

interface DisallowList {
  disallowed: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set([".md", ".yaml", ".yml"]);

const SKIP_DIR_SEGMENTS: ReadonlySet<string> = new Set([
  ".git",
  "node_modules",
  "dist",
  "__snapshots__",
  ".fde-conflict",
]);

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Scan `programsRoot` (or a single program directory) recursively for
 * disallowed customer-specific terms declared in
 * `programsRoot/.portability.yaml` (or an explicit disallow list path).
 *
 * @param programsRoot - Directory to scan. Typically the repo's `programs/`
 *                       directory, but may be any subtree (e.g. one program).
 * @param disallowListPath - Optional explicit path to a disallow-list YAML.
 *                           Defaults to `<programsRoot>/.portability.yaml`.
 * @returns Array of findings. Empty when the disallow list is missing or
 *          empty (the linter is opt-in per-repo).
 *
 * @see Requirement 9.3
 */
export function scanForPortabilityViolations(
  programsRoot: string,
  disallowListPath?: string,
): PortabilityFinding[] {
  const listPath = disallowListPath ?? join(programsRoot, ".portability.yaml");
  const disallowed = loadDisallowList(listPath);
  if (disallowed.length === 0) return [];

  // Build one case-insensitive regex per disallowed term with word boundaries.
  const rules: Rule[] = disallowed.map((term) => ({
    name: term,
  }));

  const findings: PortabilityFinding[] = [];
  walkPath(resolve(programsRoot), rules, findings);
  return findings;
}

/* ------------------------------------------------------------------ */
/*  Lens portability scanning                                          */
/* ------------------------------------------------------------------ */

/**
 * Scan a lenses root (or a list of individual lens directories) for
 * disallowed customer-specific terms, emitting load-time diagnostics
 * one per violation.
 *
 * The scanner reuses the same disallow-list semantics as programs:
 *   - opt-in per repo via a `.portability.yaml` file
 *   - case-insensitive, word-boundary matching
 *   - scans `.md`, `.yaml`, `.yml` only
 *
 * Disallow-list resolution order:
 *   1. `disallowListPath` when provided
 *   2. `<lensesRoot>/.portability.yaml` when `lensesRoot` is a single directory
 *   3. When `lensesRoot` is an array, the common parent directory's
 *      `.portability.yaml` is probed; missing lists yield an empty
 *      diagnostic array (never throws).
 *
 * @param lensesRoot Either a directory holding many lenses (typically
 *                   `./lenses`) or an explicit list of lens directories.
 * @param disallowListPath Optional explicit path to the disallow-list YAML.
 * @returns One diagnostic per violation; empty when the disallow list is
 *          missing, empty, or no violations are found.
 *
 * @see Requirement 10.1, 10.3, 10.4
 */
export function scanLensesForPortability(
  lensesRoot: string | readonly string[],
  disallowListPath?: string,
): PortabilityDiagnostic[] {
  const lensDirs = Array.isArray(lensesRoot)
    ? (lensesRoot as readonly string[]).map((d) => resolve(d))
    : collectLensDirs(resolve(lensesRoot as string));

  // Resolve the disallow list. Prefer explicit path; else fall back to the
  // conventional `.portability.yaml` at the lenses root (when given as a
  // single directory), else try each lens directory's parent once.
  let listPath = disallowListPath;
  if (!listPath) {
    if (typeof lensesRoot === "string") {
      listPath = join(resolve(lensesRoot), ".portability.yaml");
    } else if (lensDirs.length > 0) {
      // Array form: walk up one level from the first lens dir and probe.
      const parent = resolve(lensDirs[0]!, "..");
      listPath = join(parent, ".portability.yaml");
    }
  }

  const diagnostics: PortabilityDiagnostic[] = [];
  for (const dir of lensDirs) {
    const findings = scanForPortabilityViolations(dir, listPath);
    for (const f of findings) {
      diagnostics.push({
        severity: "error",
        path: f.filePath,
        pattern: f.rule,
        message: `Disallowed customer-specific term '${f.term}' (rule: ${f.rule}) — lenses must use generic placeholders`,
      });
    }
  }
  return diagnostics;
}

/**
 * Expand a lenses root directory into the list of individual lens
 * directories contained in it. Each immediate child directory that is not
 * in `SKIP_DIR_SEGMENTS` is treated as one lens.
 */
function collectLensDirs(absLensesRoot: string): string[] {
  let st: ReturnType<typeof statSync>;
  try {
    st = statSync(absLensesRoot);
  } catch {
    return [];
  }
  if (!st.isDirectory()) return [];

  let entries: string[];
  try {
    entries = readdirSync(absLensesRoot);
  } catch {
    return [];
  }
  entries.sort();

  const dirs: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIR_SEGMENTS.has(entry)) continue;
    const abs = join(absLensesRoot, entry);
    try {
      if (statSync(abs).isDirectory()) dirs.push(abs);
    } catch {
      /* ignore */
    }
  }
  return dirs;
}

/* ------------------------------------------------------------------ */
/*  Disallow list parsing                                              */
/* ------------------------------------------------------------------ */

function loadDisallowList(path: string): string[] {
  if (!existsSync(path)) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return [];
  }
  let parsed: DisallowList;
  try {
    parsed = parseYaml(raw) as DisallowList;
  } catch {
    return [];
  }
  if (!parsed || !Array.isArray(parsed.disallowed)) return [];
  return parsed.disallowed
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Check whether a character is a word character (alphanumeric or underscore).
 */
function isWordChar(c: number): boolean {
  return (
    (c >= 48 && c <= 57) ||  // 0-9
    (c >= 65 && c <= 90) ||  // A-Z
    (c >= 97 && c <= 122) || // a-z
    c === 95                  // _
  );
}

/**
 * Find all case-insensitive word-boundary matches of `term` in `text`.
 * Returns the start indices of each match. Avoids dynamic RegExp construction
 * to satisfy static analysis (detect-non-literal-regexp).
 */
function findTermOccurrences(text: string, term: string): number[] {
  const results: number[] = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let pos = 0;
  while (pos <= lowerText.length - lowerTerm.length) {
    const idx = lowerText.indexOf(lowerTerm, pos);
    if (idx === -1) break;
    // Check word boundaries
    const before = idx > 0 ? lowerText.charCodeAt(idx - 1) : 32;
    const after = idx + lowerTerm.length < lowerText.length ? lowerText.charCodeAt(idx + lowerTerm.length) : 32;
    if (!isWordChar(before) && !isWordChar(after)) {
      results.push(idx);
    }
    pos = idx + 1;
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  Walker                                                             */
/* ------------------------------------------------------------------ */

interface Rule {
  name: string;
}

function walkPath(
  absPath: string,
  rules: Rule[],
  findings: PortabilityFinding[],
): void {
  let st: ReturnType<typeof statSync>;
  try {
    st = statSync(absPath);
  } catch {
    return;
  }

  if (st.isDirectory()) {
    const name = basename(absPath);
    if (SKIP_DIR_SEGMENTS.has(name)) return;

    let entries: string[];
    try {
      entries = readdirSync(absPath);
    } catch {
      return;
    }
    // Deterministic order for stable diagnostics.
    entries.sort();
    for (const entry of entries) {
      walkPath(join(absPath, entry), rules, findings);
    }
    return;
  }

  if (!st.isFile()) return;

  const ext = extname(absPath).toLowerCase();
  if (!SCANNABLE_EXTENSIONS.has(ext)) return;
  // Ignore the disallow-list file itself, so its own entries don't get
  // flagged.
  if (basename(absPath) === ".portability.yaml") return;

  scanFile(absPath, rules, findings);
}

function scanFile(
  filePath: string,
  rules: Rule[],
  findings: PortabilityFinding[],
): void {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const rule of rules) {
      const occurrences = findTermOccurrences(line, rule.name);
      for (const idx of occurrences) {
        findings.push({
          filePath,
          line: i + 1,
          term: line.slice(idx, idx + rule.name.length),
          rule: rule.name,
        });
      }
    }
  }
}
