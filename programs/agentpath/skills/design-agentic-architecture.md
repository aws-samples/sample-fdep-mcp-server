---
id: design-agentic-architecture
name: "Design Agentic Architecture"
description: "Produce an agent-topology + tool-access + HITL design for a specific agentic use case; document the five architecture decisions explicitly."
trigger:
  kind: command
  phrase: "/agent-design"
outputs:
  - name: architecture
    path: artifacts/agentpath/architecture-{timestamp}.md
    kind: document
---

## Objective

For a specific agentic use case — not the whole enterprise — produce an implementable design that names the five architecture decisions, the guardrails, and the stopping conditions.

## Procedure

1. Define the use case in a single sentence. "Customer-service agent that can create, update, and close support tickets" is a use case. "Agentic AI for operations" is not.
2. Walk the five decisions from `agentpath-framework` steering: topology, tool access, memory, human-in-the-loop, guardrails.
3. Specify stopping conditions: what ends a session (task complete, budget exceeded, guardrail tripped, human escalation).
4. Specify observability: every agent step is logged with input, output, and reasoning trace.
5. Specify the human escalation path: which conditions escalate, to whom, with what context, within what SLA.
6. Produce `artifacts/agentpath/architecture-{timestamp}.md` with a topology diagram (mermaid), tool list, and stopping-condition table.

## Done when

- The architecture artifact exists.
- All five architecture decisions are recorded with rationale.
- Stopping conditions and escalation paths are specified.
- Security and compliance have reviewed and signed off on the tool access list.
