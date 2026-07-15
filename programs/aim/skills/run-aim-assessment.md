---
id: run-aim-assessment
name: "Run AIM Assessment"
description: "Facilitate the 4-hour AIM executive workshop across the six perspectives and produce a tiered assessment artifact."
trigger:
  kind: command
  phrase: "/aim-assess"
outputs:
  - name: assessment
    path: artifacts/assessments/aim-{timestamp}.md
    kind: document
---

## Objective

Facilitate a structured conversation with the customer's executive sponsor and practitioners to determine their current AI Maturity tier across the six AIM perspectives: **Business, People, Governance, Platform, Security, Operations**. Produce a written assessment with cited evidence.

## Procedure

1. Open the `aim-framework` steering file for the tier rubric and 6-perspective model.
2. Confirm the session roster: the executive sponsor (mandatory), one platform / data lead, one business-line leader, and one practitioner (engineer, data scientist, or equivalent). Without all four, the assessment will over-index on strategy or on tooling — not both.
3. Walk each perspective in order: Business → People → Governance → Platform → Security → Operations. Strategy first reframes everything else.
4. For each perspective:
   - Ask the open question from the workshop template (e.g., "Walk me through the last AI use case that shipped" for People, "What happens when an AI system misbehaves in production" for Operations).
   - Capture the customer's answer **verbatim** for evidence.
   - Assign a tier 1–5 using the rubric.
   - Probe for counter-evidence: "Is there a team or business unit where this looks different?"
5. Compute the overall tier as the **minimum** across perspectives (weakest-link) and note which perspective is the bottleneck.
6. Identify the **top 3 capability gaps** — the specific cells in the 31-capability inventory that blocked the bottleneck perspectives.
7. Produce `artifacts/assessments/aim-{timestamp}.md` using the `aim-assessment` template, including tier per perspective, evidence quotes, overall tier, and capability gap summary.
8. Run the routing logic: `ace state update --tier=<N> --stage=assess --aim-complete=true`. Downstream program activation (Responsible AI, AI Operations, AgentPath, etc.) is automatic based on scores and intake.

## Done when

- The assessment artifact exists and contains all six perspectives with tier + evidence quotes.
- The overall tier is recorded and the bottleneck perspective is named.
- The top 3 capability gaps are listed with the downstream program(s) each one maps to.
- The engagement state reflects the overall tier and the `assess` stage is marked active.
- The customer has reviewed and acknowledged the rating in writing (email confirmation counts).
