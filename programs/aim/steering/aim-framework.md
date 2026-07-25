---
id: aim-framework
description: "AI Maturity Assessment framework scoring six enterprise perspectives"
inclusion: auto
match: "artifacts/assessments/**"
priority: 90
---

# AI Maturity Assessment (AIM) - Framework

> Based on the [AWS Generative AI Maturity Model](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-gen-ai-maturity-model/introduction.html) and the [AWS Cloud Adoption Framework for AI/ML/GenAI](https://docs.aws.amazon.com/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.html). The six perspectives and tier rubric align with the official AWS prescriptive guidance.

AIM scores an enterprise across **six perspectives**. Each perspective scores 1 (Ad hoc) to 5 (AI Native). The overall tier is the minimum across perspectives  AI maturity is bottlenecked by the weakest link.

## The six perspectives

1. **Business**  Is there a funded, executive-sponsored AI strategy tied to measurable outcomes? Are product and portfolio decisions informed by AI capabilities?
2. **People**  Do teams have the skills, tools, and change-management support to use AI in their daily work? Is AI adoption systematic, not heroic?
3. **Governance**  Are there policies, guardrails, and accountability frameworks for how AI is built, deployed, and retired? Is responsible AI a checklist or a practice?
4. **Platform**  Is there a managed AI/ML foundation (MLOps, model registry, inference infrastructure, data pipelines) that engineering teams build on, not around?
5. **Security**  Are AI systems subject to the same threat modeling, access control, and audit discipline as other enterprise workloads? Are AI-specific risks (prompt injection, data exfiltration via LLM, model theft) in scope?
6. **Operations**  Can the organization operate AI systems safely in production? Incident response, drift detection, rollback, cost management  is there a runbook?

## Tier rubric (applies to every perspective)

| Tier | Label | Description |
|------|-------|-------------|
| 1 | Ad hoc | Isolated experiments; no strategy; no platform; no policy |
| 2 | Reactive | Some use cases in production; strategy emerging; practice is manual |
| 3 | Repeatable | Documented operating model; platform/framework in use; governance in place |
| 4 | Managed | AI embedded in revenue-generating products; platform team runs the stack; governance is continuous |
| 5 | AI Native | AI is a first-class capability across the business; new products start with AI; continuous improvement is habitual |

## Capability inventory

AIM evaluates **31 capabilities** across the six perspectives. These are the checkpoints the FDE walks through during the 4-hour executive workshop. Evidence requirements per capability are in the workshop template; the overall rubric above is what the customer sees.

## How the FDE toolkit uses AIM scores

AIM is the **entry point**. Every other program's activation logic depends on AIM scores. The routing matrix:

| Dimension | Score 1-2 (Low) | Score 3 (Medium) | Score 4-5 (High) |
|-----------|-----------------|------------------|------------------|
| Business | AI-PLC | AI-PLC (optional) | Customer may co-create |
| People | AIDLC | AIDLC (optional) | Potential champion |
| Governance | Responsible AI | Responsible AI | Peer exchange |
| Platform | School of Resilience + AgentPath prerequisite check | AgentPath ready | AgentPath NOW |
| Security | Responsible AI + field SA | Responsible AI | Self-sufficient |
| Operations | AI Operations + School of Resilience | AI Operations | Potential reference |

## Always-on rules

1. AIM is ALWAYS the entry point if no prior assessment exists.
2. Regulated industries (financial services, healthcare, government, energy) ALWAYS trigger Responsible AI regardless of score.
3. Dual-low scores in Governance + Operations trigger AI Operations as high priority.
4. Never recommend AgentPath to a customer with Platform score  1.
5. No more than 3 programs are recommended simultaneously; programs are sequenced.

## Done-when

An AIM assessment artifact exists at `artifacts/assessments/aim-*.md` containing:
- A tier score (15) per perspective with cited evidence
- An overall tier = the minimum across perspectives
- A prioritized list of the top 3 capability gaps
- Routing to downstream programs based on the matrix above
