---
id: ai-ops-framework
description: "AI Operations framework for producing and maintaining the AI Business Operating Manual"
inclusion: auto
match: "artifacts/ai-bom/**"
priority: 85
---

# AI Operations Framework

> References: [Operationalizing agentic AI on AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-operationalizing-agentic-ai/introduction.html), [Gen AI Lifecycle Operational Excellence](https://docs.aws.amazon.com/prescriptive-guidance/latest/gen-ai-lifecycle-operational-excellence/introduction.html), [Governing and architecting agentic AI at scale](https://docs.aws.amazon.com/prescriptive-guidance/latest/govern-architect-agentic-ai/introduction.html)

AI Ops is not DevOps with AI bolted on. It is the enterprise's answer to the question: *"once AI is embedded across our business, how do we operate it safely?"*

The primary artifact is the **AI Business Operating Manual (AI BOM)** - a living document covering:

## Contents of an AI BOM

1. **Inventory** - every production AI system, its purpose, its owner, its data, its dependencies.
2. **Classification** - each system tiered by business impact (informational, decision-support, decision-making, autonomous).
3. **Governance** - who approves changes, who signs off on deployment, who can pause or roll back.
4. **Incident response** - what does an AI incident look like, how is it triaged, who is paged.
5. **Drift and deprecation** - how new model versions are evaluated, how old versions retire.
6. **Audit readiness** - what gets logged, where it's stored, how long it's retained, who can query it.
7. **Cost governance** - per-system cost attribution, budget thresholds, anomaly detection.
8. **Agent registry** - for agentic AI systems: topology, tools, guardrails, human-in-the-loop checkpoints.

## How to know you need this

- 5+ AI systems in production with no unified operating model
- An incident happened and nobody could quickly answer "what else uses this model?"
- A regulator asked for documentation and the scramble took weeks
- Scale-from-pilot-to-enterprise is on the roadmap for next year
- Agentic AI systems are in production without documented escalation paths

## Operational Excellence pillars (aligned to AWS Well-Architected)

| Pillar | AI-specific concern |
|--------|-------------------|
| Organization | AI CoE charter, roles, review cadence |
| Prepare | Runbooks, on-call rotation, golden-set evaluations |
| Operate | Monitoring, alerting, cost dashboards, drift detection |
| Evolve | Post-incident reviews, model version management, continuous improvement |

## How the FDE toolkit uses this

AI Operations activates when:
- AIM Operations <= 2 AND AIM Governance <= 2 (dual-low pattern)
- `intake.productionAiSystems >= 5`
- `intent.includes('ai-operations')`

Pair with Responsible AI (governance layer) and School of Resilience (operational stability).
