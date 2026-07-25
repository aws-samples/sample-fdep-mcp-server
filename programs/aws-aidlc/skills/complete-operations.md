---
id: complete-operations
name: Complete AI-DLC Operations
description: AI-DLC's Operations phase is a placeholder in the AWS Labs release. This skill completes it by routing FDE's existing operations programs (resilience review, AI BOM, deployment, observability, production-readiness graduation) into AI-DLC's Operations phase. Produces the index `aidlc-docs/operations/operations-plan.md` that satisfies the `aws-aidlc` program's `aidlc-operations-complete` exit criterion.
trigger:
  kind: command
  phrase: "/aidlc-operations"
outputs:
  - name: aidlc-operations-plan
    path: aidlc-docs/operations/operations-plan.md
    kind: document
  - name: operations-kickoff-receipt
    path: artifacts/aws-aidlc/operations-kickoff-{timestamp}.md
    kind: document
---

## Objective

Complete AI-DLC's Operations phase by orchestrating the FDE programs that own each Operations sub-stage. AI-DLC declares Operations as a placeholder; FDE has working programs for every sub-stage; this skill is the orchestrator that runs them and produces a unified `aidlc-docs/operations/` tree so the AI-DLC three-phase model is honoured end-to-end.

This is **not** a duplication of work. The substance lives in the FDE artifacts; AI-DLC's Operations directory contains links and short summaries that route a reader from the AI-DLC narrative to the FDE artifact for each sub-stage.

## Pre-flight

1. **Verify Construction is complete.** `aidlc-docs/construction/build-and-test/` must exist. If not: refuse with "Construction is not complete. Run `/aidlc-construction` first."
2. **Verify the dependent FDE programs are activated.** Check `pipeline.json` and the planner output:
   - `resilience` should be active for resilience routing
   - `ai-operations` should be active for AI BOM routing
   - `ai-native-app-builder` should be active for deployment / observability routing
   If any required program is not in the active set, surface the gap to the FDE and ask whether to add it.
3. **Verify `appLevel`.** Operations work scales with the appLevel:
   - `PoC` — operations is light: cost cap, kill-switch rehearsal, basic CloudWatch
   - `MVP` — full set: resilience review, AI BOM, named alarms, runbook
   - `Production` — full set + chaos cadence, SLOs, on-call rotation, regulator-readiness drill
   Read `state.appLevel` and use the matching subset.

## Procedure — orchestration of six sub-stages

For each AI-DLC Operations sub-stage, the skill:
1. Invokes the corresponding FDE skill (or tells the FDE to invoke it if user-driven).
2. Waits for the FDE artifact to land.
3. Writes a short AI-DLC-side document under `aidlc-docs/operations/` that links to it.
4. Records progress in `state/history.jsonl`.

### Sub-stage 1 — Deployment planning and execution

| Field | Value |
|---|---|
| FDE owner | `ai-native-app-builder` Phase 5 deployment workflow + `cross-deployment-guide` reference |
| FDE skills to invoke | The deployment-related tasks under `ai-native-app-builder/skills/` (typically the build-app skill or a dedicated deploy skill if present) |
| AI-DLC document to write | `aidlc-docs/operations/deployment.md` linking to `artifacts/ai-native-app-builder/deploy-{ts}.md` (or whatever artifact path the FDE skill emits) |
| `appLevel` scaling | PoC: manual `cdk deploy` from a developer machine. MVP: dev→staging gate. Production: full CD with prod approval. |

### Sub-stage 2 — Monitoring and observability setup

| Field | Value |
|---|---|
| FDE owner | `ai-native-app-builder` Phase 5 + `cross-observability-evaluation` reference |
| FDE skills to invoke | Same Phase 5 family as deployment |
| AI-DLC document | `aidlc-docs/operations/observability.md` linking to `artifacts/ai-native-app-builder/observability-{ts}.md` |
| `appLevel` scaling | PoC: basic CloudWatch + structured request log. MVP: named alarms + runbook for top-3 failure modes. Production: AI-specific metrics (hallucination, fairness), continuous evaluation, on-call rotation. |

### Sub-stage 3 — Incident response procedures

| Field | Value |
|---|---|
| FDE owner | `ai-operations` |
| FDE skill to invoke | `/ai-bom` (produces or updates the AI Business Operating Manual section 4) |
| AI-DLC document | `aidlc-docs/operations/incident-response.md` linking to the BOM section 4 |
| `appLevel` scaling | All levels include this; the bar tightens at MVP (rotation operational) and Production (SLA per incident class). |

### Sub-stage 4 — Maintenance and support workflows

| Field | Value |
|---|---|
| FDE owner | `ai-operations` |
| FDE skill to invoke | `/ai-bom` (produces or updates AI BOM sections 5 — drift / deprecation, 6 — audit readiness) |
| AI-DLC document | `aidlc-docs/operations/maintenance.md` linking to BOM sections 5“6 |
| `appLevel` scaling | PoC: documented intent only. MVP: drift detector running, retirement procedure documented. Production: + regulator-readiness drill cadence. |

### Sub-stage 5 — Production readiness checklists

| Field | Value |
|---|---|
| FDE owner | `ai-native-app-builder` `app-level` graduation criteria |
| FDE skill to invoke | None — this sub-stage extracts checklist content from the AI-DLC inception requirements (the `[MVP]` and `[Production]` tagged criteria). |
| AI-DLC document | `aidlc-docs/operations/production-readiness.md` listing the `[MVP]` and `[Production]` acceptance-criteria lines from `aidlc-docs/inception/requirements/` with their current pass / fail status |
| `appLevel` scaling | PoC engagements list this as a forward-looking checklist. MVP engagements list `[MVP]` lines as current targets. Production engagements list both, all required to pass. |

### Sub-stage 6 — Resilience and failure-mode review

| Field | Value |
|---|---|
| FDE owner | `resilience` |
| FDE skill to invoke | `/resilience-review` |
| AI-DLC document | `aidlc-docs/operations/resilience.md` linking to `artifacts/resilience-reviews/resilience-{ts}.md` |
| `appLevel` scaling | PoC: failure-mode posture only. MVP: + chaos experiments scheduled. Production: + chaos cadence and SLO-tied alarms. |

## Index file — `aidlc-docs/operations/operations-plan.md`

After each sub-stage completes, append (or update) the index file at `aidlc-docs/operations/operations-plan.md`. The structure:

```markdown
# AI-DLC Operations Phase — {customer}

**Status:** {in-progress | complete}
**Phase entered:** {iso}
**Phase completed:** {iso or '-'}
**`appLevel`:** {PoC | MVP | Production}

## Sub-stage status

| Sub-stage | AI-DLC doc | FDE owner | Status | Last updated |
|---|---|---|---|---|
| Deployment | deployment.md | ai-native-app-builder | ... | ... |
| Observability | observability.md | ai-native-app-builder | ... | ... |
| Incident Response | incident-response.md | ai-operations | ... | ... |
| Maintenance | maintenance.md | ai-operations | ... | ... |
| Production Readiness | production-readiness.md | ai-native-app-builder | ... | ... |
| Resilience | resilience.md | resilience | ... | ... |

## Audit trail

Verbatim user input for every sub-stage acknowledgement is in AI-DLC's `aidlc-docs/audit.md`. FDE-program-level decisions are in `state/history.jsonl`.

## When AWS Labs ships AI-DLC Operations rules

This file and the routing under `aidlc-docs/operations/` were produced before AWS Labs published the upstream Operations content. When that lands, this index will be re-evaluated. Until then, the routing above is authoritative for AI-DLC Operations in this engagement.
```

## State and audit-trail updates

After each sub-stage completes:
- Append a decision entry to `state/history.jsonl` with kind `aidlc-operations-substage-complete`, `detail` containing the sub-stage name, the AI-DLC doc path, the FDE artifact path, and an `evidence` field citing the FDE's verbatim acknowledgement (or the FDE-skill's own evidence chain).

After all six sub-stages complete:
- Write final state of the index file (status: complete, phase completed: iso).
- Append a decision entry of kind `aidlc-operations-complete`.
- Update `state/current.yaml`:
  - `currentStage: ai-native`
  - `aidlcOperationsCompleteAt: <iso>`
- **Re-resolve and re-render (MANDATORY).** After advancing to `ai-native` stage:
  - Call `fde_patch_intention` to record the final state (all phases complete).
  - Call `fde_resolve` to get the final program activation set for the ai-native stage.
  - Call `fde_render` to write any remaining program steering/skills.
  - Report the final active program set to the FDE.
- **Re-resolve and re-render (MANDATORY).** After advancing to `ai-native` stage:
  - Call `fde_patch_intention` to record the final state (all phases complete, final AIM scores if assessed).
  - Call `fde_resolve` to get the final program activation set for the ai-native stage.
  - Call `fde_render` with the engagement directory to write any remaining program steering/skills.
  - Report the final active program set to the FDE.
- Tell the FDE: "AI-DLC Operations phase is complete. Engagement stage advanced to ai-native. All FDE programs for this engagement are now activated and their guidance is available."

## Done when

- All six AI-DLC Operations sub-stages have entries in `aidlc-docs/operations/operations-plan.md` with status `complete` (per the engagement's `appLevel` scope — PoC engagements may have certain sub-stages explicitly marked `deferred-to-MVP` rather than complete).
- The corresponding FDE artifacts exist for each completed sub-stage.
- `state/history.jsonl` has an `aidlc-operations-complete` decision entry.
- `currentStage` advanced to `ai-native`.

## What this skill does NOT do

- **Does not re-implement FDE skills.** It calls (or asks the FDE to call) the existing FDE skills (`/resilience-review`, `/ai-bom`, etc.) and links to their output.
- **Does not write into FDE program artifact directories.** AI-DLC's Operations docs link to FDE artifacts; they do not copy them.
- **Does not block on AI-DLC's upstream Operations rules.** When AWS Labs ships those, this skill is the most likely to need an update; until then it bridges the gap.

## When AWS Labs publishes AI-DLC Operations rules

The bridge steering documents the upstream-conflict policy. In short: this skill's routing is authoritative until AWS Labs ships their own Operations content; at that point we re-evaluate and likely shift toward letting AI-DLC own more of the substance, with FDE programs as deeper-dives. The `aidlc-docs/operations/` tree is forward-compatible with that change because everything in it is link-only.

## Anti-patterns this skill rejects

- **Generating placeholder documents under `aidlc-docs/operations/` for sub-stages that haven't run.** The index lists sub-stage status; it does not pre-populate the linked documents.
- **Skipping a sub-stage because "PoC doesn't need it"** without explicit FDE acknowledgement. PoC engagements may legitimately defer sub-stages, but the deferral is recorded as a decision, not silent.
- **Treating FDE artifact paths as immutable.** If an FDE skill emits its artifact at a different path than the routing table expects, the routing follows the actual path; the table is a guide, not a contract.
