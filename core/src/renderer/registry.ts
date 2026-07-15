/**
 * Adapter registry — maps harness target ids to adapter implementations.
 *
 * Requirements: 5.2 (intention-driven harness), 4.8, 6.2, 11.4 (legacy)
 *
 * The registry is bootstrapped from the declarative `adapters/manifest.json`
 * rather than by hard-coding the adapter list here. The manifest is the
 * source of truth for:
 *   - the set of registered `HarnessTarget` ids (all 14),
 *   - each adapter's `style` (`"file"` vs `"mcp"`),
 *   - each file-style adapter's `targetDir` (e.g. `.kiro/`, `.github/`),
 *   - the module specifier where each adapter's implementation lives.
 *
 * Because ESM requires module specifiers to be statically analyzable, the
 * actual `import` statements for each adapter are still emitted at the top
 * of this file. The manifest's `module` field is validated at load time
 * against the static import table so the two stay in lock-step.
 *
 * Extended for the intention-driven harness pivot to 14 targets:
 *   - Pre-pivot file-based: kiro, claude, copilot, codex, cursor
 *   - Post-pivot file-based: cline, continue, aider, windsurf, zed,
 *   - MCP-native (no file output): mcp
 */

import type { HarnessAdapter, HarnessTarget, AdapterStyle } from "./index.js";

import manifest from "../../../adapters/manifest.json" with { type: "json" };

import { kiroAdapter } from "../../../adapters/kiro/adapter.js";
import { claudeAdapter } from "../../../adapters/claude/adapter.js";
import { copilotAdapter } from "../../../adapters/copilot/adapter.js";
import { cursorAdapter } from "../../../adapters/cursor/adapter.js";
import { codexAdapter } from "../../../adapters/codex/adapter.js";
import { clineAdapter } from "../../../adapters/cline/adapter.js";
import { continueAdapter } from "../../../adapters/continue/adapter.js";
import { aiderAdapter } from "../../../adapters/aider/adapter.js";
import { windsurfAdapter } from "../../../adapters/windsurf/adapter.js";
import { zedAdapter } from "../../../adapters/zed/adapter.js";
import { chatgptCustomGptAdapter } from "../../../adapters/chatgpt-custom-gpt/adapter.js";
import { geminiCodeAssistAdapter } from "../../../adapters/gemini-code-assist/adapter.js";
import { mcpAdapter } from "../../../adapters/mcp/adapter.js";

/* ------------------------------------------------------------------ */
/*  Manifest-backed registry                                           */
/* ------------------------------------------------------------------ */

/** Shape of a single manifest entry. Mirrors `adapters/manifest.json`. */
interface AdapterManifestEntry {
  readonly id: string;
  readonly style: AdapterStyle;
  readonly targetDir?: string;
  readonly module: string;
}

interface AdapterManifest {
  readonly adapters: readonly AdapterManifestEntry[];
}

/**
 * Static lookup from the `module` field in the manifest to the imported
 * adapter value. Keeping this table colocated with the imports lets the
 * TypeScript compiler verify every adapter is bound at build time while
 * still letting the manifest drive enumeration, ids, and layout metadata.
 */
const ADAPTER_BY_MODULE: Readonly<Record<string, HarnessAdapter>> = {
  "../../../adapters/kiro/adapter.js": kiroAdapter,
  "../../../adapters/claude/adapter.js": claudeAdapter,
  "../../../adapters/copilot/adapter.js": copilotAdapter,
  "../../../adapters/cursor/adapter.js": cursorAdapter,
  "../../../adapters/codex/adapter.js": codexAdapter,
  "../../../adapters/cline/adapter.js": clineAdapter,
  "../../../adapters/continue/adapter.js": continueAdapter,
  "../../../adapters/aider/adapter.js": aiderAdapter,
  "../../../adapters/windsurf/adapter.js": windsurfAdapter,
  "../../../adapters/zed/adapter.js": zedAdapter,
  "../../../adapters/chatgpt-custom-gpt/adapter.js": chatgptCustomGptAdapter,
  "../../../adapters/gemini-code-assist/adapter.js": geminiCodeAssistAdapter,
  "../../../adapters/mcp/adapter.js": mcpAdapter,
};

/**
 * Build the `HarnessTarget -> HarnessAdapter` registry from the manifest.
 * Validates that:
 *   - every manifest `module` is present in `ADAPTER_BY_MODULE`,
 *   - the adapter's runtime `id` matches the manifest `id`,
 *   - the adapter's `style` matches the manifest `style`,
 *   - the adapter's `targetDir` matches the manifest `targetDir` (both
 *     present for file-style, both absent for mcp-style).
 */
function buildRegistry(): Record<HarnessTarget, HarnessAdapter> {
  const typedManifest = manifest as AdapterManifest;
  const registry: Partial<Record<HarnessTarget, HarnessAdapter>> = {};

  for (const entry of typedManifest.adapters) {
    const adapter = ADAPTER_BY_MODULE[entry.module];
    if (!adapter) {
      throw new Error(
        `adapters/manifest.json references module '${entry.module}' but no matching import is bound in registry.ts.`,
      );
    }
    if (adapter.id !== entry.id) {
      throw new Error(
        `Manifest entry '${entry.id}' is bound to adapter with id '${adapter.id}'; id mismatch.`,
      );
    }
    if (adapter.style !== entry.style) {
      throw new Error(
        `Manifest entry '${entry.id}' declares style '${entry.style}' but adapter reports '${adapter.style}'.`,
      );
    }
    if (adapter.targetDir !== entry.targetDir) {
      throw new Error(
        `Manifest entry '${entry.id}' declares targetDir '${String(entry.targetDir)}' but adapter reports '${String(adapter.targetDir)}'.`,
      );
    }
    if (registry[entry.id as HarnessTarget] !== undefined) {
      throw new Error(`Duplicate adapter id '${entry.id}' in manifest.`);
    }
    registry[entry.id as HarnessTarget] = adapter;
  }

  return registry as Record<HarnessTarget, HarnessAdapter>;
}

const REGISTRY: Record<HarnessTarget, HarnessAdapter> = buildRegistry();

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Return the adapter for `target`, or throw with the list of valid targets. */
export function getAdapter(target: string): HarnessAdapter {
  const adapter = REGISTRY[target as HarnessTarget];
  if (adapter) return adapter;
  throw new Error(
    `Unknown harness target '${target}'. Registered adapters: ${listAdapters().join(", ")}`,
  );
}

/** List all registered harness target ids. */
export function listAdapters(): HarnessTarget[] {
  return Object.keys(REGISTRY) as HarnessTarget[];
}
