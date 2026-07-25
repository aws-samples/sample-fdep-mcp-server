# Program Catalog

The FDE (Forward-Deployed Engineer) Kit ships 9 programs. Programs self-activate based on the customer intention — you don't manually select them. Each program brings skills (agent capabilities), steering (rules the agent follows), and exit criteria (how the program knows its work is done).

---

## FDE Orchestration

**ID:** `fde-orchestration` | **Version:** 1.0.0 | **Always active**

The meta-program that coordinates all other programs. It documents how programs compose, how the resolver routes based on intentions, and provides the engagement lifecycle management skills.

**When it activates:** Always (weight 100). Every engagement has orchestration.

**Skills:**
| Skill | What it does |
|-------|-------------|
| `init-engagement` | Bootstrap a new engagement from an intention |
| `load-customer-intention` | Load and validate a customer intention |
| `explain-program-activation` | Explain why specific programs activated |
| `describe-active-orchestration` | Describe the current orchestration state |

**Lifecycle stages:** assess → transform → ai-native

---

## AI Native App Builder

**ID:** `ai-native-app-builder` | **Version:** 1.0.0

Builds AI-native applications on AWS using the AI Native multi-layer architecture. Routes app type to the correct AWS accelerators, CDK patterns, and agent frameworks. Ships 26 reference files covering infrastructure through deployment.

**When it activates:**
- Goal includes `build` (weight 90)
- Goal includes `prototyping` (weight 80)
- Goal includes `aidlc` (weight 70)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `build-aws-app` | Full app build using multi-layer architecture with tested patterns |
| `scaffold-app-type` | Generate project structure for a specific app type |
| `deploy-agent-to-agentcore` | Deploy an agent to Amazon Bedrock AgentCore |

**References:** 26 files covering:
- multi-layer architecture patterns (infrastructure → developer experience)
- Industry deep-dive: Insurance claims processing (4 files)
- Deployment: Bedrock AgentCore (4 files)

**Lifecycle stages:** transform → ai-native

---

## AWS AI-DLC (AI-Driven Development Life Cycle)

**ID:** `aws-aidlc` | **Version:** 1.0.0 | **Source:** [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows)

Integrates AWS Labs' AI-DLC methodology as a first-class program. Three phases (Inception → Construction → Operations) provide the lifecycle structure. Owns requirements capture and provides a structured path from discovery to production.

**When it activates:**
- Goal includes `aidlc` (weight 99 — highest priority)
- Goal includes `build` (weight 70)
- Goal includes `prototyping` (weight 70)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `install-aidlc` | Install AI-DLC rules into the workspace |
| `start-inception` | Begin Inception phase (requirements, application design) |
| `advance-construction` | Move to Construction (functional design, code generation) |
| `complete-operations` | Complete Operations phase (deploy, monitor, resilience) |
| `sync-to-fde-intake` | Sync AI-DLC findings back to the FDE intention |

**Three phases:**
1. **Inception** — workspace detection, reverse engineering, requirements analysis, application design, unit generation
2. **Construction** — functional design, infrastructure design, NFR design, code generation, build & test
3. **Operations** — deployment, monitoring, incident response, production readiness

**Lifecycle stages:** intent → transform → ai-native

---

## AI Maturity Assessment (AIM)

**ID:** `aim` | **Version:** 1.0.0 | **Source:** [AWS Gen AI Maturity Model](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-gen-ai-maturity-model/)

Assess enterprise AI maturity across six perspectives and produce a tier-appropriate roadmap. Based on the [AWS Generative AI Maturity Model](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-gen-ai-maturity-model/).

**When it activates:**
- AIM tier < 5 (weight 90) — almost always, unless already at max maturity
- Goal includes `responsible-ai` (weight 70)
- Goal includes `gen-ai-rollout` (weight 60)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `run-aim-assessment` | Conduct assessment across all 6 perspectives |
| `produce-aim-roadmap` | Generate tier-appropriate roadmap with horizons |

**Six perspectives assessed:**

| Perspective | What it measures |
|-------------|-----------------|
| Business | AI strategy alignment, KPI definition, ROI |
| People | Team readiness, skills, org change |
| Governance | Policies, approval workflows, model risk |
| Platform | Reusable infrastructure, MLOps, data pipelines |
| Security | Data classification, access controls, red-teaming |
| Operations | Monitoring, incident response, runbooks |

**Lifecycle stages:** assess → transform → ai-native

---

## Responsible AI

**ID:** `responsible-ai` | **Version:** 1.0.0 | **Source:** [AWS Responsible AI](https://aws.amazon.com/ai/responsible-ai/)

Governance frameworks, guardrails, and ethical AI implementation. Five-dimension RAI reviews, model cards, content-safety stacks, and red-team exercises. Based on [AWS Responsible AI](https://aws.amazon.com/ai/responsible-ai/) guidance and Amazon Bedrock Guardrails.

**When it activates:**
- Customer is regulated (weight 95)
- Goal includes `responsible-ai` (weight 90)
- AIM tier ≤ 2 (weight 70)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `run-rai-review` | Conduct 5-dimension Responsible AI review |
| `design-rai-guardrails` | Design guardrails addressing high-risk findings |
| `produce-model-card` | Generate model card documentation |
| `configure-content-safety` | Set up content safety with Bedrock Guardrails |
| `redteam-deployment` | Plan and execute red-team exercises |

**Five RAI dimensions:** Fairness, Explainability, Privacy & Security, Robustness, Governance

**Lifecycle stages:** transform → ai-native

---

## AgentPath

**ID:** `agentpath` | **Version:** 1.0.0 | **Source:** [AWS Agentic AI Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html)

Agentic AI strategy and implementation guidance. Architecture patterns, human-in-the-loop design, agent safety, and a guardrail catalog for enterprise agentic transformation.

**When it activates:**
- Goal includes `build` (weight 80)
- AIM platform perspective ≥ 3 (weight 75)
- Goal includes `aidlc` (weight 70)
- Goal includes `gen-ai-rollout` (weight 60)
- 5+ AI systems in production (weight 50)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `design-agent-architecture` | Design agent topology, tools, and guardrails |
| `design-hitl` | Define human-in-the-loop policies and escalation paths |
| `build-guardrail-catalog` | Build a reusable guardrail catalog for the org |

**Lifecycle stages:** transform → ai-native

---

## AI Operations (AI Ops)

**ID:** `ai-operations` | **Version:** 1.0.0 | **Source:** [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-operationalizing-agentic-ai/)

Produce an AI Business Operating Manual — a living governance document defining how all AI systems operate safely across the enterprise. Based on [AWS Prescriptive Guidance for operationalizing AI](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-operationalizing-agentic-ai/).

**When it activates:**
- Goal includes `ai-operations` (weight 95)
- 3+ AI systems in production (weight 70)
- Customer is regulated (weight 60)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `produce-operating-manual` | Generate AI operating manual cataloging all systems |
| `define-incident-response` | Create per-system incident response runbooks |
| `stand-up-ai-coe` | Design and stand up an AI Center of Excellence |

**Lifecycle stages:** transform → ai-native

---

## AI Product Lifecycle (AI-PLC)

**ID:** `ai-plc` | **Version:** 1.0.0 | **Source:** [aws-samples/sample-ai-plc](https://github.com/aws-samples/sample-ai-plc)

Close the product-discovery-to-delivery gap. Working-backwards inputs, KPI taxonomy, prototyping cycles, and measurement scaffolding tied to revenue, trust, and veracity metrics.

**When it activates:**
- Goal includes `prototyping` (weight 90)
- Goal includes `gen-ai-rollout` (weight 75)
- AIM business perspective ≤ 3 (weight 60)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `facilitate-working-backwards` | Run Amazon-style working-backwards exercise |
| `define-kpi-taxonomy` | Define revenue/trust/veracity KPI taxonomy |
| `instrument-prototype-measurement` | Wire KPIs into the prototype |

**Lifecycle stages:** transform

---

## AI Resilience

**ID:** `resilience` | **Version:** 1.0.0 | **Source:** [AWS Well-Architected Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/)

Build fault-tolerant AI systems with production-grade operational practices. Based on the [AWS Well-Architected Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/) and AWS Resilience Hub.

**When it activates:**
- Goal includes `resilience` (weight 95)
- AIM operations perspective ≤ 2 (weight 80)
- 5+ AI systems in production (weight 70)

**Skills:**
| Skill | What it does |
|-------|-------------|
| `map-blast-radius` | Map blast radius of every AI dependency |
| `design-graceful-degradation` | Design degradation policies for AI failures |
| `run-chaos-day` | Plan and run chaos engineering exercises |
| `track-resilience-metrics` | Define and track MTTR, alarm rates, coverage |

**Lifecycle stages:** transform → ai-native

---

## Activation Quick Reference

| Goal | Programs that activate |
|------|----------------------|
| `build` | ai-native-app-builder, aws-aidlc, fde-orchestration |
| `aidlc` | aws-aidlc (99), ai-native-app-builder (70), fde-orchestration |
| `responsible-ai` | responsible-ai, aim, fde-orchestration |
| `gen-ai-rollout` | aim, agentpath, ai-plc, fde-orchestration |
| `resilience` | resilience, fde-orchestration |
| `prototyping` | ai-plc, ai-native-app-builder, aws-aidlc, fde-orchestration |

Additional activations based on intention fields:
- `regulated: true` → responsible-ai (95), ai-operations (60)
- `aim.operations ≤ 2` → resilience (80)
- `aim.platform ≥ 3` → agentpath (75)
- `production.aiSystems ≥ 5` → resilience (70), agentpath (50)
- `production.aiSystems ≥ 3` → ai-operations (70)
