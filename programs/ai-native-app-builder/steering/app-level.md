---
id: app-level
description: "Workload maturity levels (PoC/MVP/Production) driving spec scope and scaffold thickness"
inclusion: auto
match: ".kiro/specs/**"
priority: 88
---

# Workload Maturity — appLevel (PoC / MVP / Production)

When working on an ai-native-app-builder spec or artifact, the **appLevel** field
in `state/current.yaml` scopes the work. This is a **workload-maturity
score** (one workload, one project) — distinct from `aimTier`, which is the
**organisation-maturity score** that drives program activation.

| Concept | Scope | Source | Drives |
|---|---|---|---|
| `aimTier` | The whole organisation | AIM workshop (`aim-run-aim-assessment`) | Pipeline planner — which programs activate |
| `appLevel` | One workload | Customer input + skill defaults | Spec scope, scaffold thickness, acceptance-criteria filtering |

If `appLevel` is not set, default to **PoC** for a new workload, **MVP**
when graduating from a delivered PoC, **Production** when the workload has
already shipped. Update the field with `ace state update --app-level=...`
when the workload graduates — this triggers replan + re-render so the spec
and scaffold reflect the new scope.

## The three levels

### PoC — Answer one technical question in two weeks

| Dimension | What it looks like |
|---|---|
| Purpose | Validate one hypothesis against real data, end-to-end |
| Users | Internal demo viewer (1“3) |
| Data | Synthetic only |
| Environments | Dev account, dev environment |
| Guardrails | Cost cap, input PII filter, length cap, retrieved-content fencing |
| Compute | `cdk deploy` from a developer machine |
| Tests | Gold-set evaluation only |
| Deferred | CI/CD, staging, prod, full guardrail suite, multi-region, formal eval, model card, AI BOM |

**Done when:** The hypothesis is answered. If the kill criterion fires, the
prototype ends — write the retrospective, do not ship.

### MVP — Pilot with real users on real data

| Dimension | What it looks like |
|---|---|
| Purpose | Internal pilot with 10“50 real users on real data |
| Users | Internal pilot cohort (10“50) |
| Data | Real data under documented agreement; named data owner |
| Environments | Dev + staging |
| Guardrails | Full safety-critical RAI deployment-posture set |
| Compute | CI/CD lite — auto-deploy to dev, manual gate to staging |
| Tests | Unit + integration on critical paths; gold-set + fairness harness |
| Deferred | Multi-region, full DR, chaos tests, perf tests, continuous evaluation |

**Done when:** Pilot users can complete the primary task; named alarms are
defined; a runbook exists; a model card is published.

### Production — External or high-volume users

| Dimension | What it looks like |
|---|---|
| Purpose | External or full-volume traffic |
| Users | External or full-volume internal |
| Data | Real, high-integrity, governed |
| Environments | Dev + staging + prod (with prod-approval gate) |
| Guardrails | Full guardrail suite + monitoring + incident response |
| Compute | Full CI/CD with prod-approval gates |
| Tests | Unit + integration + chaos + perf; continuous evaluation |
| Deferred | (nothing intentional — Production is the target) |

**Done when:** SLOs measured against agreed targets, on-call rotation
defined, AI BOM linkage present, multi-region or DR-tested as required.

## Per-level decision matrix

When the skill says a layer is "required" for an app type, the `appLevel`
column tells you **what** is required:

| Layer | PoC | MVP | Production |
|---|---|---|---|
| Infra | Dev only | Dev + staging | Dev + staging + prod |
| L1 Enterprise integrations | Defer | Defer | Active |
| L2 Enterprise resources | Subset | Full | Full |
| L3 Data ontology | Chunking + embeddings only | Full | Full + lineage |
| L4 Workflow | Basic | Full | Full + saga handling |
| L5a App creation | Full UI (chat + HITL queue + escalation pages) | + admin dashboard + analytics | Full + white-label |
| L5b Model management | Sonnet + gold set | + model card | Full + continuous eval |
| L6 Agents | Active | Active | Active |
| L7 Developer experience | Defer | CI lite | Full CI/CD with gates |
| Gov | Subset of guardrails | Full RAI set | Full + continuous testing |
| Obs | Basic CloudWatch | Named alarms + runbook | + AI metrics + on-call |
| Res | Cost cap only | + circuit breaker + fallback | + DR-tested |
| Test | Gold set | + unit + integration | + chaos + perf |
| Env | Dev only | Dev + staging | Dev + staging + prod |

The skill renders only the column matching the current `appLevel`. When the
workload graduates, re-render shows the next column.

## Tagged acceptance criteria

In specs, every acceptance criterion is **prefixed with the level at which
it must be met**:

```markdown
### Acceptance criteria

- [PoC] Full UI with chat, HITL escalation queue, and document upload
- [PoC] HITL escalation UI renders queue of items needing human review
- [PoC] Cognito JWT auth attached
- [PoC] Cost cap configured at $50/day with alarm
- [MVP] Idempotency keys honoured for 5 minutes
- [MVP] Per-step timeouts enforced
- [MVP] Named CloudWatch alarms for error rate and latency
- [MVP] Runbook documents three named failure modes
- [Production] Deadline propagation; downstream calls fail closed at deadline
- [Production] Reserved concurrency cap for cost protection
- [Production] On-call rotation defined; escalation path tested
- [Production] AI BOM linkage published
```

When rendering the spec for a customer at `appLevel: PoC`, **show only the
[PoC] criteria**. The full list lives in the source so the spec ages: as
the workload graduates from PoC → MVP → Production, the same spec
re-renders with the next level's criteria visible. No spec rewrite at each
transition.

## Build-order collapse

The five-phase build order from `build-aws-app` collapses per level:

| Level | Phases that run |
|---|---|
| PoC | Phase 0 (spec) + Phase 1 partial (CDK init, Cognito dev, KMS) + Phase 2 partial (corpus + KB + DDB) + Phase 3 partial (Lambda + agent + 5 guardrails) + Phase 4 (full UI: chat + HITL queue + escalation) |
| MVP | All of PoC + Phase 1 staging env + Phase 4 full + Phase 5 partial (model card, named alarms, runbook) |
| Production | All of MVP + Phase 5 full (chaos tests, perf tests, full deployment gate, AI BOM linkage) |

## Graduation criteria

A workload **graduates** between levels only when explicit conditions are
met. Graduation is a discrete decision, not a gradient.

### PoC → MVP

All of:

- The kill criterion did **not** fire
- Customer sponsor signs the funding-line-item conversion
- Real-data agreement is in place with a named data owner
- Pilot user cohort is identified (10“50 named users)

### MVP → Production

All of:

- Pilot completed primary task at the agreed success rate
- All safety-critical guardrails are in place and exercised by tests
- A named on-call rotation exists
- A model card has been reviewed and approved
- A runbook covers the top three failure modes

Until graduation criteria are met, the workload **stays at its current
level**. "Adding production things to the PoC" without graduation is the
single most common failure mode here — the engagement loses its scope and
the PoC budget over-runs. Resist it.

## How skills consume this

Two existing ai-native-app-builder skills read `appLevel`:

- **`ai-native-app-builder-build-aws-app`** — reads `appLevel` from state. Renders
  the matching column of the decision matrix, the matching subset of build
  phases, and tagged acceptance criteria filtered to the current level.
  Defaults to PoC if unset.

- **`ai-native-app-builder-scaffold-app-type`** — reads `appLevel` from state.
  Generates a thin scaffold for PoC, adds CI + staging for MVP, adds full
  project structure (chaos tests, perf tests, prod stack, ADRs) for
  Production.

If a customer asks "what does it take to get to production from here?",
read the next-higher level's column in this matrix. That's the answer.

## What this is not

- **Not an AIM tier.** AIM is `aimTier`; that scores the organisation and
  drives which programs activate. This file does not change AIM behavior.
- **Not consumed by other programs.** RAI, Resilience, AI-Ops, AIDLC,
  AI-PLC read engagement state but do not depend on `appLevel`. If they
  later want to consume it, they can read it directly.
- **Not consumed by the planner.** Pipeline activation is unaffected by
  `appLevel`; the planner uses `aimTier`, `intent`, and `intake` only.
