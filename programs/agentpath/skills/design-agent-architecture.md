---
id: design-agent-architecture
name: "Design Agent Architecture"
description: "Select the right agentic pattern for the customer's use case using AWS Prescriptive Guidance patterns. Produces an architecture decision record."
trigger:
  kind: command
  phrase: "/design-agent"
outputs:
  - name: artifact
    path: artifacts/agents/architecture-{timestamp}.md
    kind: document
---

## Objective

Help the customer select the right agentic AI pattern for their use case. Produce an Architecture Decision Record (ADR) documenting the chosen pattern, trade-offs, and AWS services.

## Pattern Selection Framework

Based on [AWS Prescriptive Guidance — Agentic AI Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agent-patterns.html):

### Pattern 1: Basic Reasoning Agent
**When to use:** Single-step reasoning, classification, summarization. No tools, no memory, no state.
- Stateless, lightweight, composable
- Use cases: Q&A, policy explanations, scoring, labeling
- AWS: Bedrock + Lambda (stateless microservice)

### Pattern 2: Agent RAG (Retrieval-Augmented Generation)
**When to use:** Enterprise knowledge, compliance, customer support where the agent needs to ground answers in specific documents.
- External knowledge search before LLM reasoning
- Fact-grounded output without fine-tuning
- AWS: Bedrock Knowledge Bases + OpenSearch/Kendra + S3

### Pattern 3: Tool-Based Agent (Function Calling)
**When to use:** The agent needs to take actions — query databases, call APIs, execute code, manage resources.
- Server-side execution of tools
- MCP integration for tool discovery
- AWS: Bedrock Agents + Strands Agents SDK + AgentCore

### Pattern 4: Multi-Agent Collaboration
**When to use:** Complex workflows requiring specialisation — multiple agents with different expertise coordinating.
- Supervisor/specialist topology (one routes, others execute)
- Peer-to-peer topology (agents negotiate)
- AWS: Step Functions + multiple Bedrock Agents/Strands agents

### Pattern 5: Coding Agent
**When to use:** AI-powered development workflows — code generation, review, testing, deployment.
- Spec-driven development
- IDE integration via MCP
- AWS: Kiro + Bedrock + CodeWhisperer patterns

## Decision Procedure

1. **Identify the core task.** What does the agent need to DO?
   - Just answer questions → Pattern 1 or 2
   - Take actions in systems → Pattern 3
   - Coordinate multiple specialists → Pattern 4
   - Write/modify code → Pattern 5

2. **Assess complexity.**
   - Single turn, no state → Pattern 1
   - Needs external knowledge → Pattern 2
   - Needs tools + memory + loops → Pattern 3
   - Multiple domains of expertise → Pattern 4

3. **Check constraints.**
   - Latency requirements (sync vs async)
   - Cost envelope (simple patterns are cheaper)
   - Data sensitivity (determines guardrail depth)
   - Compliance needs (audit trail, HITL gates)

4. **Document the decision** in an ADR with:
   - Context (what problem we're solving)
   - Decision (which pattern, why)
   - Consequences (trade-offs accepted)
   - AWS services selected
   - Guardrail requirements

## Output Template

```markdown
# Agent Architecture Decision Record

## Context
[Customer use case, constraints, requirements]

## Decision
Pattern: [1-5]
Topology: [single | supervisor-specialist | peer-to-peer]

## AWS Services
- Orchestration: [Strands Agents / Bedrock Agents / Step Functions]
- Model: [Claude Sonnet / Haiku / Nova]
- Knowledge: [Bedrock KB + OpenSearch / Kendra / None]
- Deployment: [AgentCore / Lambda / ECS]
- Guardrails: [Bedrock Guardrails config]

## Trade-offs
[What we're optimising for, what we're accepting]

## Next Steps
→ Hand off to /build-app for implementation
```

## Done when

- ADR exists at the documented path with all sections populated
- Pattern selection is justified with customer-specific evidence
- AWS service choices are documented with rationale
- Trade-offs are explicitly stated
- The customer has reviewed and agreed to the architecture direction

## Integration with AI-DLC

When `aws-aidlc` is also active, AgentPath's architecture decisions feed directly into AI-DLC's Inception phase:

- The ADR produced by this skill becomes input to AI-DLC's **Application Design** stage
- AI-DLC's Requirements Analysis captures the "what"; AgentPath's ADR captures the "how (architecturally)"
- Run `/design-agent` **before** or **during** AI-DLC Inception — the architecture decision informs the requirements depth and unit generation

Sequence when both programs are active:
```
/design-agent → produces ADR (pattern, topology, guardrails)
    ↓
/aidlc-inception → AI-DLC uses ADR as input to Application Design stage
    ↓
/build-app → ai-native-app-builder implements the design
```
