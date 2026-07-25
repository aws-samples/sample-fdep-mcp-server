---
id: agentpath-framework
description: "FDE AgentPath framework - agent architecture decision model based on AWS Prescriptive Guidance patterns"
inclusion: always
priority: 90
---

# AgentPath Framework

Reference: [AWS Prescriptive Guidance — Agentic AI Patterns and Workflows](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html)

## The Five Architecture Decisions

Every agentic system requires five explicit decisions. AgentPath ensures these are made deliberately, not by default.

### 1. Pattern Selection

Which AWS agentic pattern fits the use case?

| Pattern | When to use | Complexity | AWS Services |
|---------|-------------|-----------|-------------|
| Basic Reasoning Agent | Single-step reasoning, classification, Q&A | Low | Bedrock + Lambda |
| Agent RAG | Knowledge-grounded responses, enterprise search | Medium | Bedrock KB + OpenSearch + S3 |
| Tool-Based Agent | Actions in external systems, API calls, data mutation | Medium-High | Strands Agents + AgentCore |
| Multi-Agent Collaboration | Multiple domains of expertise, complex workflows | High | Step Functions + multiple agents |
| Coding Agent | Code generation, review, testing, deployment | High | Kiro + Bedrock |

**Decision rule:** Start with the simplest pattern that meets requirements. Upgrade complexity only when simpler patterns demonstrably fail.

### 2. Topology

How are agents organised?

| Topology | When | Trade-off |
|----------|------|-----------|
| **Single agent** | One domain, < 10 tools | Simple but limited |
| **Supervisor + specialists** | Multiple domains, clear routing | Scalable but supervisor is a bottleneck |
| **Peer-to-peer** | Agents negotiate, no central control | Flexible but hard to debug |
| **Pipeline** | Sequential processing stages | Predictable but inflexible |

### 3. Tool Access

What can the agent do in the world?

- **Allowlisted tools only** — agent cannot discover or invoke tools not in its registry
- **Least privilege** — each tool has minimum required IAM permissions
- **Parameter validation** — every tool input is schema-validated before execution
- **Audit trail** — every tool invocation is logged with input, output, and reasoning

### 4. Human-in-the-Loop

Where does the agent pause for human judgement? (See `/design-hitl` skill for detailed framework)

- Irreversible actions → Require approval
- High-cost actions → Display cost, require confirmation
- Low-confidence outputs → Flag for human review
- Regulated decisions → Human accountability required

### 5. Guardrails

What prevents the agent from causing harm? (See `/build-guardrail-catalog` skill for detailed framework)

Four layers: Input → Output → Action → Observability

Primary implementation: **Amazon Bedrock Guardrails** for content/grounding + custom controls for action/cost guardrails.

## Foundational Principles (from AWS Prescriptive Guidance)

All agentic systems share three core properties:

1. **Asynchronous** — agents operate in loosely coupled, event-rich environments
2. **Autonomy** — agents act independently within defined boundaries
3. **Agency** — agents act with purpose toward specific goals on behalf of users

## Handoff to Implementation

AgentPath produces **design decisions**. Implementation happens in `ai-native-app-builder`:
- Pattern selection → routes to the correct layers and services
- Tool design → implemented in Layer 6 (AI Agents)
- Guardrails → configured in Bedrock Guardrails + CDK
- Observability → implemented in cross-cutting Observability layer

When the architecture design is approved, hand off with: `/build-app`
