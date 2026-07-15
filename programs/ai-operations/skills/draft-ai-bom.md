---
id: draft-ai-bom
name: "Draft AI Business Operating Manual"
description: "Produce the first-cut AI BOM — inventory, classification, governance roles, incident response — scoped to the customer's current production AI footprint."
trigger:
  kind: command
  phrase: "/ai-bom"
outputs:
  - name: bom
    path: artifacts/ai-bom/bom-{timestamp}.md
    kind: document
---

## Objective

Produce the v1 AI Business Operating Manual. Not perfect, not complete — usable. The customer must be able to answer the regulator's first three questions from it.

## Procedure

1. Inventory every production AI system: purpose, owner, model(s) used, data sources, downstream consumers, approximate scale, approximate cost.
2. Classify each system: informational, decision-support, decision-making, autonomous. Higher class = more governance required.
3. For each class, specify: change-approval path, deployment sign-off, incident escalation, pause/rollback authority.
4. Document incident response — what is an AI incident, what isn't, who is paged, what is the SLA to first response.
5. Document drift and deprecation — how versions are evaluated, when old versions retire.
6. Document audit readiness — what is logged, where, retention period, query path.
7. Produce `artifacts/ai-bom/bom-{timestamp}.md`.

## Done when

- The AI BOM v1 exists covering all production systems.
- Every system has a named owner and a classification.
- Incident response SLAs are explicit.
- The COO or Chief AI Officer has reviewed and accepted v1 as the working document.
