---
id: run-pdlc-diagnostic
name: "Run AI-PLC Diagnostic"
description: "Measure where PM cycle time is lost and identify the two highest-leverage stages to AI-assist."
trigger:
  kind: command
  phrase: "/pdlc-diagnostic"
outputs:
  - name: diagnostic
    path: artifacts/pdlc/diagnostic-{timestamp}.md
    kind: document
---

## Objective

Produce a time-and-motion picture of the customer's product lifecycle to show where PM-side time is lost and which two stages have the highest leverage for AI investment.

## Procedure

1. Pick the most recently shipped feature with the product team. Walk it back from release to first idea.
2. For each of the five PDLC stages, log: elapsed time, blocker count, rework count.
3. Identify the stage where the feature sat longest (usually Insight or Definition — rarely Build).
4. Identify the stage with the highest rework rate (building the wrong thing).
5. Propose the two stages to AI-assist first and name the expected cycle-time reduction.
6. Produce `artifacts/pdlc/diagnostic-{timestamp}.md`.

## Done when

- The diagnostic artifact exists.
- The two target stages are named with an expected cycle-time reduction.
- The CPO or VP of Product has acknowledged the findings.
