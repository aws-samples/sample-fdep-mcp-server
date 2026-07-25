---
id: fde-integration-points
description: "FDE integration points with the AWS AI-DLC methodology"
inclusion: always
priority: 97
---
<!-- FDE_MANAGED hash:fde-integration-points-v2 -->

# FDE Integration Points During AI-DLC Stages

## Rule

When executing AI-DLC stages that produce design or code artifacts, the agent MUST call FDE MCP tools at the following points:

### At Session Start (any stage)
1. Call `fde_get_engagement_context` (or read local `state/intention.json` and call `fde_load_intention`)
2. If `activePrograms` is present, review which programs are active and what skills/references they bring

### During INCEPTION — Application Design Stage
1. Read `.fde-manifest.json` to identify available references
2. Consult architecture references BEFORE designing components:
   - `layer-infra-cloud-foundation.md` — what AWS services are available
   - `layer-6-ai-agents.md` — agent topology patterns (single vs multi-agent)
   - `layer-4-ai-workflow.md` — orchestration patterns (Step Functions, async)
   - `layer-2-enterprise-resources.md` — data stores, queues, APIs
   - `layer-5-ai-app-creation.md` — UI patterns and auth
3. Use these to inform component identification, service layer design, and AWS service selection
4. Call: `fde_get_skill(skillId="build-aws-app", file="references/<filename>")`

**Why during Inception Application Design?** This stage decides WHAT components exist and HOW they communicate. The layer references define what's available on AWS. Without them, the agent designs generic architectures that don't map to real AWS services.

### During INCEPTION — After Inception Completes
1. Call `fde_load_intention` with captured requirements (if not already loaded)
2. Call `fde_resolve` to determine active programs with updated context
3. Check for pre-Construction program skills that should run

### During CONSTRUCTION — Functional Design / NFR Design / Infrastructure Design
1. Read `.fde-manifest.json` for the relevant category
2. Consult layer references matching the design type:
   - Functional Design → `layer-4-ai-workflow.md`, `layer-6-ai-agents.md`
   - NFR Design → `cross-observability-evaluation.md`, resilience references
   - Infrastructure Design → `layer-infra-cloud-foundation.md`, `cross-deployment-guide.md`
3. Call: `fde_get_skill(skillId="build-aws-app", file="references/<filename>")`

### During CONSTRUCTION — Code Generation
1. Read `.fde-manifest.json` for ALL references matching the unit being built
2. Consult the specific layer references per `consult-references.md`:
   - Frontend code → `layer-5-ai-app-creation.md`, `layer-5-ui-implementation.md`
   - Agent code → `layer-6-ai-agents.md`
   - Infrastructure → `layer-infra-cloud-foundation.md`
   - Data layer → `layer-3-ai-data-ontology.md`
3. Use EXACT patterns from references — do not generate from memory

## Summary: When to consult references

| AI-DLC Stage | Phase | Consult References? |
|---|---|---|
| Workspace Detection | Inception | No |
| Requirements Analysis | Inception | YES — when technical stack or service selection questions are asked |
| User Stories | Inception | No |
| Workflow Planning | Inception | No |
| **Application Design** | **Inception** | **YES — architecture decisions** |
| Units Generation | Inception | No |
| Functional Design | Construction | YES — per-unit logic |
| NFR Design | Construction | YES — resilience, security |
| Infrastructure Design | Construction | YES — CDK patterns |
| **Code Generation** | **Construction** | **YES — implementation patterns** |
| Build and Test | Construction | Optional (for test patterns) |
| Operations | Operations | YES — deployment, observability |

## Why

- FDE layer references contain version-specific, tested AWS patterns
- Without consulting them, the agent falls back to training-data patterns which may be outdated
- Application Design in Inception sets architectural constraints that flow through all of Construction — getting it right here prevents rework later

## When NOT to call FDE

- During pure elicitation stages (User Stories — conversational, no patterns needed)
- During Requirements Analysis ONLY when questions are purely business/scope (not technical stack selection)
- During Workspace Detection (just file scanning)
- When reading AI-DLC rule-details files (local, no FDE call needed)
