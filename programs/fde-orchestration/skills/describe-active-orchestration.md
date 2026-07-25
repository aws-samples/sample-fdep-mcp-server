---
id: describe-active-orchestration
name: "Describe Active Orchestration"
description: "Generate a visual and narrative snapshot of the active pipeline for an engagement — what's running, what's queued, what dependencies are satisfied."
trigger:
  kind: command
  phrase: "/orchestration"
outputs:
  - name: snapshot
    path: artifacts/orchestration/snapshot-{timestamp}.md
    kind: document
---

## Objective

Produce a current-state snapshot of the orchestration graph for this engagement. The snapshot is a communication tool — for the customer, for an incoming FDE, or for leadership review.

## Procedure

1. Read the resolved pipeline from engagement state.
2. For each stage, list: active programs, their applicability rule that fired, their score, their downstream dependencies.
3. Generate a mermaid flowchart of the orchestration graph.
4. Describe in plain language what this means for the customer: "Because your Governance score is 2 and you are regulated, Responsible AI runs in parallel with AIM; AgentPath is queued but won't run until Platform scores ≥ 3 on re-assessment."
5. Produce `artifacts/orchestration/snapshot-{timestamp}.md`.

## Done when

- The snapshot artifact exists with both the diagram and the narrative.
- A non-technical reader can understand what's active and why from the narrative alone.
