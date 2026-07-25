/**
 * MCP server entry point — wires tool declarations to handlers and
 * exposes an `ace mcp serve` runtime.
 *
 * Uses the low-level Server class from @modelcontextprotocol/sdk with
 * raw JSON Schema tool definitions. The McpServer high-level API requires
 * Zod schemas which would add a dependency; the low-level Server class
 * is stable and fully supported.
 *
 * The server itself is a thin facade: programs and lenses are loaded
 * from the workspace on startup, and every tool call resolves to the
 * same pure-function code path used by the CLI. That sameness is what
 * gives property P8 (MCP-vs-clone equivalence) its guarantee.
 *
 * Strict mode: when `--strict` is set and the git working tree has
 * uncommitted changes to files that could alter resolution (programs,
 * lenses, schemas), the server logs a warning and refuses to serve.
 */

import { execSync } from "node:child_process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MCP_TOOLS } from "./tools.js";
import {
  buildHandlerContext,
  handleGetEngagementContext,
  handleAimAssess,
  handleGetSkill,
  handleGetSteering,
  handleListLenses,
  handleListPrograms,
  handleLoadIntention,
  handlePatchIntention,
  handleRender,
  handleResolve,
  handleInitWorkspace,
  handleInstallAssets,
  type HandlerContext,
} from "./handlers.js";

export interface StartMcpServerOptions {
  readonly workspaceRoot: string;
  readonly strict?: boolean;
}

/**
 * Start the MCP server over stdio. Returns after the initialization
 * handshake; the caller owns the process lifecycle.
 */
export async function startMcpServer(
  opts: StartMcpServerOptions,
): Promise<void> {
  if (opts.strict && hasDirtyCatalog(opts.workspaceRoot)) {
    // eslint-disable-next-line no-console
    console.error(
      "[ace mcp serve] refusing to start in --strict mode: catalog has uncommitted changes",
    );
    throw new Error("ace mcp serve: dirty working tree in --strict mode");
  }

  const ctx = buildHandlerContext(opts.workspaceRoot);

  const server = new Server(
    { name: "fde-mcp", version: "0.5.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    // Issue #5 mitigation: reject oversized MCP payloads to prevent memory abuse.
    // 512KB is generous for any legitimate tool call (intentions, render configs, etc.)
    const MAX_ARGS_SIZE = 512 * 1024;
    const argsStr = JSON.stringify(args ?? {});
    if (argsStr.length > MAX_ARGS_SIZE) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: `Request payload too large (${argsStr.length} bytes). Maximum: ${MAX_ARGS_SIZE} bytes.`,
              errorType: "PayloadTooLarge",
            }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await dispatchTool(ctx, name, args ?? {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.name === "IntentionValidationError" &&
        "diagnostics" in err
      ) {
        const diagnostics = (err as { diagnostics: readonly { field?: string; message: string }[] }).diagnostics;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: err.message,
                diagnostics,
                hint: "See schemas/intention.schema.json for the full schema. Required fields: schemaVersion (const '1'), customer (kebab-case), goals (array of enum values), updatedAt (ISO-8601).",
              }),
            },
          ],
          isError: true,
        };
      }
      // Handle security-related errors with clear messages
      if (
        err instanceof Error &&
        (err.name === "PathValidationError" || err.name === "SessionLimitError")
      ) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: err.message,
                errorType: err.name,
              }),
            },
          ],
          isError: true,
        };
      }
      throw err;
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Dispatch a single tool call against the handler context. Exported for
 * direct use in tests (task 10.5 — MCP handler tests).
 */
export async function dispatchTool(
  ctx: HandlerContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "fde_list_programs":
      return handleListPrograms(ctx);
    case "fde_list_lenses":
      return handleListLenses(ctx);
    case "fde_load_intention":
      return handleLoadIntention(ctx, args);
    case "fde_resolve":
      return handleResolve(ctx, args as { intentionId: string });
    case "fde_render":
      return handleRender(ctx, args as unknown as Parameters<typeof handleRender>[1]);
    case "fde_patch_intention":
      return handlePatchIntention(
        ctx,
        args as unknown as Parameters<typeof handlePatchIntention>[1],
      );
    case "fde_get_skill":
      return handleGetSkill(ctx, args as { skillId: string; file?: string });
    case "fde_get_steering":
      return handleGetSteering(ctx, args as { steeringId: string });
    case "fde_get_engagement_context":
      return handleGetEngagementContext(
        ctx,
        args as unknown as Parameters<typeof handleGetEngagementContext>[1],
      );
    case "fde_aim_assess":
      return handleAimAssess(ctx, args as unknown as Parameters<typeof handleAimAssess>[1]);
    case "fde_init_workspace":
      return handleInitWorkspace(ctx, args as unknown as Parameters<typeof handleInitWorkspace>[1]);
    case "fde_install_assets":
      return handleInstallAssets(ctx, args as unknown as Parameters<typeof handleInstallAssets>[1]);
    default:
      throw new Error(`Unknown MCP tool '${name}'`);
  }
}

/**
 * Best-effort dirty-tree check. Returns `true` when `git status` reports
 * modifications under `programs/`, `lenses/`, or `schemas/`. Silently
 * returns `false` when git is unavailable or the workspace isn't a
 * checkout (tests, installs from tarball, etc.).
 *
 * Security note: the command is hardcoded (no user input interpolation)
 * and `cwd` is the fixed workspace root from startup. Shell injection
 * is not possible here.
 */
function hasDirtyCatalog(workspaceRoot: string): boolean {
  try {
    const out = execSync("git status --porcelain programs lenses schemas", {
      cwd: workspaceRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}
