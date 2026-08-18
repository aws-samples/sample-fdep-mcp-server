/**
 * MCP tool surface declarations.
 *
 * Each entry declares the stable external contract for one tool the FDE
 * MCP server exposes. The actual transport (stdio, streamable HTTP) is
 * handled by `server.ts`; the handlers live in `handlers.ts`. Keeping
 * the declarations separate lets tests drive the handlers directly
 * without booting the SDK.
 *
 * Tool surface (design.md §MCP Tool Surface):
 *   - fde_list_programs
 *   - fde_list_lenses
 *   - fde_load_intention
 *   - fde_resolve
 *   - fde_render
 *   - fde_aim_assess
 *   - fde_get_skill
 *   - fde_get_steering
 *   - fde_patch_intention
 *   - fde_get_engagement_context
 *   - fde_init_workspace
 *   - fde_install_assets
 */

export interface McpToolDeclaration {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: readonly McpToolDeclaration[] = [
  {
    name: "fde_list_programs",
    description:
      "List every program in the loaded catalog with id, name, version, and tags.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "fde_list_lenses",
    description: "List every lens in the loaded catalog with id, industry, and tags.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "fde_load_intention",
    description:
      "Validate and load an intention object; returns an intentionId handle for subsequent calls. Typical workflow: load_intention → (optional: patch_intention) → resolve → render.",
    inputSchema: {
      type: "object",
      required: ["schemaVersion", "customer", "goals", "updatedAt"],
      additionalProperties: true,
      properties: {
        schemaVersion: { type: "string" },
        customer: { type: "string", description: "Customer identifier in kebab-case" },
        goals: { type: "array", items: { type: "string" }, description: "Array of goal identifiers" },
        updatedAt: { type: "string", description: "ISO-8601 timestamp" },
        industry: { type: "string", description: "Industry vertical (e.g. healthcare, financial-services, retail, manufacturing)" },
        regulated: { type: "boolean", description: "Whether the customer operates in a regulated environment (drives responsible-ai and ai-operations activation)" },
        aim: {
          type: "object",
          description: "AIM maturity scores per perspective (1-5 each)",
          properties: {
            business: { type: "number", description: "Business perspective maturity (1-5)" },
            governance: { type: "number", description: "Governance perspective maturity (1-5)" },
            security: { type: "number", description: "Security perspective maturity (1-5)" },
            overall: { type: "number", description: "Overall AIM tier (1-5)" },
          },
        },
        cloud: {
          type: "object",
          description: "Cloud posture information",
          properties: {
            primary: { type: "string", description: "Primary cloud provider (e.g. aws)" },
            multicloud: { type: "boolean", description: "Whether the customer operates multicloud" },
          },
        },
        team: {
          type: "object",
          description: "Team and tooling context",
          properties: {
            primaryAgenticPlatforms: { type: "array", items: { type: "string" }, description: "Agent platforms in use (e.g. kiro, claude)" },
          },
        },
        production: {
          type: "object",
          description: "Production AI inventory",
          properties: {
            aiSystems: { type: "number", description: "Number of AI systems in production" },
            developerCount: { type: "number", description: "Number of developers on the team" },
          },
        },
        notes: { type: "string", description: "Free-text notes about the engagement" },
      },
    },
  },
  {
    name: "fde_resolve",
    description:
      "Resolve a loaded intention against the catalog; returns the ResolvedGraph showing which programs activated and lens overlays applied. Call this after load_intention (and any patches). Next step: call fde_render to write artifacts.",
    inputSchema: {
      type: "object",
      required: ["intentionId"],
      additionalProperties: false,
      properties: {
        intentionId: { type: "string" },
      },
    },
  },
  {
    name: "fde_render",
    description:
      "Render the resolved graph into one or more platform targets under an engagement workspace. Call this after fde_resolve. Writes steering, skills, references, and state files to the engagementDir. Returns a render report.",
    inputSchema: {
      type: "object",
      required: ["intentionId", "engagementDir", "targets"],
      additionalProperties: false,
      properties: {
        intentionId: { type: "string" },
        engagementDir: { type: "string", description: "Absolute path to the user's workspace root where rendered artifacts should be written (e.g. the project directory the user has open in their IDE)." },
        targets: {
          type: "array",
          minItems: 1,
          items: {
            type: "string",
            enum: [
              "kiro",
              "claude",
              "copilot",
              "cursor",
              "codex",
              "cline",
              "continue",
              "aider",
              "windsurf",
              "zed",
              "chatgpt-custom-gpt",
              "gemini-code-assist",
              "mcp",
            ],
          },
        },
      },
    },
  },
  {
    name: "fde_aim_assess",
    description:
      "Run the AIM bootstrap skill in runtime-agentic or pre-generated mode; returns AimScores and a recommendation list. Patches the loaded intention when scores are supplied.",
    inputSchema: {
      type: "object",
      required: ["intentionId", "mode"],
      additionalProperties: false,
      properties: {
        intentionId: { type: "string" },
        mode: { type: "string", enum: ["runtime", "pre-generated"] },
        responses: {
          type: "object",
          description:
            "Response map keyed by perspective when running in pre-generated mode.",
          additionalProperties: true,
        },
      },
    },
  },
  {
    name: "fde_get_skill",
    description: "Return the full skill definition or a reference file. IMPORTANT: Call this with the 'file' parameter to read layer references BEFORE generating any code or design artifacts. Reference files under 'references/' contain version-specific, tested AWS patterns that MUST be used instead of generating from memory. Check .fde-manifest.json in the workspace root for the list of available references and when to read them.",
    inputSchema: {
      type: "object",
      required: ["skillId"],
      additionalProperties: false,
      properties: {
        skillId: { type: "string" },
        file: {
          type: "string",
          description:
            "Optional relative path to a file within the skill's program directory (e.g. 'references/layer-6-ai-app-creation.md'). When provided, returns the file content instead of the skill definition.",
        },
      },
    },
  },
  {
    name: "fde_get_steering",
    description:
      "Return a steering file (inclusion, match, priority, body) for a given steering id.",
    inputSchema: {
      type: "object",
      required: ["steeringId"],
      additionalProperties: false,
      properties: { steeringId: { type: "string" } },
    },
  },
  {
    name: "fde_get_engagement_context",
    description:
      "Load engagement context from disk for session resume. Reads state/intention.json, state/resolution.json, aidlc-state, and engagement spec from the given directory. Rehydrates the intention into the MCP session so subsequent tool calls (resolve, patch, aim_assess) work without re-loading. Use at session start to resume a previously created engagement.",
    inputSchema: {
      type: "object",
      required: ["engagementDir"],
      additionalProperties: false,
      properties: {
        engagementDir: { type: "string", description: "Absolute path to the user's workspace/engagement directory (the project directory the user has open in their IDE)." },
      },
    },
  },
  {
    name: "fde_patch_intention",
    description:
      "Apply a partial patch to a loaded intention. Modes: 'merge' (default) or 'replace'. Use between load_intention and resolve to add or modify fields (e.g. regulated, aim scores).",
    inputSchema: {
      type: "object",
      required: ["intentionId", "patch"],
      additionalProperties: false,
      properties: {
        intentionId: { type: "string" },
        mode: { type: "string", enum: ["merge", "replace"] },
        patch: { type: "object", additionalProperties: true },
      },
    },
  },
  {
    name: "fde_init_workspace",
    description:
      "Bootstrap the FDE (Forward-Deployed Engineer) orchestration layer into the current workspace. Copies the fde-orchestration steering and init skill into .kiro/ so the agent knows how to create engagements (load → resolve → render). Run this first on any new project before starting an engagement.",
    inputSchema: {
      type: "object",
      required: ["workspaceDir"],
      additionalProperties: false,
      properties: {
        workspaceDir: { type: "string", description: "Absolute path to the user's workspace root where .kiro/ should be created (the project directory the user has open in their IDE)." },
      },
    },
  },
  {
    name: "fde_install_assets",
    description:
      "Bulk-install bundled program assets (e.g. AI-DLC rules) into an engagement workspace server-side. No content passes through the model — files are copied directly from the kit's catalog to the target paths. Use this instead of retrieving files one-by-one via fde_get_skill.",
    inputSchema: {
      type: "object",
      required: ["programId", "engagementDir", "target"],
      additionalProperties: false,
      properties: {
        programId: { type: "string", description: "Program id whose assets to install (e.g. 'aws-aidlc')" },
        engagementDir: { type: "string", description: "Absolute path to the user's workspace root where assets should be installed." },
        target: {
          type: "string",
          description: "Target platform determining file placement paths.",
          enum: [
            "kiro",
            "claude",
            "copilot",
            "cursor",
            "codex",
            "cline",
            "continue",
            "aider",
            "windsurf",
            "zed",
            "chatgpt-custom-gpt",
            "gemini-code-assist",
            "mcp",
          ],
        },
      },
    },
  },
];
