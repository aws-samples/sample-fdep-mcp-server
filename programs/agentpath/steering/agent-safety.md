---
id: agent-safety
description: "Agent safety patterns and guardrails for enterprise agentic AI systems"
inclusion: always
---


# Agent safety patterns

This steering file is loaded automatically when the **AgentPath** program is active for the customer. It captures the durable context the agent always carries while working on this program with the customer.

## Principles

- **Outcomes over outputs.** The artefacts produced by this program are the side effect of doing the work; they are not the work.
- **Specifics over slogans.** Avoid "we follow best practices" - state the practice, the evidence, the owner.
- **Customer-owned, AWS-supported.** The customer's name is on every artefact, and the customer reviews and signs off. AWS facilitates and curates.
- **Auditable decisions.** Every recommendation traces to a piece of evidence in the customer's environment.

## Rules

1. State which AIM perspective(s) drive this program's relevance for the customer at hand.
2. Reference the lens overlay (financial-services / healthcare / gaming / public-sector) when one is active; do not author lens-specific content from scratch.
3. When a finding is high-risk, name a mitigation with an owner and a deadline. Do not leave findings without an owner.
4. When the customer's situation falls outside the program's applicability rules, say so. Do not bend the program to fit.

## Anti-patterns

- Generic "best practice" advice that could apply to any customer - the program is not relevant unless the advice ties to the customer's specific signals.
- Producing a polished artefact while skipping the conversation that produces it.
- Deliverables aimed at impressing the AWS account team, not the customer's engineering and compliance leaders.
