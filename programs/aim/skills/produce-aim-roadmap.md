---
id: produce-aim-roadmap
name: "Produce AIM Roadmap"
description: "Translate a completed AIM assessment into a horizon-based roadmap with named owners and measurable outcomes."
trigger:
  kind: command
  phrase: "/aim-roadmap"
outputs:
  - name: roadmap
    path: artifacts/roadmaps/aim-roadmap-{timestamp}.md
    kind: document
---

## Objective

Translate a completed AIM assessment into a prioritized 90-day / 180-day / 365-day roadmap with named owners and measurable outcomes. The roadmap is the engagement's contract with the customer — what will change, by when, measured how.

## Procedure

1. Read the most recent assessment artifact under `artifacts/assessments/`.
2. For each perspective scoring below the target tier, identify one concrete next step that advances the perspective by exactly one tier. Exactly one. Not three.
3. Group steps into horizons:
   - **90-day** — quick wins, visible outcomes, unblocks something stuck today
   - **180-day** — structural changes (new roles, new platforms, new policies) that need executive sign-off
   - **365-day** — strategic capability builds (multi-team rollouts, foundation-model migrations, enterprise agentic transformation)
4. For every step, name an owner (role, not person — the person may rotate, the role must not) and a measurable outcome. "Improve developer productivity" is not measurable. "Raise Amazon Q Developer adoption from 22% to 55%" is.
5. Call out dependencies between steps. If the 180-day governance framework depends on the 90-day compliance baseline, write that edge down.
6. Review with the customer's executive sponsor and incorporate changes as in-line comments, not rewrites. Preserve what the facilitator wrote; customer edits should be visible.

## Done when

- The roadmap artifact exists and covers every perspective below target tier.
- Every step has a horizon (90/180/365), a named owner role, and a measurable outcome.
- Dependencies between steps are visible.
- The executive sponsor has signed off or requested named revisions.
