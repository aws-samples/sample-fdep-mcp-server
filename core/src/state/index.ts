/**
 * State Manager — owns reads and writes to engagement state and the
 * append-only state/history.jsonl decision log.
 *
 * Also provides checksum-based integrity verification and a replay-from-
 * history reset path (task 13.3).
 *
 * Requirements: 3.1, 3.2, 3.4, 7.1, 7.2, 7.3, 7.4, 11.6
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { stringify, parse } from "yaml";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PipelineStage = "intent" | "assess" | "transform" | "ai-native";

export interface Decision {
  ts: string;
  actor: "fde" | "harness" | "planner";
  kind: string;
  detail: Record<string, unknown>;
  /**
   * SHA-256 hex digest of the full engagement state AFTER this decision
   * was applied. Optional for backward compatibility with legacy history
   * entries written before task 13.3; required on every newly-written row.
   */
  stateChecksum?: string;
}

export interface EngagementState {
  customer: string;
  intent: string[];
  intake: Record<string, unknown>;
  aimTier?: 1 | 2 | 3 | 4 | 5 | undefined;
  currentStage: PipelineStage;
  decisions: Decision[];
  startedAt: string;
  updatedAt: string;
}

/** Patch shape accepted by `updateState`. */
export type StatePatch = Partial<
  Omit<EngagementState, "customer" | "startedAt" | "decisions">
>;

/* ------------------------------------------------------------------ */
/*  Path helpers                                                       */
/* ------------------------------------------------------------------ */

function statePath(engagementDir: string): string {
  return path.join(engagementDir, "state", "current.yaml");
}

function historyPath(engagementDir: string): string {
  return path.join(engagementDir, "state", "history.jsonl");
}

/* ------------------------------------------------------------------ */
/*  Canonicalization + checksum                                        */
/* ------------------------------------------------------------------ */

/**
 * Recursively project a value to a canonical form: arrays map element-wise,
 * objects have their keys sorted alphabetically, and `undefined` entries are
 * dropped. Primitive values pass through unchanged. This produces a
 * deterministic textual form suitable for hashing across Node versions.
 */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const v = obj[key];
    if (v === undefined) continue;
    out[key] = canonicalize(v);
  }
  return out;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/**
 * Build the canonical object used for checksum computation. Decisions are
 * projected to their core fields ONLY — any recorded `stateChecksum` is
 * excluded so the hash is an invariant of the state content itself (and
 * doesn't collide with its own storage).
 */
function canonicalStateForHash(state: EngagementState): unknown {
  return {
    customer: state.customer,
    intent: state.intent,
    intake: state.intake,
    aimTier: state.aimTier,
    currentStage: state.currentStage,
    decisions: state.decisions.map((d) => ({
      ts: d.ts,
      actor: d.actor,
      kind: d.kind,
      detail: d.detail,
    })),
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
  };
}

/**
 * Compute a stable SHA-256 hex digest of the engagement state. The digest
 * is deterministic across Node versions and independent of JavaScript's
 * object-insertion order (keys are sorted recursively before hashing).
 *
 * The `stateChecksum` field on stored decisions is NOT included in the
 * hash input so the digest is an invariant of the state content.
 *
 * @see Requirements 7.3, 11.6
 */
export function computeStateChecksum(state: EngagementState): string {
  return createHash("sha256")
    .update(stableStringify(canonicalStateForHash(state)), "utf8")
    .digest("hex");
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Load the current engagement state from `state/current.yaml`.
 */
export function loadState(engagementDir: string): EngagementState {
  const raw = fs.readFileSync(statePath(engagementDir), "utf-8");
  return parse(raw) as EngagementState;
}

/**
 * Write the full engagement state to `state/current.yaml`.
 * Does NOT touch history.jsonl — use `updateState` for tracked changes.
 */
export function writeState(engagementDir: string, state: EngagementState): void {
  const stateDir = path.join(engagementDir, "state");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath(engagementDir), stringify(state), "utf-8");
}

/**
 * Apply a partial patch to the engagement state, append a decision entry
 * to `state/history.jsonl`, and write the updated `state/current.yaml`.
 *
 * The decision entry:
 * - Records the patch in `detail.patch` so it can be replayed by `resetState`.
 * - Carries a `stateChecksum` computed over the full updated state AFTER
 *   the patch was applied.
 *
 * The log is strictly append-only — existing entries are never deleted,
 * reordered, or rewritten.
 */
export function updateState(
  engagementDir: string,
  patch: StatePatch,
  decision: Omit<Decision, "ts" | "stateChecksum">,
): EngagementState {
  const current = loadState(engagementDir);
  const ts = new Date().toISOString();

  // Record the patch inside detail so resetState can replay it.
  const entry: Decision = {
    ...decision,
    ts,
    detail: { ...decision.detail, patch: { ...patch } },
  };

  const updated: EngagementState = {
    ...current,
    ...patch,
    updatedAt: ts,
    decisions: [...current.decisions, entry],
  };

  // Compute the post-apply checksum and stamp it on the decision. Because
  // `entry` is the same object reference in `updated.decisions`, setting
  // it here ensures the state YAML and the history row agree.
  entry.stateChecksum = computeStateChecksum(updated);

  writeState(engagementDir, updated);
  fs.appendFileSync(
    historyPath(engagementDir),
    JSON.stringify(entry) + "\n",
    "utf-8",
  );

  return updated;
}

/**
 * Read all decision entries from `state/history.jsonl`.
 */
export function readHistory(engagementDir: string): Decision[] {
  const raw = fs.readFileSync(historyPath(engagementDir), "utf-8").trim();
  if (raw === "") return [];
  return raw.split("\n").map((line, index) => {
    try {
      return JSON.parse(line) as Decision;
    } catch {
      throw new Error(
        `Malformed JSON at line ${index + 1} of state/history.jsonl. ` +
          `The history file may be corrupted.`,
      );
    }
  });
}

/**
 * Initialize a fresh engagement state directory with current.yaml and
 * history.jsonl.
 *
 * The last (most recent) decision in `state.decisions` is stamped with a
 * `stateChecksum` computed over the full initial state so that
 * `verifyStateIntegrity` passes immediately after initialization.
 */
export function initState(engagementDir: string, state: EngagementState): void {
  const stateDir = path.join(engagementDir, "state");
  fs.mkdirSync(stateDir, { recursive: true });

  // Stamp the most recent decision with the checksum of the initial state.
  // This treats the engagement-created row as the "current" integrity anchor.
  if (state.decisions.length > 0) {
    const last = state.decisions[state.decisions.length - 1]!;
    last.stateChecksum = computeStateChecksum(state);
  }

  // Write initial state
  writeState(engagementDir, state);

  // Write initial decision(s) to history
  const histFile = historyPath(engagementDir);
  const lines = state.decisions.map((d) => JSON.stringify(d)).join("\n");
  fs.writeFileSync(histFile, lines.length > 0 ? lines + "\n" : "", "utf-8");
}

/* ------------------------------------------------------------------ */
/*  Integrity verification                                             */
/* ------------------------------------------------------------------ */

export interface IntegrityResult {
  ok: boolean;
  reason?: string;
}

/**
 * Verify that `state/current.yaml` is consistent with the latest entry in
 * `state/history.jsonl` by recomputing its checksum and comparing against
 * the checksum stored on the last history row.
 *
 * Returns `{ok: true}` when:
 * - The computed checksum matches the stored one, OR
 * - The last history row carries no `stateChecksum` (legacy engagements
 *   written before task 13.3 are treated as consistent).
 *
 * Returns `{ok: false, reason}` on missing files, parse errors, or a hash
 * mismatch, with `reason` describing which check failed.
 *
 * @see Requirements 3.4, 7.3, 7.4, 11.6
 */
export function verifyStateIntegrity(engagementDir: string): IntegrityResult {
  let state: EngagementState;
  try {
    state = loadState(engagementDir);
  } catch (e) {
    return {
      ok: false,
      reason: `Unable to load state/current.yaml: ${(e as Error).message}`,
    };
  }

  let rawHistory: string;
  try {
    rawHistory = fs.readFileSync(historyPath(engagementDir), "utf-8");
  } catch (e) {
    return {
      ok: false,
      reason: `Unable to read state/history.jsonl: ${(e as Error).message}`,
    };
  }

  const lines = rawHistory
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { ok: false, reason: "state/history.jsonl is empty" };
  }

  let last: Decision;
  try {
    last = JSON.parse(lines[lines.length - 1]!) as Decision;
  } catch (e) {
    return {
      ok: false,
      reason: `Unable to parse last history entry: ${(e as Error).message}`,
    };
  }

  // Legacy: no checksum recorded → treat as consistent.
  if (!last.stateChecksum) {
    return { ok: true };
  }

  const computed = computeStateChecksum(state);
  if (computed !== last.stateChecksum) {
    return {
      ok: false,
      reason: `Checksum mismatch: state/current.yaml hashes to ${computed} but state/history.jsonl records ${last.stateChecksum}`,
    };
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Rebuild from history                                               */
/* ------------------------------------------------------------------ */

/**
 * Rebuild `state/current.yaml` by replaying every decision in
 * `state/history.jsonl` from the beginning.
 *
 * The first decision must be `kind: "engagement-created"` and its `detail`
 * must carry enough seed information to reconstruct the initial state:
 * `customer`, `intent`, `intake`, `aimTier`, `currentStage`, `startedAt`.
 * Each subsequent decision may carry a `detail.patch` that is applied on
 * top of the running state.
 *
 * @throws Error if the history is empty, malformed, or missing the initial
 *         engagement-created decision's seed fields.
 *
 * @see Requirements 3.4, 7.4, 11.6
 */
export function resetState(engagementDir: string): EngagementState {
  const decisions = readHistory(engagementDir);
  if (decisions.length === 0) {
    throw new Error(
      `Cannot rebuild state: state/history.jsonl is empty in ${engagementDir}`,
    );
  }

  const first = decisions[0]!;
  if (first.kind !== "engagement-created") {
    throw new Error(
      `Cannot rebuild state: first history entry has kind '${first.kind}', expected 'engagement-created'`,
    );
  }

  const seed = first.detail as Record<string, unknown>;
  const customer = seed["customer"];
  if (typeof customer !== "string" || customer.length === 0) {
    throw new Error(
      `Cannot rebuild state: engagement-created decision is missing 'customer' in detail`,
    );
  }

  const seedIntent = Array.isArray(seed["intent"]) ? (seed["intent"] as string[]) : [];
  const seedIntake =
    seed["intake"] && typeof seed["intake"] === "object"
      ? (seed["intake"] as Record<string, unknown>)
      : {};
  const seedAimTier = seed["aimTier"] as EngagementState["aimTier"];
  const seedStage = (seed["currentStage"] as PipelineStage) ?? "intent";
  const seedStartedAt =
    typeof seed["startedAt"] === "string" ? (seed["startedAt"] as string) : first.ts;

  let state: EngagementState = {
    customer,
    intent: [...seedIntent],
    intake: { ...seedIntake },
    aimTier: seedAimTier,
    currentStage: seedStage,
    decisions: [first],
    startedAt: seedStartedAt,
    updatedAt: first.ts,
  };

  for (let i = 1; i < decisions.length; i++) {
    const d = decisions[i]!;
    const detail = d.detail as Record<string, unknown>;
    const patch = detail["patch"] as StatePatch | undefined;

    if (patch && typeof patch === "object") {
      state = {
        ...state,
        ...patch,
      };
    }
    state.decisions.push(d);
    state.updatedAt = d.ts;
  }

  writeState(engagementDir, state);
  return state;
}

/* ------------------------------------------------------------------ */
/*  Re-exports                                                         */
/* ------------------------------------------------------------------ */

export {
  applyStateUpdateAndReplan,
  type ApplyStateUpdateInput,
  type ApplyStateUpdateResult,
} from "./workflow.js";
