# AWS AI-DLC ↔ Extensions Overview

AI-DLC ships an extensions system that layers additional rules on top of the core three-phase workflow. Extensions are markdown files under `aws-aidlc-rule-details/extensions/`, grouped by category. They are how AI-DLC integrates security, testing, compliance, and other concerns without bloating the core workflow.

This reference summarises how extensions work and how they intersect with FDE programs.

## How extensions work (per AI-DLC's own docs)

Each extension consists of two files in the same directory:

1. A **rules file** (e.g., `security-baseline.md`) with the actual rules.
2. An **opt-in file** (e.g., `security-baseline.opt-in.md`) with a structured multiple-choice question presented to the user during Requirements Analysis.

At workflow start, AI-DLC scans `extensions/` and loads only the lightweight `*.opt-in.md` files ↔ not the full rule files. This is a context-optimization: full rules load on-demand only after the user opts in.

When the user opts **in**, the corresponding rule file is loaded by naming convention (`security-baseline.opt-in.md` → `security-baseline.md`). When the user opts **out**, the rule file is never loaded ↔ context savings.

Extensions without a matching `*.opt-in.md` file are **always enforced** ↔ their rule files load immediately at workflow start.

## Enforcement (when an extension is enabled)

Per AI-DLC's rules:

- Extension rules are **hard constraints**, not optional guidance.
- At each stage, the model evaluates which extension rules are applicable and enforces only those.
- Non-applicable rules are marked `N/A` in the compliance summary (not blocking).
- Non-compliance with any applicable enabled rule is a **blocking finding** ↔ stage completion is refused until resolved.
- Stage-completion summaries include extension-rule compliance status.

## Built-in extensions

The AWS Labs release ships:

```
aws-aidlc-rule-details/extensions/
├──"—└── security/
│   ├──—└── baseline/
│       ├──"—└── security-baseline.md
│       ├──—└── security-baseline.opt-in.md
├──—└── testing/
    ├──—└── property-based/
        ├──"—└── property-based-testing.md
        ├──—└── property-based-testing.opt-in.md
```

The README explicitly notes: the security extension is **directional reference** ↔ each organisation should build, customise, and test their own security rules before production use.

## How FDE programs interact with AI-DLC extensions

FDE programs and AI-DLC extensions are complementary, not competing.

| FDE program | AI-DLC extension equivalent | Relationship |
|---|---|---|
| `responsible-ai` | (no equivalent extension shipped) | FDE owns RAI. The `aidlc-fde-bridge.md` causes AI-DLC's Inception to read FDE's RAI guardrail design as input to its rules. |
| `resilience` | (no equivalent extension shipped) | FDE owns resilience. Routed into AI-DLC Operations via `complete-operations.md`. |
| `ai-operations` | (no equivalent extension shipped) | FDE owns AI BOM. Routed into AI-DLC Operations. |
| `aim` | (no equivalent extension shipped) | FDE owns the org-level assessment. AI-DLC's Workflow Planning consumes AIM tier as a complexity signal. |
| (none) | `security-baseline` (built-in) | When opted in, AI-DLC enforces baseline security at every stage. FDE programs do not duplicate these rules. |
| (none) | `property-based-testing` (built-in) | When opted in, AI-DLC's Construction phase enforces PBT in test design. |

## Recommended extension usage in FDE engagements

For most FDE engagements with `aws-aidlc` active, the recommendation is:

- **Opt in** to `security/baseline` for any engagement in a regulated industry (`intake.regulated === true`).
- **Opt in** to `testing/property-based` for any engagement that produces customer-facing software (most build engagements).
- **Add a custom extension** for engagement-specific compliance ↔ e.g., a healthcare engagement might add `compliance/hipaa` with HIPAA-specific verification checks.

The opt-in is per-engagement and persisted in `aidlc-docs/aidlc-state.md` under the `Extension Configuration` section. FDE does not override this; the FDE answers AI-DLC's opt-in questions during Requirements Analysis.

## Authoring custom extensions for an FDE engagement

When an engagement needs an extension that doesn't ship in AI-DLC's release, the FDE can author one in `aws-aidlc-rule-details/extensions/<category>/<name>/`. The convention from AI-DLC's README:

1. Create a directory under `extensions/` (e.g., `extensions/compliance/hipaa/`).
2. Add a rules file (e.g., `hipaa.md`) following AI-DLC's rule structure:
   - Each rule is a heading `## Rule <PREFIX-NN>: <Title>` (e.g., `HIPAA-01`, `HIPAA-02`).
   - Include a **Rule** section describing the requirement.
   - Include a **Verification** section with concrete checks the model evaluates.
3. Add an optional matching opt-in file `hipaa.opt-in.md` for user choice. Skip this file to make the extension always-enforced.

Custom extensions live with the engagement (they're inside `aws-aidlc-rule-details/`, which the FDE installed locally). To share them across engagements, propose them upstream to AWS Labs or to the FDE toolkit.

## When AI-DLC extensions and FDE programs disagree

Conflicts are rare because the two layers cover different concerns. If they disagree (e.g., AI-DLC's security extension says "all dependencies must be SHA-pinned" but an FDE program produces an artifact with floating versions), the resolution per `aidlc-fde-bridge.md`:

- Within the AI-DLC phase that's executing, AI-DLC's rules win. The agent enforces the extension and refuses stage completion.
- The FDE program updates its template to match.
- The decision is logged in both `aidlc-docs/audit.md` (verbatim) and `state/history.jsonl` (FDE-program decision).

This means AI-DLC extensions can drive FDE program improvements when they catch a conflict during Construction.

## What this reference does NOT cover

- **The exact content of the security and testing extensions.** Read those files in `aws-aidlc-rule-details/extensions/` after install ↔ the upstream content is canonical, and we don't duplicate it here.
- **AI-DLC's deferred-loading mechanism.** The README documents it; the agent reads `*.opt-in.md` files at workflow start and rule files on demand.
- **FDE-specific extension authoring patterns.** That's a future direction; for now, follow AI-DLC's authoring convention exactly.
