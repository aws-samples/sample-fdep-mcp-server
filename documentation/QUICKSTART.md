# FDE Quick Start

## Setup

```bash
git clone <repo-url> fde-kit
cd fde-kit
npm install
npm run build
```

## Prerequisites

- **Node.js 20+**
- **AWS MCP Server** — needed when the agent executes rendered skills (CDK deploys, Bedrock, S3, etc.)

Install `uvx` if you don't have it: see [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/).

## Connect to your MCP client

Add both the FDE kit and AWS MCP server to your client config (Kiro, Claude Desktop, Cursor, Cline, Continue, etc.):

```json
{
  "mcpServers": {
    "fdep-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/fde-kit/bin/fdep-mcp.mjs"]
    },
    "aws-mcp": {
      "command": "uvx",
      "args": ["mcp-proxy-for-aws@latest", "https://aws-mcp.us-east-1.api.aws/mcp"]
    }
  }
}
```

> The FDE kit handles engagement setup (intentions, resolution, rendering). The AWS MCP server handles execution (deploying infrastructure, calling AWS APIs). Both are needed for a full workflow.

Restart your client. The 12 FDE tools are now available.

## The intention-driven flow

Ask your agent to run `/init` or call the tools directly:

### 1. Load an intention

```
fde_load_intention({
  schemaVersion: "1",
  customer: "my-customer",
  industry: "financial-services",
  regulated: true,
  goals: ["build", "aidlc"],
  aim: { business: 2, governance: 1, security: 3, overall: 2 },
  updatedAt: "2026-07-16T10:00:00Z"
})
```

Returns an `intentionId` handle.

### 2. Resolve

```
fde_resolve({ intentionId: "<id>" })
```

Evaluates activation predicates. Returns which programs activated, their scores, and any lens overlays applied.

### 3. Render

```
fde_render({
  intentionId: "<id>",
  engagementDir: "/path/to/workspace",
  targets: ["kiro"]
})
```

Writes platform-native artifacts to the workspace: `.kiro/steering/`, `.kiro/skills/`, `state/`, `README.md`, `.fde-manifest.json`.

## Intention schema

```yaml
schemaVersion: "1"
customer: any-bank          # kebab-case, 3-64 chars
industry: financial-services     # triggers financial-services-lens
regulated: true                  # drives responsible-ai activation
aim:
  business: 2
  governance: 1
  security: 3
  overall: 2
goals: [build, aidlc, responsible-ai]
production:
  aiSystems: 3
team:
  primaryAgenticPlatforms: [kiro, claude]
updatedAt: "2026-07-16T10:00:00Z"
```

## Available tools

| Tool | Purpose |
|------|---------|
| `fde_list_programs` | List all programs in the catalog |
| `fde_list_lenses` | List all industry lenses |
| `fde_load_intention` | Validate and load an intention |
| `fde_resolve` | Resolve intention against catalog |
| `fde_render` | Render artifacts to workspace |
| `fde_patch_intention` | Modify a loaded intention |
| `fde_aim_assess` | Run AIM maturity assessment |
| `fde_get_skill` | Read a skill definition or reference file |
| `fde_get_steering` | Read a steering file |
| `fde_get_engagement_context` | Resume a previous engagement |
| `fde_init_workspace` | Bootstrap orchestration in a workspace |
| `fde_install_assets` | Install AI-DLC rules |

## Build and verify

```bash
npm run build        # Compile TypeScript
npm run typecheck    # Type-check without emitting
npm run test         # Run test suite
```
