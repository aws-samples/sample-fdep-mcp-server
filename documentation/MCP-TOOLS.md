# MCP Tool Reference

The FDE MCP server exposes 12 tools over stdio transport. This document provides detailed usage for each tool.

---

## Workflow Overview

The typical engagement flow:

```
fde_init_workspace → fde_load_intention → fde_resolve → fde_render
```

For resuming an existing engagement:

```
fde_get_engagement_context → fde_resolve → fde_render
```

---

## Tool Reference

### fde_list_programs

List every program in the loaded catalog.

**Parameters:** None

**Returns:** Array of `{ id, name, version, tags }` for each program.

**Example:**
```json
// Request
{ "name": "fde_list_programs", "arguments": {} }

// Response
{
  "programs": [
    { "id": "aim", "name": "AI Maturity Model", "version": "1.0.0", "tags": ["assessment"] },
    { "id": "ai-native-app-builder", "name": "AI Native App Builder", "version": "1.0.0", "tags": ["build"] }
  ]
}
```

---

### fde_list_lenses

List every industry lens in the catalog.

**Parameters:** None

**Returns:** Array of `{ id, industry, tags }` for each lens.

---

### fde_load_intention

Validate and load a customer intention. Returns an `intentionId` handle for subsequent calls.

**Required Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `schemaVersion` | string | Must be `"1"` |
| `customer` | string | Kebab-case identifier (e.g. `"acme-corp"`) |
| `goals` | string[] | Engagement goals (see below) |
| `updatedAt` | string | ISO-8601 timestamp |

**Optional Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `industry` | string | `financial-services`, `healthcare`, `retail`, `manufacturing`, `entertainment`, `public-sector`, `other` |
| `regulated` | boolean | Drives responsible-ai and ai-operations activation |
| `aim` | object | AIM maturity scores: `{ business, governance, security, overall }` (1-5 each) |
| `cloud` | object | `{ primary: "aws"\|"azure"\|"gcp", multicloud: boolean }` |
| `team` | object | `{ primaryAgenticPlatforms: ["kiro", "claude", ...] }` |
| `production` | object | `{ aiSystems: number, developerCount: number }` |
| `notes` | string | Free-text engagement notes |

**Available Goals:**

| Goal | What it activates |
|------|-------------------|
| `build` | ai-native-app-builder (AI-native app building on AWS) |
| `aidlc` | aws-aidlc (AI Development Lifecycle) + ai-native-app-builder |
| `responsible-ai` | responsible-ai program |
| `gen-ai-rollout` | aim, agentpath, ai-operations |
| `resilience` | resilience program |
| `prototyping` | ai-native-app-builder at PoC level |
| `other` | Manual program selection |

**Example:**
```json
{
  "name": "fde_load_intention",
  "arguments": {
    "schemaVersion": "1",
    "customer": "meridian-bank",
    "industry": "financial-services",
    "regulated": true,
    "goals": ["build", "aidlc"],
    "aim": { "business": 2, "governance": 2, "security": 3, "overall": 2 },
    "updatedAt": "2026-07-16T10:00:00Z"
  }
}
```

**Returns:** `{ intentionId: "<uuid>" }`

---

### fde_resolve

Resolve a loaded intention against the program catalog. Evaluates activation predicates and applies industry lens overlays.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `intentionId` | string | Handle from `fde_load_intention` |

**Returns:** A `ResolvedGraph` containing:
- `activePrograms` — array of `{ id, name, score, traces }` (sorted by score descending)
- `lensOverlays` — array of lens IDs that matched the intention's industry

**Example:**
```json
{
  "name": "fde_resolve",
  "arguments": { "intentionId": "abc-123-def" }
}
```

---

### fde_render

Render the resolved program graph into platform-native artifacts in a workspace directory.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `intentionId` | string | Handle from `fde_load_intention` |
| `engagementDir` | string | Absolute path to the workspace root |
| `targets` | string[] | Platform targets to render for |


**What gets written:**
- `.kiro/steering/` — program steering files (for Kiro target)
- `.kiro/skills/` — program skills with frontmatter
- `state/intention.json` — persisted intention for session resume
- `state/resolution.json` — resolved graph
- `state/current.yaml` — engagement state tracker
- `state/history.jsonl` — append-only decision log
- `README.md` — engagement overview
- `.fde-manifest.json` — reference index for agents

**Example:**
```json
{
  "name": "fde_render",
  "arguments": {
    "intentionId": "abc-123-def",
    "engagementDir": "/home/user/projects/my-app",
    "targets": ["kiro"]
  }
}
```

---

### fde_patch_intention

Modify a loaded intention without reloading. Useful for adding AIM scores after an assessment or changing goals mid-engagement.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `intentionId` | string | Handle from `fde_load_intention` |
| `patch` | object | Fields to merge or replace |
| `mode` | string | `"merge"` (default) or `"replace"` |

**Example:**
```json
{
  "name": "fde_patch_intention",
  "arguments": {
    "intentionId": "abc-123-def",
    "patch": { "aim": { "business": 3, "governance": 2, "security": 4, "overall": 3 } }
  }
}
```

---

### fde_aim_assess

Run an AI Maturity (AIM) assessment. Returns scores per perspective and recommendations.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `intentionId` | string | Handle from `fde_load_intention` |
| `mode` | string | `"runtime"` (agent-driven) or `"pre-generated"` (batch responses) |
| `responses` | object | Required for `pre-generated` mode — answers keyed by perspective |

**Returns:** `{ scores, recommendations, activatedPrograms }`

---

### fde_get_skill

Read a skill definition or a reference file from a program. Reference files contain tested AWS patterns that agents should consult before generating code.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `skillId` | string | The skill identifier (e.g. `"build-aws-app"`) |
| `file` | string | Optional path to a reference file (e.g. `"references/layer-5-ai-app-creation.md"`) |

**Usage pattern:** Check `.fde-manifest.json` in the workspace for the list of available references and when to read them.

**Example:**
```json
{
  "name": "fde_get_skill",
  "arguments": {
    "skillId": "build-aws-app",
    "file": "references/layer-5-ai-app-creation.md"
  }
}
```

---

### fde_get_steering

Read a steering file by ID. Returns the full content including frontmatter (inclusion mode, match pattern, priority).

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `steeringId` | string | The steering file identifier |

---

### fde_get_engagement_context

Resume a previously rendered engagement. Reads state files from disk and rehydrates the intention into the current session.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `engagementDir` | string | Absolute path to the workspace with existing `state/` directory |

**Returns:** `{ intentionId, intention, resolution, currentStage, activePrograms }`

---

### fde_init_workspace

Bootstrap the FDE orchestration layer into a new workspace. Copies the fde-orchestration steering and skill files so the agent knows how to create engagements.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceDir` | string | Absolute path to the workspace root |

**What gets written:**
- `.kiro/steering/fde-orchestration-*.md` — orchestration guidance
- `.kiro/skills/fde-orchestration-*/SKILL.md` — engagement skills

Run this first on any new project before starting an engagement.

---

### fde_install_assets

Bulk-install bundled program assets (e.g. AI-DLC rules) directly into a workspace. Files are copied from the catalog without passing through the model context.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `programId` | string | Program whose assets to install (e.g. `"aws-aidlc"`) |
| `engagementDir` | string | Absolute path to the workspace |
| `target` | string | Platform target (determines file placement) |

**Example:**
```json
{
  "name": "fde_install_assets",
  "arguments": {
    "programId": "aws-aidlc",
    "engagementDir": "/home/user/projects/my-app",
    "target": "kiro"
  }
}
```

**What gets written (for Kiro target):**
- `.kiro/steering/aws-aidlc-rules/core-workflow.md` — AI-DLC workflow rules
- `.kiro/aws-aidlc-rule-details/` — detailed rule documentation

---

## Error Handling

All tools return structured errors:

```json
{
  "error": "Description of what went wrong",
  "errorType": "PathValidationError",
  "hint": "Optional guidance on how to fix"
}
```

Common error types:
- `IntentionValidationError` — schema validation failed (includes `diagnostics` array)
- `PathValidationError` — engagement directory is invalid (traversal, system dir, etc.)
- `SessionLimitError` — too many intentions loaded (max 50 per session)

---

## Security Notes

- `engagementDir` is validated against path traversal, symlink attacks, and system directories
- Intention payloads are capped at 64KB; MCP request payloads at 512KB
- Maximum 50 intentions per session to prevent memory exhaustion
- All tool invocations are audit-logged to stderr (JSON format)
- The server makes zero network calls — all operations are local filesystem I/O
