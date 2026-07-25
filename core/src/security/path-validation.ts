/**
 * Path validation utilities — guards against path traversal and directory
 * escape attacks in MCP tool handlers.
 *
 * Addresses threats:
 *   T3 — path traversal in fde_install_assets (engagementDir)
 *   T8 — path traversal in fde_render / fde_install_assets (../../etc/)
 *
 * Invariant: any engagementDir accepted by the MCP server MUST resolve
 * to an absolute path that does NOT escape upward into system directories
 * and does NOT contain traversal sequences after resolution.
 */

import { resolve, normalize, isAbsolute } from "node:path";
import { realpathSync, existsSync, lstatSync } from "node:fs";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Directories that must NEVER be written to by FDE rendering.
 * These are OS-level sensitive paths that a path traversal attack
 * might target.
 */
const BLOCKED_PREFIXES_UNIX = [
  "/etc",
  "/usr",
  "/bin",
  "/sbin",
  "/boot",
  "/proc",
  "/sys",
  "/dev",
  "/var/run",
  "/tmp",
  "/root",
];

const BLOCKED_PREFIXES_WINDOWS = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\ProgramData",
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export class PathValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathValidationError";
  }
}

/**
 * Validate and normalize an engagementDir path for safe file operations.
 *
 * Checks:
 * 1. Path must be absolute (no relative paths accepted)
 * 2. Path must not contain traversal sequences after normalization
 * 3. Resolved path must not target blocked system directories
 * 4. If path exists and is a symlink, resolved real path is validated
 * 5. Path must not be a filesystem root (/, C:\)
 *
 * @param rawPath - The engagementDir as provided by the MCP client
 * @returns The validated, resolved absolute path
 * @throws PathValidationError if any check fails
 */
export function validateEngagementDir(rawPath: string): string {
  if (!rawPath || typeof rawPath !== "string") {
    throw new PathValidationError("engagementDir must be a non-empty string");
  }

  // Trim whitespace and null bytes (null byte injection prevention)
  const trimmed = rawPath.replace(/\0/g, "").trim();
  if (trimmed.length === 0) {
    throw new PathValidationError("engagementDir must be a non-empty string");
  }

  // Must be absolute — reject relative paths entirely
  if (!isAbsolute(trimmed)) {
    throw new PathValidationError(
      `engagementDir must be an absolute path; received relative path: '${trimmed}'`,
    );
  }

  // Normalize and resolve to eliminate .., ., double slashes
  const resolved = resolve(normalize(trimmed));

  // Check for remaining traversal patterns (should be eliminated by resolve,
  // but defense-in-depth)
  if (resolved.includes("..")) {
    throw new PathValidationError(
      `engagementDir contains path traversal sequences after resolution: '${resolved}'`,
    );
  }

  // Must not be filesystem root
  if (resolved === "/" || /^[A-Z]:\\$/i.test(resolved)) {
    throw new PathValidationError(
      "engagementDir must not be the filesystem root",
    );
  }

  // Check against blocked system directories
  const blockedPrefixes =
    process.platform === "win32" ? BLOCKED_PREFIXES_WINDOWS : BLOCKED_PREFIXES_UNIX;

  const normalizedForCompare = process.platform === "win32"
    ? resolved.toLowerCase()
    : resolved;

  for (const blocked of blockedPrefixes) {
    const normalizedBlocked = process.platform === "win32"
      ? blocked.toLowerCase()
      : blocked;

    if (
      normalizedForCompare === normalizedBlocked ||
      normalizedForCompare.startsWith(normalizedBlocked + (process.platform === "win32" ? "\\" : "/"))
    ) {
      throw new PathValidationError(
        `engagementDir must not target system directory: '${resolved}' (blocked prefix: '${blocked}')`,
      );
    }
  }

  // If path exists, check for symlink attacks — resolve the real path
  // and validate it too
  if (existsSync(resolved)) {
    try {
      const stat = lstatSync(resolved);
      if (stat.isSymbolicLink()) {
        const realPath = realpathSync(resolved);
        // Re-validate the real path against blocked prefixes
        const realNormalized = process.platform === "win32"
          ? realPath.toLowerCase()
          : realPath;

        for (const blocked of blockedPrefixes) {
          const normalizedBlocked = process.platform === "win32"
            ? blocked.toLowerCase()
            : blocked;

          if (
            realNormalized === normalizedBlocked ||
            realNormalized.startsWith(normalizedBlocked + (process.platform === "win32" ? "\\" : "/"))
          ) {
            throw new PathValidationError(
              `engagementDir symlink resolves to blocked system directory: '${realPath}'`,
            );
          }
        }
      }
    } catch (e) {
      if (e instanceof PathValidationError) throw e;
      // lstat/realpath failure on non-existent path segments is fine
    }
  }

  return resolved;
}

/**
 * Validate that a file path stays within a given root directory.
 * Used by fde_get_skill to prevent reading files outside the program tree.
 *
 * Resolves symlinks when the candidate path exists on disk to prevent
 * symlink-based escapes. On case-insensitive filesystems (Windows),
 * comparison is performed in lowercase.
 *
 * @param filePath - The resolved candidate file path
 * @param rootDir - The root directory that filePath must stay within
 * @returns true if the path is safely contained
 */
export function isPathContainedIn(filePath: string, rootDir: string): boolean {
  let normalizedFile = resolve(normalize(filePath));
  let normalizedRoot = resolve(normalize(rootDir));

  // Resolve symlinks when the path exists to prevent symlink escapes
  if (existsSync(normalizedFile)) {
    try {
      normalizedFile = realpathSync(normalizedFile);
    } catch {
      // If realpath fails, use the normalized path
    }
  }
  if (existsSync(normalizedRoot)) {
    try {
      normalizedRoot = realpathSync(normalizedRoot);
    } catch {
      // If realpath fails, use the normalized path
    }
  }

  // Case-insensitive comparison on Windows
  if (process.platform === "win32") {
    normalizedFile = normalizedFile.toLowerCase();
    normalizedRoot = normalizedRoot.toLowerCase();
  }

  // The file path must start with the root + separator
  // This prevents prefix attacks (e.g. /foo/bar matching /foo/barbaz)
  const sep = process.platform === "win32" ? "\\" : "/";
  return (
    normalizedFile === normalizedRoot ||
    normalizedFile.startsWith(normalizedRoot + sep)
  );
}
