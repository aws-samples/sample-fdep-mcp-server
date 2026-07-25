---
id: sox-model-risk-steering
description: "SOX and SR 11-7 model risk governance for AI systems influencing financial reporting"
inclusion: auto
match: "artifacts/rai-reviews/**"
priority: 85
---

# SOX and SR 11-7 Model Risk Governance

This steering applies when an AI system influences financial reporting,
regulatory reporting, credit decisions, market risk, liquidity risk,
operational risk, or any other decision the financial institution's
model risk management (MRM) function treats as a "model" under SR 11-7
or an equivalent supervisory standard.

## Threshold questions

1. Does the output of the AI system feed, directly or indirectly, a
   line item in the financial statements, a regulatory report, or an
   internal capital or liquidity calculation? If yes, SOX ICFR applies
   and the system is likely in scope for MRM.
2. Does the system make or materially shape decisions with prudential
   risk impact (underwriting, pricing, reserving, fraud adjudication,
   AML alerts, trader surveillance)? If yes, treat it as a model under
   SR 11-7.
3. Is the system an "advanced model" (foundation model, agent,
   retrieval-augmented generation) where interpretability is limited?
   If yes, assume elevated model risk tier and stronger compensating
   controls.

## Governance expectations

- **Model inventory**: The system is registered in the institution's
  model inventory with owner, purpose, data inputs, intended use, and
  known limitations.
- **Model risk tier**: Assign a tier using the institution's existing
  MRM methodology. Do not invent a new tiering scheme for AI; align.
- **Effective challenge**: A party independent of development performs
  review covering conceptual soundness, data, implementation, outcomes
  analysis, and ongoing monitoring.
- **Validation**: Initial validation produces a written report covering
  the SR 11-7 pillars. Revalidation cadence is tied to the model risk
  tier and triggered by material change events.
- **Change control**: Prompt changes, tool surface changes, retrieval
  corpus changes, and model version changes are tracked as model
  changes and assessed for materiality before deployment.
- **Monitoring**: Production metrics cover prediction drift, input
  drift, outcome error rate where observable, hallucination rate for
  generative outputs, and a human-override rate.
- **Documentation**: The model document template covers intended use,
  out-of-scope uses, data lineage, feature definitions, training and
  evaluation protocols, known failure modes, monitoring, and escalation
  paths.

## SOX-specific controls

- If the system participates in a SOX-relevant process, the related
  key controls are identified, evidenced, and tested with the same
  rigor as any other ICFR control.
- Access to the production model, prompts, retrieval corpus, and agent
  tool configuration is restricted under segregation-of-duties rules.
  Developers cannot deploy without an independent approver.
- Change approvals, test evidence, and production deployment records
  are retained per the institution's records retention policy.

## Artifacts to produce

- A model risk governance document aligned to SR 11-7 (see the
  `model-risk-governance-doc` exit criterion). This document lives at
  `artifacts/rai-reviews/sr-11-7-<system>-<date>.md`.
- A mapping from the system's components to the institution's model
  inventory entry.
- Evidence of effective challenge: validation report, outcomes
  analysis, or equivalent.

## Anti-patterns to refuse

- Treating an AI system as "not a model" to avoid MRM scope when it
  clearly meets the definition.
- Deploying prompt or retrieval-corpus changes without a materiality
  assessment.
- Monitoring only developer-chosen metrics without an independently
  defined acceptance envelope.
- Skipping documentation because the underlying model is a third-party
  foundation model. The institution is still accountable for the use.

## Done when

- The model risk governance document exists under
  `artifacts/rai-reviews/sr-11-7-*.md` and has been reviewed by the
  institution's MRM or second-line function.
- The model is entered in the institution's model inventory with the
  correct tier.
- Effective challenge has been performed and documented.
- Monitoring metrics, thresholds, and escalation paths are live.
