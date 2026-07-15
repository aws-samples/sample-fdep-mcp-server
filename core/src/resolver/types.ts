/**
 * Resolver types — the ResolvedGraph contract.
 *
 * The resolver takes an Intention plus the loaded program/lens catalog and
 * produces a deterministic graph of active programs, active lenses, their
 * overlay-composed effective artifacts, and diagnostics (design.md
 * §Components — Resolver).
 *
 * All public types are `readonly` so downstream consumers (CLI, MCP server,
 * renderer orchestrator) cannot mutate resolver output. Sort orderings are
 * specified in prose at each field definition and enforced by the resolver
 * implementation and its property tests (P1, P2).
 *
 * The shared catalog types (`Program`, `Lens`, `LensOverlay`,
 * `ActivationBlock`, `ActivationRule`, `ExitCriterion`) mirror the JSON
 * schemas under `schemas/` and are the contract the loader phase is
 * expected to satisfy.
 */

import type { Intention, Industry } from "../intention/types.js";
import type { LoadedProgram } from "../loader/index.js";

/* ------------------------------------------------------------------ */
/*  Catalog types (mirror `schemas/program.schema.json` &              */
/*  `schemas/lens.schema.json`).                                       */
/* ------------------------------------------------------------------ */

/** Boolean combiner for an activation block. */
export type ActivationCombine = "any" | "all";

/** A single activation rule: DSL expression + weight + optional reason. */
export interface ActivationRule {
  readonly when: string;
  readonly weight: number;
  readonly reason?: string;
}

/** Activation predicate block shared by programs and lenses. */
export interface ActivationBlock {
  readonly combine?: ActivationCombine;
  readonly rules: readonly ActivationRule[];
}

/** An exit criterion on a program (may be added/overridden by a lens). */
export interface ExitCriterion {
  readonly id: string;
  readonly description: string;
  readonly check: "manual" | "artifact-exists" | "state-matches";
  readonly target?: string;
}

/** A lens overlay targeting a single program by id. */
export interface LensOverlay {
  readonly targetProgram: string;
  readonly addSteering?: readonly string[];
  readonly addSkills?: readonly string[];
  readonly addExitCriteria?: readonly ExitCriterion[];
  readonly overrideExitCriteria?: readonly ExitCriterion[];
  readonly additionalTags?: readonly string[];
}

/**
 * Program catalog type as seen by the resolver (mirrors
 * `schemas/program.schema.json`). The loader produces richer
 * `LoadedProgram` values that are structurally compatible with this shape.
 */
export interface Program {
  readonly id: string;
  readonly kind: "program";
  readonly version: string;
  readonly activation: ActivationBlock;
  readonly skills: readonly string[];
  readonly steering: readonly string[];
  readonly templates: readonly string[];
  readonly exitCriteria: readonly ExitCriterion[];
  readonly dependsOn?: readonly string[];
  readonly tags?: readonly string[];
}

/**
 * Lens catalog type as seen by the resolver (mirrors
 * `schemas/lens.schema.json`).
 */
export interface Lens {
  readonly id: string;
  readonly kind: "lens";
  readonly industry: Industry;
  readonly activation: ActivationBlock;
  readonly overlays: readonly LensOverlay[];
  readonly tags?: readonly string[];
}

/**
 * A parsed lens manifest as produced by the loader. Adds on-disk
 * provenance fields on top of the catalog `Lens` shape.
 */
export interface LoadedLens {
  readonly id: string;
  readonly kind: "lens";
  readonly industry: string;
  readonly activation: ActivationBlock;
  readonly overlays: readonly LensOverlay[];
  readonly tags?: readonly string[];
  /** Absolute path to the lens directory on disk. */
  readonly _dir: string;
  /** Absolute path to the lens.yaml file. */
  readonly _manifestPath: string;
}

/* ------------------------------------------------------------------ */
/*  Resolver I/O                                                        */
/* ------------------------------------------------------------------ */

/** Input to `resolve()`. */
export interface ResolveInput {
  readonly intention: Intention;
  readonly programs: readonly LoadedProgram[];
  readonly lenses: readonly LoadedLens[];
}

/** Output of `resolve()`. Deterministic modulo `generatedAt`. */
export interface ResolvedGraph {
  /** SHA-256 over canonical-JSON sorted-key intention. */
  readonly intentionChecksum: string;
  /**
   * Active programs sorted by (score DESC, id ASC). Every entry has
   * `score > 0`.
   */
  readonly activePrograms: readonly ActiveProgram[];
  /** Active lenses sorted by id ASC. */
  readonly activeLenses: readonly ActiveLens[];
  /** Non-fatal resolver diagnostics (unresolved deps, overlay conflicts). */
  readonly diagnostics: readonly ResolverDiagnostic[];
  /** ISO-8601 timestamp of resolution. */
  readonly generatedAt: string;
}

export interface ActiveProgram {
  readonly id: string;
  readonly score: number;
  readonly trace: readonly ActivationTrace[];
  /** Lens-overlay composed steering paths. Sorted lexicographically. */
  readonly effectiveSteering: readonly string[];
  /** Lens-overlay composed skill paths. Sorted lexicographically. */
  readonly effectiveSkills: readonly string[];
  /** Lens-overlay composed exit criteria. Sorted by id. */
  readonly effectiveExitCriteria: readonly ExitCriterion[];
  /** Ids of lenses that contributed overlays, deduplicated, sorted. */
  readonly overlayedBy: readonly string[];
}

export interface ActiveLens {
  readonly id: string;
  readonly score: number;
  readonly trace: readonly ActivationTrace[];
}

/** One entry in an activation trace — one rule's evaluation outcome. */
export interface ActivationTrace {
  readonly when: string;
  readonly weight: number;
  readonly matched: boolean;
  readonly reason?: string;
}

/**
 * Known resolver diagnostic codes. `code` is typed as `string` on
 * `ResolverDiagnostic` to leave room for future codes without breaking
 * consumers; these constants are the set emitted today.
 */
export type ResolverDiagnosticCode =
  | "UnresolvedDependency"
  | "OverlayConflict"
  | "OverlayError";

export interface ResolverDiagnostic {
  readonly severity: "warning" | "error";
  readonly code: string;
  readonly programId?: string;
  readonly lensId?: string;
  readonly detail: string;
}
