/**
 * FDE_MANAGED header system — writes files with a content hash header,
 * detects manual edits on re-render, and routes conflicts to `.fde-conflict/`.
 *
 * Requirements: 4.6, 4.7, 9.4, 9.5, 11.5
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HEADER_PREFIX = "<!-- FDE_MANAGED";
const HEADER_SUFFIX = "-->";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface ManagedFile {
  /** Relative path from the engagement root. */
  path: string;
  /** Rendered body content (without the FDE_MANAGED header). */
  content: string;
}

export interface ConflictEntry {
  /** Original target path. */
  targetPath: string;
  /** Where the conflict file was written (if applicable). */
  conflictPath?: string;
  /** Reason for the conflict. */
  reason: "hash-mismatch" | "non-managed-exists";
}

export interface RenderReport {
  written: string[];
  skipped: string[];
  conflicts: ConflictEntry[];
}

/* ------------------------------------------------------------------ */
/*  Hash helpers                                                       */
/* ------------------------------------------------------------------ */

export function contentHash(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function buildHeader(hash: string): string {
  return `${HEADER_PREFIX} hash:${hash} ${HEADER_SUFFIX}`;
}

export function parseHeader(
  line: string,
): { hash: string } | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith(HEADER_PREFIX)) return undefined;
  const match = /hash:([a-f0-9]+)/.exec(trimmed);
  if (!match) return undefined;
  return { hash: match[1]! };
}

/* ------------------------------------------------------------------ */
/*  Core: writeManaged                                                 */
/* ------------------------------------------------------------------ */

/**
 * Write a managed file with an FDE_MANAGED header.
 *
 * Behaviour:
 * 1. If the target does not exist → write header + body, record in report.written.
 * 2. If the target exists with a valid FDE_MANAGED header and matching hash
 *    → overwrite (idempotent), record in report.written.
 * 3. If the target exists with a valid FDE_MANAGED header but mismatched hash
 *    (manual edit detected) → do NOT overwrite, record conflict.
 * 4. If the target exists WITHOUT an FDE_MANAGED header (non-managed file)
 *    → write to `.fde-conflict/` sibling, record conflict.
 */
export function writeManaged(
  file: ManagedFile,
  baseDir: string,
  report: RenderReport,
): void {
  const fullPath = path.resolve(baseDir, file.path);

  // Path escape guard: ensure the resolved path stays within baseDir.
  const resolvedBase = path.resolve(baseDir);
  if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
    throw new Error(
      `Path escape detected: '${file.path}' resolves outside baseDir '${baseDir}'`,
    );
  }

  const hash = contentHash(file.content);
  const header = buildHeader(hash);

  // For files that start with frontmatter (---), place the FDE_MANAGED
  // marker after the closing --- so Kiro and other tools that require
  // frontmatter on line 1 can still detect it correctly.
  const fullContent = buildManagedContent(header, file.content);

  if (!fs.existsSync(fullPath)) {
    // Case 1: fresh write
    // Note: TOCTOU race between existsSync and writeFileSync is accepted
    // as low-risk in this single-threaded, single-user context. The consequence
    // of a race would be overwriting a file that appeared between the check and
    // write, which is the same as the "file didn't exist" case.
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, fullContent, "utf8");
    report.written.push(file.path);
    return;
  }

  // File exists — read it
  const existing = fs.readFileSync(fullPath, "utf8");
  const parsed = findManagedHeader(existing);

  if (parsed) {
    // Existing file is FDE-managed
    if (parsed.hash === hash) {
      // Case 2: same content → idempotent overwrite
      fs.writeFileSync(fullPath, fullContent, "utf8");
      report.written.push(file.path);
    } else {
      // Case 3: hash mismatch — manual edit detected
      report.skipped.push(file.path);
      report.conflicts.push({
        targetPath: file.path,
        reason: "hash-mismatch",
      });
    }
  } else {
    // Case 4: non-managed file exists at target path
    const conflictDir = path.join(
      path.dirname(fullPath),
      ".fde-conflict",
    );
    const conflictFile = path.join(conflictDir, path.basename(fullPath));
    const conflictRelative = path.join(
      path.dirname(file.path),
      ".fde-conflict",
      path.basename(file.path),
    );

    fs.mkdirSync(conflictDir, { recursive: true });
    fs.writeFileSync(conflictFile, fullContent, "utf8");
    report.conflicts.push({
      targetPath: file.path,
      conflictPath: conflictRelative,
      reason: "non-managed-exists",
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Frontmatter-aware managed content helpers                          */
/* ------------------------------------------------------------------ */

/**
 * Build the full file content with the FDE_MANAGED marker placed in a
 * position that preserves frontmatter detectability.
 *
 * - If content starts with `---` (YAML frontmatter), the marker is inserted
 *   immediately after the closing `---` line.
 * - Otherwise the marker is prepended as line 1 (legacy behavior).
 */
function buildManagedContent(header: string, content: string): string {
  if (content.startsWith("---\n") || content.startsWith("---\r\n")) {
    // Find the closing --- of the frontmatter block
    const lines = content.split("\n");
    let closingIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]!.trimEnd() === "---") {
        closingIdx = i;
        break;
      }
    }

    if (closingIdx > 0) {
      // Insert the managed header right after the closing ---
      const before = lines.slice(0, closingIdx + 1).join("\n");
      const after = lines.slice(closingIdx + 1).join("\n");
      return `${before}\n${header}\n${after}`;
    }
  }

  // No frontmatter — prepend as before
  return `${header}\n${content}`;
}

/**
 * Find the FDE_MANAGED header anywhere in the first N lines of a file.
 * Handles both legacy (line 1) and frontmatter-aware (after closing ---)
 * positions.
 */
function findManagedHeader(content: string): { hash: string } | undefined {
  // Check the first 30 lines for the header (frontmatter is typically < 20 lines)
  const lines = content.split("\n");
  const limit = Math.min(lines.length, 30);
  for (let i = 0; i < limit; i++) {
    const result = parseHeader(lines[i]!);
    if (result) return result;
  }
  return undefined;
}
