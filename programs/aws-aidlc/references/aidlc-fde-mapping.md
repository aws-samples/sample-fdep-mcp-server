# AWS AI-DLC ↔ FDE Mapping (Authoritative)

This reference is the operational mapping between AI-DLC's three-phase methodology and FDE's program catalog. It is what the agent reads when deciding which surface owns which concern. The bridge steering (`aidlc-fde-bridge.md`) enforces these mappings at runtime; this file documents them in one place.

## High-level

| Layer | Owner |
|---|---|
| Engagement orchestration (multi-program planning) | FDE |
| Verbatim user input | AI-DLC `aidlc-docs/audit.md` |
| Workload requirements | AI-DLC `aidlc-docs/inception/requirements/` |
| Workload design | AI-DLC `aidlc-docs/inception/application-design/` + `aidlc-docs/construction/{unit}/...` |
| Workload code | AI-DLC project structure |
| Org-level assessment (AIM) | FDE `artifacts/assessments/` |
| Responsible AI review and guardrails | FDE `artifacts/rai-{reviews,guardrails}/` |
| Resilience review | FDE `artifacts/resilience-reviews/` |
| AI Business Operating Manual | FDE `artifacts/ai-bom/` |
| Roadmap (90/180/365) | FDE `artifacts/roadmaps/` |
| Operations phase index | `aidlc-docs/operations/operations-plan.md` (links to FDE artifacts) |

## Inception (AI-DLC) ↔ FDE programs

| AI-DLC stage | Owns | FDE program intersect |
|---|---|---|
| Workspace Detection | `aidlc-docs/aidlc-state.md` initial state | `discovery` (deferred to AI-DLC if installed) |
| Reverse Engineering | `aidlc-docs/inception/reverse-engineering/` | (none ↔ brownfield-only AI-DLC concern) |
| Requirements Analysis | `aidlc-docs/inception/requirements/` | `discovery` (sync via `/aidlc-sync`); seeds `state.intake.*` |
| User Stories | `aidlc-docs/inception/user-stories/` | `ai-native-app-builder` reads as input to layer mapping |
| Workflow Planning | `aidlc-docs/inception/plans/` | `aim`, `ai-native-app-builder` inform AI-DLC of org-level constraints |
| Application Design | `aidlc-docs/inception/application-design/` | `ai-native-app-builder` provides 18 layer references on demand |
| Units Generation | `aidlc-docs/inception/plans/units.md` | None directly; influences `ai-native-app-builder`'s scaffold |

## Construction (AI-DLC) ↔ FDE programs

| AI-DLC stage | Owns | FDE program intersect |
|---|---|---|
| Functional Design | `aidlc-docs/construction/{unit}/functional-design/` | `ai-native-app-builder` references (L2, L3, L4, L5b, L6) |
| NFR Requirements | `aidlc-docs/construction/{unit}/nfr-requirements/` | `responsible-ai` guardrails inform NFRs |
| NFR Design | `aidlc-docs/construction/{unit}/nfr-design/` | `resilience` patterns inform NFRs |
| Infrastructure Design | `aidlc-docs/construction/{unit}/infrastructure-design/` | `ai-native-app-builder` reference `layer-infra-cloud-foundation.md` |
| Code Generation | Project source tree | (none ↔ AI-DLC writes code; FDE reads layer mapping references) |
| Build and Test | `aidlc-docs/construction/build-and-test/` | `ai-native-app-builder` reference `cross-testing-quality.md` |

## Operations (AI-DLC) ↔ ROUTED via FDE programs

This is where AI-DLC's placeholder is completed by FDE. `complete-operations.md` orchestrates the routing.

| AI-DLC Operations sub-stage | AI-DLC document | FDE program | FDE skill | FDE artifact |
|---|---|---|---|---|
| Deployment planning and execution | `aidlc-docs/operations/deployment.md` | `ai-native-app-builder` | (Phase 5 deploy workflow) | `artifacts/ai-native-app-builder/deploy-{ts}.md` |
| Monitoring and observability setup | `aidlc-docs/operations/observability.md` | `ai-native-app-builder` | (Phase 5 observability workflow) | `artifacts/ai-native-app-builder/observability-{ts}.md` |
| Incident response procedures | `aidlc-docs/operations/incident-response.md` | `ai-operations` | `/ai-bom` | `artifacts/ai-bom/bom-{ts}.md` Ã‚§4 |
| Maintenance and support workflows | `aidlc-docs/operations/maintenance.md` | `ai-operations` | `/ai-bom` | `artifacts/ai-bom/bom-{ts}.md` Ã‚§Ã‚§5↔6 |
| Production readiness checklists | `aidlc-docs/operations/production-readiness.md` | `ai-native-app-builder` `app-level` graduation | (read-from-Inception) | Tagged criteria in `aidlc-docs/inception/requirements/` |
| Resilience and failure-mode review | `aidlc-docs/operations/resilience.md` | `resilience` | `/resilience-review` | `artifacts/resilience-reviews/resilience-{ts}.md` |

The index `aidlc-docs/operations/operations-plan.md` links to all six.

## Cross-cutting FDE programs that DO NOT route through AI-DLC

These run independently of AI-DLC even when `aws-aidlc` is active.

| FDE program | Why it stays FDE-only |
|---|---|
| `aim` | Org-level assessment, not workload-level |
| `fde-orchestration` | Engagement-level orchestration snapshot |
| `school-of-multicloud` | Cross-cloud architecture, not workload-level |
| `aidlc` (Q Developer adoption) | Different concern entirely (note name collision with AWS AI-DLC) |
| `ai-plc` | Org-level product development lifecycle |
| `agentpath` | Org-level agentic strategy (when activated) |
| `johari-window` | Diagnostic, not production |

## Audit-trail mapping

| Decision kind in FDE `state/history.jsonl` | Evidence source |
|---|---|
| `aidlc-installed` | `evidence.source: "chat"`, FDE's verbatim consent string |
| `discovery-complete` (when `discoverySource: "aidlc"`) | `evidence.source: "aidlc-audit"`, timestamp from `aidlc-docs/audit.md` |
| `aidlc-inception-complete` | Same as above |
| `aidlc-construction-complete` | Same as above |
| `aidlc-operations-substage-complete` (Ãƒ—6) | Same as above for each sub-stage |
| `aidlc-operations-complete` | Same as above |
| Any FDE-only decision (e.g., `aim-complete`, `rai-review-complete`) | `evidence.source: "chat"` or `evidence.source: "artifact"`, citing the FDE's verbatim acknowledgement or the artifact path |

The principle: AI-DLC owns the verbatim audit log; FDE's history.jsonl points at it. No duplication.

## State-field mapping

`state/current.yaml` `intake.*` fields populated from AI-DLC inception:

| FDE intake field | AI-DLC source | Set by |
|---|---|---|
| `primaryUser` | `aidlc-docs/inception/requirements/...` | `/aidlc-sync` |
| `primaryDecision` | Same | `/aidlc-sync` |
| `todayWithoutTool` | Same | `/aidlc-sync` |
| `failureModeImpact` | Same | `/aidlc-sync` |
| `dataCeiling` | Same | `/aidlc-sync` |
| `fundingSponsor` | Same | `/aidlc-sync` |
| `businessOutcome` | Same | `/aidlc-sync` |
| `successDefinition` | Same | `/aidlc-sync` |
| `killCriteria` | Same | `/aidlc-sync` |
| `discoveryComplete` | Set when all above are populated | `/aidlc-sync` |
| `discoverySource` | Set to `"aidlc"` | `/aidlc-sync` |
| `parkedFields` | List of intake field names not present in AI-DLC | `/aidlc-sync` |

`state/current.yaml` `aidlc*` fields:

| Field | Set by | Purpose |
|---|---|---|
| `aidlcInstalled` (bool) | `/aidlc-install` | Triggers bridge routing |
| `aidlcVersion` (string) | `/aidlc-install` | Audit |
| `aidlcInstalledAt` (iso) | `/aidlc-install` | Audit |
| `aidlcPlatform` (enum) | `/aidlc-install` | Decides install paths |
| `aidlcOperationsCompleteAt` (iso) | `/aidlc-operations` | Audit |

## When mappings change

This file is the source of truth for the bridge. Changes happen for two reasons:

1. **FDE adds a new program** (e.g., a new compliance review) ↔ add a row to either the cross-cutting table or the appropriate phase table, depending on whether it routes through AI-DLC.
2. **AWS Labs ships AI-DLC Operations rules** ↔ re-evaluate the Operations routing. Likely outcome: FDE retains some sub-stages (resilience, AI BOM) and AI-DLC absorbs others (deployment, production-readiness checklist). The bridge is updated; existing engagements are not retroactively re-routed (sticky-surface principle).

When this file changes, the `aws-aidlc` program version bumps. Engagements pick up new mappings on next `ace plan`.
