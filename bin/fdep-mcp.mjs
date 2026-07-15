#!/usr/bin/env node
/**
 * fdep-mcp — single-binary launcher for the FDE MCP server.
 *
 * Designed so a forward-deployed engineer (or anyone evaluating FDE)
 * can paste a single JSON block into their MCP client (Claude Desktop,
 * Kiro, Cursor, Cline, Continue, etc.) and have a working FDE harness
 * agent on the other side — no manual setup beyond `npx`.
 *
 * Two operating modes:
 *
 *   1. Local (default): runs against the workspace this script lives
 *      in. Used when the user has cloned / npm-installed FDE kit.
 *
 *   2. Auto-install: if launched via `npx` and no programs/lenses can
 *      be found in `cwd`, falls back to the bundled catalog inside the
 *      package.
 *
 * The MCP transport is stdio (the universal default for desktop MCP
 * clients).
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Find the FDE workspace root that contains programs/, lenses/, and
 * schemas/. Resolution order:
 *
 *   1. FDE_WORKSPACE env var (explicit override).
 *   2. CWD if it contains programs/.
 *   3. The package directory this script lives in (../).
 *
 * Returns the first match, falling back to the package root.
 */
function resolveWorkspaceRoot() {
  const fromEnv = process.env.FDE_WORKSPACE ?? process.env.FDE_WORKSPACE;
  if (fromEnv && existsSync(join(fromEnv, "programs"))) {
    return resolve(fromEnv);
  }

  const cwd = process.cwd();
  if (existsSync(join(cwd, "programs")) && existsSync(join(cwd, "schemas"))) {
    return resolve(cwd);
  }

  const packageRoot = resolve(__dirname, "..");
  return packageRoot;
}

async function main() {
  const workspaceRoot = resolveWorkspaceRoot();
  const strict = process.argv.includes("--strict");

  // Late import so a missing build doesn't crash the launcher with a
  // confusing stack trace — we want a clear, actionable error message.
  let startMcpServer;
  try {
    const serverPath = join(
      workspaceRoot,
      "core",
      "dist",
      "core",
      "src",
      "mcp",
      "server.js",
    );
    const mod = await import(pathToFileURL(serverPath).href);
    startMcpServer = mod.startMcpServer;
  } catch (err) {
    process.stderr.write(
      [
        "[fdep-mcp] failed to load the MCP server module.",
        `[fdep-mcp] workspace root resolved to: ${workspaceRoot}`,
        "[fdep-mcp] make sure the package is built: `npm run build` from the workspace root.",
        `[fdep-mcp] underlying error: ${err && err.message ? err.message : String(err)}`,
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  process.stderr.write(
    `[fdep-mcp] starting FDE MCP server (workspace=${workspaceRoot}, strict=${strict})\n`,
  );

  await startMcpServer({ workspaceRoot, strict });
}

main().catch((err) => {
  process.stderr.write(
    `[fdep-mcp] fatal: ${err && err.stack ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
