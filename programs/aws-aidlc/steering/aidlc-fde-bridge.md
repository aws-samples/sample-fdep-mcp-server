---
id: aidlc-fde-bridge
description: "Bridge between AWS AI-DLC methodology and FDE toolkit integration"
inclusion: always
priority: 87
---

# AWS AI-DLC ↔ FDE Bridge (always-on when `aws-aidlc` program is active)

This rule is the integration contract between AI-DLC's three-phase methodology and FDE's program catalog. It tells the agent which surface owns which artifacts and how to route between them without duplicating work.

The bridge is in force only when the `aws-aidlc` program is in the engagement's active program set. When it is, the rules below take precedence over equivalent rules in other programs (e.g., `cross-spec-driven-methodology.md` under `ai-native-app-builder`).

## Detection ↔ is AI-DLC actually installed?

AI-DLC is considered installed if **any** of these are present in the engagement directory:

- `.kiro/steering/aws-aidlc-rules/core-workflow.md`
- `.kiro/steering/aws-aidlc-rules/` (directory)
- `.cursor/rules/ai-dlc-workflow.mdc`
- `.clinerules/core-workflow.md`
- `.github/copilot-instructions.md` containing `AI-DLC`
- `CLAUDE.md` (engagement root) containing `AI-DLC`
- `.claude/CLAUDE.md` containing `AI-DLC`
- `AGENTS.md` (engagement root) containing `AI-DLC`
- `.aidlc-rule-details/` (directory)
- `.kiro/aws-aidlc-rule-details/` (directory)

The state flag `aidlcInstalled: true` in `state/current.yaml` is set by the `/aidlc-install` skill once installation is verified.

## Recommended Program Sequence

When multiple programs are active alongside `aws-aidlc`, follow this order:

```
1. ai-plc (if active)        → /facilitate-working-backwards → defines WHAT and WHY
2. agentpath (if active)     → /design-agent → selects architecture pattern
3. aws-aidlc Inception       → /aidlc-inception → captures detailed requirements + design
4. ai-native-app-builder     → /build-app → implements with tested AWS patterns
5. responsible-ai (if active) → /rai-review → validates before production
6. resilience (if active)    → /map-blast-radius → validates operational readiness
7. aws-aidlc Operations      → /aidlc-operations → deploys, monitors, production-readiness
```

**Why this order matters:**
- `ai-plc` working-backwards output becomes structured input to AI-DLC Inception (saves time, avoids rediscovery)
- `agentpath` architecture decisions inform AI-DLC's Application Design stage
- AI-DLC Inception captures requirements at engineering depth; it shouldn't start from scratch if product strategy already exists

**If `ai-plc` artifacts already exist** when starting AI-DLC Inception, tell AI-DLC:
> "The working-backwards press release and KPI taxonomy are at `artifacts/pdlc/`. Use them as input to Requirements Analysis — do not re-ask questions they already answer."

---

## Phase 1: Inception ↔ discovery surface

| FDE concern | Owner |
|---|---|
| Discovery skill (`/discovery`) | Defers to AI-DLC. Returns a one-line message telling the FDE to start with "Using AI-DLC, ..." which activates AI-DLC Requirements Analysis. |
| Verbatim user input | AI-DLC `aidlc-docs/audit.md` |
| Requirements artifact | AI-DLC `aidlc-docs/inception/requirements/` |
| User stories (if produced) | AI-DLC `aidlc-docs/inception/user-stories/` |
| Application design (if produced) | AI-DLC `aidlc-docs/inception/application-design/` |
| Discovery program's exit criterion | Satisfied by a thin pointer artifact at `artifacts/discovery/intake-{ts}.md` linking to the AI-DLC inception artifacts. The pointer is written by `/aidlc-sync`. |
| FDE intake fields | Mirrored from AI-DLC requirements into `state.intake.*` by `/aidlc-sync`. |

The discovery program's nine-question skill is **not** invoked when AI-DLC is installed. The discovery-first-gate (priority 99) is satisfied by the AI-DLC inception artifacts plus the pointer file.

## Phase 2: Construction ↔ spec and build surface

| FDE concern | Owner |
|---|---|
| **MANDATORY: Read references first** | Before ANY design or code stage, call `fde_get_skill(skillId="build-aws-app", file="references/<layer>.md")`. See `.fde-manifest.json` for the full list. This is NOT optional. |
| Spec methodology (`cross-spec-driven-methodology.md` reference) | Superseded by AI-DLC. The Kiro three-file spec is not produced. |
| Functional design | AI-DLC `aidlc-docs/construction/{unit-name}/functional-design/` — consult `layer-4-ai-workflow.md` + `layer-7-ai-agents.md` FIRST |
| NFR design | AI-DLC `aidlc-docs/construction/{unit-name}/nfr-design/` |
| Infrastructure design | AI-DLC `aidlc-docs/construction/{unit-name}/infrastructure-design/` |
| Code | AI-DLC project structure (workspace root, not `aidlc-docs/`) |
| Build & test instructions | AI-DLC `aidlc-docs/construction/build-and-test/` |
| AI Native multi-layer mapping | FDE `ai-native-app-builder` references (the 26 layer reference files) remain available to AI-DLC's design stages. |
| `ai-native-app-builder` program's `app-spec-created` exit criterion | Satisfied by `aidlc-docs/inception/application-design/**` plus a thin pointer at `artifacts/ai-native-app-builder/aidlc-spec-pointer-{ts}.md`. |

When the `ai-native-app-builder` program is also active, it does **not** generate its own Kiro spec. Instead, it provides AI-DLC's design stages with the AI Native multi-layer reference material and acceptance-criteria tagging conventions (`[PoC]`, `[MVP]`, `[Production]`).

## Phase 3: Operations ↔ completing the AI-DLC placeholder

AI-DLC's Operations phase is a placeholder in the upstream AWS Labs release. FDE completes it by routing the engagement's operations work into `aidlc-docs/operations/` so the AI-DLC three-phase model is honoured end-to-end.

| AI-DLC Operations sub-stage (per the upstream placeholder) | FDE program that fulfils it | AI-DLC artifact path |
|---|---|---|
| Deployment planning and execution | `ai-native-app-builder` Phase 5 + `cross-deployment-guide` reference | `aidlc-docs/operations/deployment.md` (links to `artifacts/ai-native-app-builder/deploy-{ts}.md`) |
| Monitoring and observability setup | `ai-native-app-builder` Phase 5 + `cross-observability-evaluation` reference | `aidlc-docs/operations/observability.md` (links to `artifacts/ai-native-app-builder/observability-{ts}.md`) |
| Incident response procedures | `ai-operations` (AI BOM section 4) | `aidlc-docs/operations/incident-response.md` (links to `artifacts/ai-bom/bom-{ts}.md` Ã‚§4) |
| Maintenance and support workflows | `ai-operations` (AI BOM sections 5↔6) | `aidlc-docs/operations/maintenance.md` (links to `artifacts/ai-bom/bom-{ts}.md` Ã‚§Ã‚§5↔6) |
| Production readiness checklists | `ai-native-app-builder` `app-level` graduation criteria | `aidlc-docs/operations/production-readiness.md` (links to the `[MVP]` and `[Production]` lines in `aidlc-docs/inception/requirements/`) |
| Resilience and failure-mode review | `resilience` | `aidlc-docs/operations/resilience.md` (links to `artifacts/resilience-reviews/resilience-{ts}.md`) |

The `/aidlc-operations` skill (in this program) is the orchestrator. It runs the FDE skills in order and writes the `aidlc-docs/operations/operations-plan.md` index that links to all of the above. Completion of `/aidlc-operations` satisfies the `aws-aidlc` program's `aidlc-operations-complete` exit criterion.

When AWS Labs eventually publishes their own Operations rules, the routing in this file will be re-evaluated. Until then the AI-DLC three-phase shape is preserved without forcing the FDE to re-invent operations work that FDE already does.

## State and audit-trail rules

1. **AI-DLC's `aidlc-docs/audit.md` is the source of truth for verbatim user input.** FDE's `state/history.jsonl` records FDE-program-level decisions only and references the AI-DLC audit log timestamp.
2. **Decision kinds that imply user acknowledgement** must include an `evidence` field per `discovery-first-gate.md` rule 3. When AI-DLC is in use, the `evidence` field cites the AI-DLC audit log entry: `{"source":"aidlc-audit","timestamp":"<iso>"}`.
3. **`state.intake.*` mirrors AI-DLC requirements** but does not duplicate them. The mirror is for downstream FDE programs that read intake; the source remains `aidlc-docs/inception/requirements/`.
4. **Stage transitions in FDE happen automatically when AI-DLC artifacts land.** The discovery program's exit criterion fires when `aidlc-docs/inception/requirements/**` exists plus `state.intake.discoveryComplete=true`. No separate manual transition.
5. **`state/current.yaml` is merge-only.** When any skill updates the state file, it MUST use a read-modify-write pattern: read the existing file, add or update only the specified fields, write it back. Never rewrite the entire file from scratch. Existing fields (`customer`, `intent`, `intake`, `aimTier`, `currentStage`, `decisions`, `startedAt`, `updatedAt`) must never be removed during an update. This is especially important during `/aidlc-install` (which adds `aidlcInstalled`, `aidlcVersion`, `aidlcInstalledAt`) and `/aidlc-sync` (which updates `intake.*` fields).

## What happens if AI-DLC is in the active program set but not installed

The `aws-aidlc` program activates based on intent tags or implicit weight. If the FDE has not yet installed AI-DLC (i.e., the detection paths above are empty), the agent must:

1. Tell the FDE: "AI-DLC is in the active program set but not installed in this workspace. Run `/aidlc-install` first."
2. Refuse to call `/aidlc-inception`, `/aidlc-construction`, or `/aidlc-operations` until installation is verified.
3. The discovery-first-gate continues to enforce ↔ no artifacts are produced under `artifacts/` either way.

## What happens if AI-DLC is installed but `aws-aidlc` program is NOT in the active set

This is unusual but possible (e.g., the FDE installed AI-DLC manually without adding `aidlc` to intent tags). The agent should:

1. Notice the AI-DLC files during pre-flight.
2. Suggest activating the `aws-aidlc` program: "AI-DLC is installed but the aws-aidlc program is not active. To use AI-DLC for this engagement, add `aidlc` to the intent tags in the intake and re-plan."
3. Until the program is added, run FDE's local discovery skill normally.

## Why priority 87

The discovery-first-gate (99) must evaluate first; the bridge (87) decides which surface fulfils the gate; program-overview steering (85) provides context after routing.
