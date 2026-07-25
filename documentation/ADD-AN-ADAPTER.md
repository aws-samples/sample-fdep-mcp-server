# Adding a new platform adapter

Adapters map a `PlatformTarget` id to file paths (or, for the MCP
adapter, to MCP tool responses). The registry is bootstrapped from the
declarative `adapters/manifest.json`, so adding a platform is a **data
change plus one adapter module**.

Target time: one hour.

## The six touch points

1. **`adapters/manifest.json`** — add a new entry with `id`, `style`,
   optional `targetDir`, and `module`.
2. **`adapters/<id>/adapter.ts`** — new module exporting a
   `PlatformAdapter` value.
3. **`core/src/renderer/index.ts`** — widen the `PlatformTarget` union
   to include the new id.
4. **`core/src/renderer/registry.ts`** — import the adapter module and
   bind it in `ADAPTER_BY_MODULE`.
5. **`core/src/mcp/tools.ts`** — add the id to the enum in the
   `fde_render` tool's JSON schema.

That is the whole surface area. The renderer orchestrator and the
shared adapter contract tests pick up the new adapter automatically.

## Manifest entry

```json
{
  "id": "my-platform",
  "style": "file",
  "targetDir": ".myplatform",
  "module": "../../../adapters/my-platform/adapter.js"
}
```

- `style: "file"` — writes artifacts under `targetDir`.
- `style: "mcp"` — writes nothing; content is served via
  `fde_get_skill` and `fde_get_steering`. Omit `targetDir` for
  MCP-style adapters.

## Adapter module

```typescript
import type {
  PlatformAdapter,
  PlatformCapability,
  RenderContext,
  Skill,
  SteeringFile,
  WrittenFile,
} from "../../core/src/renderer/index.js";

export const myPlatformAdapter: PlatformAdapter = {
  id: "my-platform",
  style: "file",
  targetDir: ".myplatform",
  capabilities: new Set<PlatformCapability>([]),
  supports: () => false,
  renderSteering(steering: SteeringFile, _ctx: RenderContext): WrittenFile[] {
    return [
      {
        path: `.myplatform/${steering.programId}-${steering.id}.md`,
        content: steering.body,
      },
    ];
  },
  renderSkill(skill: Skill, _ctx: RenderContext): WrittenFile[] {
    return [
      {
        path: `.myplatform/skills/${skill.programId}-${skill.id}.md`,
        content: skill.body,
      },
    ];
  },
  renderSpec(_spec, _ctx) { return []; },
};
```

## Contract

- Every `WrittenFile.path` MUST start with `targetDir` (file-style).
  The orchestrator enforces this via `RenderIsolationError`.
- The `supports(capability)` function MUST be total — it returns a
  boolean for every `PlatformCapability` value.
- Managed files are written with an `FDE_MANAGED` header that carries
  a content hash; adapters do not need to emit this themselves.

## Graceful degradation

When a target lacks native auto-steering, emit section headings of the
form `## When working on <glob>` so the steering stays discoverable
(Requirement 5.17).

## Tests

The shared adapter contract tests in `core/test/adapter-stubs.test.ts`
iterate every registered adapter and assert:

- File-style adapters only emit paths under `targetDir`.
- Every emitted file carries an `FDE_MANAGED` header after
  `writeManaged`.
- `supports(cap)` is total.

New adapters inherit these tests automatically. Run them with:

```powershell
npm test -- adapter-stubs
```

## Success looks like

Use the MCP tools to test your adapter:

1. `fde_load_intention` with a test intention
2. `fde_resolve` to get the activation graph
3. `fde_render` with `targets: ["my-platform"]`

Files land under the new target's subtree and every file carries an
`FDE_MANAGED` header.
