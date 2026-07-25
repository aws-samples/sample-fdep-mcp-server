/**
 * Secrets scanner — gitleaks-style regex scanner used by `npm run scan:secrets`
 * and the CI workflow to reject commits containing credentials.
 *
 * Covers: Requirement 9.2 (secrets scanner reports file path and match type).
 *
 * Design notes:
 *   - Pure, synchronous, zero dependencies (just node:fs + node:path).
 *   - Walks any number of file or directory paths.
 *   - For every text file, scans line-by-line against the RULES table below.
 *   - Common binary extensions and noise directories are skipped by default.
 *   - Callers may pass an `opts.ignore` predicate for test-time customization.
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, join, extname, basename, sep } from "node:path";
import { parse as parseYaml } from "yaml";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface SecretFinding {
  /** Absolute or caller-relative path to the file containing the match. */
  filePath: string;
  /** 1-indexed line number. */
  line: number;
  /** Name of the rule that matched (from {@link RULES}). */
  rule: string;
  /** Truncated snippet of the matching line (≤ 120 chars). */
  snippet: string;
}

export interface ScanOptions {
  /**
   * Optional predicate called with every absolute path (file or directory)
   * before it is inspected. Returning `true` skips the path entirely.
   * Intended for test-time isolation.
   */
  ignore?: (path: string) => boolean;
}

/* ------------------------------------------------------------------ */
/*  Rule table                                                         */
/* ------------------------------------------------------------------ */

interface Rule {
  name: string;
  pattern: RegExp;
}

/**
 * Gitleaks-style rules. Each entry is a named regex. Patterns are constructed
 * conservatively to favor high signal over exhaustive coverage — false
 * negatives are preferable to false positives in a repo-wide pre-commit
 * check.
 */
const RULES: readonly Rule[] = [
  {
    name: "aws-access-key",
    pattern: /\b(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: "aws-secret-key",
    // e.g. `aws_secret_access_key = "abc...40chars..."`
    pattern:
      /\baws(?:.{0,20})?(?:secret|private)[_-]?access[_-]?key(?:.{0,20})?['"\s:=]+[A-Za-z0-9/+=]{40}\b/gi,
  },
  {
    name: "generic-api-key",
    pattern: /\bapi[_-]?key['"\s:=]+[A-Za-z0-9_\-]{20,}\b/gi,
  },
  {
    name: "github-pat",
    pattern: /\bghp_[A-Za-z0-9]{36}\b/g,
  },
  {
    name: "github-pat",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g,
  },
  {
    name: "slack-token",
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    name: "private-key-block",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    name: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
];

/* ------------------------------------------------------------------ */
/*  Skip lists                                                         */
/* ------------------------------------------------------------------ */

const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".mp4",
  ".mov",
  ".pyc",
  ".class",
  ".ico",
  ".bmp",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".so",
  ".dll",
  ".exe",
]);

/**
 * Path segments (exactly one of these as a directory name, anywhere in the
 * path) that cause the scanner to skip the subtree. Matches on the
 * `path.sep`-split segments so the test is platform-agnostic.
 */
const SKIP_DIR_SEGMENTS: ReadonlySet<string> = new Set([
  ".git",
  "node_modules",
  "dist",
  "__snapshots__",
  ".fde-conflict",
  "engagements",
]);

/**
 * Multi-segment path suffixes to skip (e.g. `core/dist`). Checked after
 * the single-segment SKIP_DIR_SEGMENTS list.
 */
const SKIP_SUBPATHS: readonly string[] = [
  join("core", "dist"),
  join("core", "test", "__snapshots__"),
];

function shouldSkipPath(absPath: string): boolean {
  const segments = absPath.split(sep);
  for (const seg of segments) {
    if (SKIP_DIR_SEGMENTS.has(seg)) return true;
  }
  for (const sub of SKIP_SUBPATHS) {
    if (absPath.includes(sep + sub) || absPath.endsWith(sep + sub)) return true;
  }
  return false;
}

function isBinaryFile(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Scan the given file and directory paths for secrets. Directories are
 * recursed into. Results are returned in discovery order (stable per input).
 *
 * @param paths - Files or directories to scan. Relative paths are resolved
 *                against `process.cwd()`.
 * @param opts - Optional configuration; see {@link ScanOptions}.
 * @returns Array of {@link SecretFinding}, one per match.
 */
export function scanForSecrets(
  paths: string[],
  opts: ScanOptions = {},
): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const ignore = opts.ignore;

  for (const p of paths) {
    const abs = resolve(p);
    if (shouldSkipPath(abs)) continue;
    if (ignore && ignore(abs)) continue;
    walkPath(abs, ignore, findings);
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Walker                                                             */
/* ------------------------------------------------------------------ */

function walkPath(
  absPath: string,
  ignore: ((p: string) => boolean) | undefined,
  findings: SecretFinding[],
): void {
  let st: ReturnType<typeof statSync>;
  try {
    st = statSync(absPath);
  } catch {
    return; // path disappeared or is unreadable — skip
  }

  if (st.isDirectory()) {
    // Skip well-known noise directories on entry so we don't recurse.
    const name = basename(absPath);
    if (SKIP_DIR_SEGMENTS.has(name)) return;

    let entries: string[];
    try {
      entries = readdirSync(absPath);
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = join(absPath, entry);
      if (shouldSkipPath(child)) continue;
      if (ignore && ignore(child)) continue;
      walkPath(child, ignore, findings);
    }
    return;
  }

  if (!st.isFile()) return;
  if (isBinaryFile(absPath)) return;
  if (ignore && ignore(absPath)) return;

  scanFile(absPath, findings);
}

/* ------------------------------------------------------------------ */
/*  File scanner                                                       */
/* ------------------------------------------------------------------ */

/**
 * Scan a single file line-by-line against every rule. Exported for tests that
 * want to bypass directory discovery.
 */
export function scanFile(filePath: string, findings: SecretFinding[]): void {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  // Heuristic: if the file is "large and binary-like" (lots of NUL bytes),
  // skip it. Protects against accidentally reading a mis-extensioned binary.
  if (content.includes("\u0000")) return;

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        findings.push({
          filePath,
          line: i + 1,
          rule: rule.name,
          snippet: truncateSnippet(line, match.index),
        });
        // Guard against zero-width matches creating an infinite loop.
        if (match.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
      }
    }
  }
}

/**
 * Return a ≤ 120-char window of `line` centered on `matchIndex`, with an
 * ellipsis marker when either side was clipped.
 */
function truncateSnippet(line: string, matchIndex: number): string {
  const MAX = 120;
  if (line.length <= MAX) return line;

  const pad = Math.max(10, Math.floor((MAX - 20) / 2));
  const start = Math.max(0, matchIndex - pad);
  const end = Math.min(line.length, matchIndex + pad);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < line.length ? "…" : "";
  return prefix + line.slice(start, end) + suffix;
}

/* ------------------------------------------------------------------ */
/*  Intention-file scanner                                             */
/*                                                                     */
/*  Task 22.2: a structured pre-check-in scanner for intention YAML or */
/*  JSON files. Parses the document, walks every string leaf in the    */
/*  tree (including nested objects and arrays), and runs every RULE    */
/*  pattern against each string. Returns the same rule vocabulary      */
/*  used by the file scanner above, extended with the JSON-pointer     */
/*  `field` locating the offending leaf.                               */
/*                                                                     */
/*  Covers: Requirements 10.2, 10.4 — secrets scanner reports field    */
/*  path and match type on intention files before they are committed.  */
/* ------------------------------------------------------------------ */

/**
 * A single secret-like match located inside an intention document.
 *
 * Shape mirrors {@link SecretFinding} (same `rule` vocabulary and same
 * `snippet` semantics) so callers can treat both scanner results
 * uniformly. `field` is a JSON-pointer-ish path (e.g. `/production/notes`
 * or `/goals/0`) locating the string leaf that matched. `line` is
 * populated when the scanner can resolve the leaf back to a YAML/JSON
 * source line, and otherwise omitted.
 */
export interface IntentionSecretFinding {
  /** JSON-pointer-ish path to the offending leaf. */
  field: string;
  /** Name of the rule that matched (from the RULES table). */
  pattern: string;
  /** Truncated snippet of the matching value (≤ 120 chars). */
  snippet: string;
  /** 1-indexed source line in the original file, when known. */
  line?: number;
}

/**
 * Structured result of {@link scanIntentionFile}. `ok === true` iff
 * `findings` is empty.
 */
export interface IntentionScanResult {
  ok: boolean;
  findings: IntentionSecretFinding[];
}

/**
 * Scan a single intention file (YAML or JSON) for credential-like
 * content before it is checked in.
 *
 * Reads the file as UTF-8, parses it, walks every string leaf
 * (including strings nested in objects or arrays), and runs each value
 * through the same RULES table used by {@link scanForSecrets}. The
 * returned findings share the same rule names (`aws-access-key`,
 * `github-pat`, ...) so downstream reporters need only one formatter.
 *
 * This function scans exactly one document. A caller wanting to scan a
 * directory of intention files should iterate.
 *
 * @param path - Path to a `.yaml`, `.yml`, or `.json` intention file.
 * @returns `{ ok, findings }` where `ok` is `findings.length === 0`.
 */
export function scanIntentionFile(path: string): IntentionScanResult {
  const abs = resolve(path);

  let content: string;
  try {
    content = readFileSync(abs, "utf-8");
  } catch {
    // Missing / unreadable file → treat as clean so the caller can
    // differentiate from "found a secret" without a try/catch.
    return { ok: true, findings: [] };
  }

  let data: unknown;
  try {
    data = abs.endsWith(".json")
      ? (JSON.parse(content) as unknown)
      : (parseYaml(content) as unknown);
  } catch {
    // Parse failure is not the secrets-scanner's job to report — the
    // intention loader will surface a schema/syntax error. Return a
    // clean result so precommit doesn't double-report.
    return { ok: true, findings: [] };
  }

  const findings: IntentionSecretFinding[] = [];
  const lines = content.split(/\r?\n/);
  walkValue(data, "", findings, lines);

  return { ok: findings.length === 0, findings };
}

/**
 * Recursively walk a parsed JSON/YAML value, collecting findings for
 * every string leaf whose content matches a rule.
 */
function walkValue(
  value: unknown,
  fieldPath: string,
  findings: IntentionSecretFinding[],
  lines: readonly string[],
): void {
  if (typeof value === "string") {
    scanStringLeaf(value, fieldPath === "" ? "/" : fieldPath, findings, lines);
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkValue(value[i], `${fieldPath}/${i}`, findings, lines);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      walkValue(child, `${fieldPath}/${escapePointerSegment(key)}`, findings, lines);
    }
    return;
  }

  // numbers, booleans, null — not scannable for credential regexes
}

/** Run every rule against one string leaf and push any matches. */
function scanStringLeaf(
  value: string,
  field: string,
  findings: IntentionSecretFinding[],
  lines: readonly string[],
): void {
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(value)) !== null) {
      const finding: IntentionSecretFinding = {
        field,
        pattern: rule.name,
        snippet: truncateSnippet(value, match.index),
      };
      const line = findSourceLine(match[0], lines);
      if (line !== undefined) finding.line = line;
      findings.push(finding);

      if (match.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
    }
  }
}

/**
 * Best-effort source-line lookup: find the first line in the raw file
 * text that contains the matched substring. Returns `undefined` if the
 * match cannot be located (e.g. because the YAML parser folded a block
 * scalar). Callers must treat `line` as advisory.
 */
function findSourceLine(
  matchedText: string,
  lines: readonly string[],
): number | undefined {
  if (matchedText.length === 0) return undefined;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(matchedText)) return i + 1;
  }
  return undefined;
}

/** RFC 6901 JSON-pointer escape for a single path segment. */
function escapePointerSegment(seg: string): string {
  return seg.replace(/~/g, "~0").replace(/\//g, "~1");
}
