---
id: aim-bootstrap-runtime
name: "AIM Bootstrap (Runtime)"
description: "Adaptive AI Maturity Model interview; delegates question sequencing to the agent."
trigger:
  kind: command
  phrase: "run aim assessment runtime"
outputs:
  - name: assessment
    path: artifacts/assessments/aim-{timestamp}.md
    kind: document
---

## When to use this mode

Choose this mode when **all** of the following hold:

- The engagement is **online** and connected to a live FDE MCP server (the agent can call `fde_aim_assess` over the session).
- The intention is **non-regulated** — `intention.regulated !== true`. Regulated engagements MUST use `aim-bootstrap-pregenerated.md` so every question and rubric is auditable and identical across sessions.
- The facilitator or sponsor wants a **conversational, adaptive** assessment instead of a fixed questionnaire.

If any of those conditions fail, stop and switch to `aim-bootstrap-pregenerated.md`. The selection algorithm in `core/src/aim/select.ts` will make that call automatically, but the agent should verify before starting.

## Objective

Conduct an adaptive interview across the six AIM perspectives — **Business, People, Governance, Platform, Security, Operations** — and emit an `AimAssessmentResult`. The agent drives question sequencing; the MCP server scores.

## Interview strategy

You are the interviewer. Work incrementally and let the customer's answers shape what you ask next.

1. **Open with a scoping question.** Something broad enough to surface the customer's current AI posture without leading them. For example: *"Tell me about the last AI-adjacent initiative your organization shipped — what went well, what stalled, and who owns it today?"* Capture the answer verbatim.

2. **Pick the lowest-signal perspective to probe first.** After the scoping question, identify the perspective you know the **least** about and start there. The weakest-link tier is what the overall AIM score will reflect, so early investment in the least-understood perspective yields the highest information gain. Typical ordering when nothing stands out:
   - Governance (often under-instrumented outside regulated industries)
   - Operations (reveals real production maturity, not aspirational roadmaps)
   - Security (separates claimed posture from lived practice)
   - People → Platform → Business (usually easier to infer from public signals)

3. **Follow up adaptively.**
   - If an answer maps cleanly to a tier, probe for **counter-evidence** ("Is there a team or business unit where this looks different?") before locking the score.
   - If an answer is ambiguous, ask a narrower follow-up instead of moving on.
   - If an answer surfaces a new perspective you haven't covered, pivot — don't force a pre-set order.
   - Stop probing a perspective once you have (a) a verbatim quote, (b) a defensible tier 1..5, and (c) one counter-example check.

4. **Cite evidence as you go.** Every tier you assign must be backed by a specific response. Attach each response to an `EvidenceRef` so the final `AimAssessmentResult.evidence` array cites who said what.

5. **Close with the bottleneck.** Once all six perspectives are covered, name the lowest-scoring perspective explicitly to the customer and confirm they recognize it. The bottleneck determines the overall tier (minimum across perspectives) and the downstream program routing.

## Scoring via `fde_aim_assess`

This skill does **not** compute scores locally. Defer to the MCP server for consistency with pre-generated mode.

At natural checkpoints — typically after each perspective is covered, and always at the end — call:

```
fde_aim_assess({
  intentionId,                 // the currently loaded intention handle
  mode: "runtime",
  responses: {
    business:   { /* captured Q&A for this perspective */ },
    people:     { /* ... */ },
    governance: { /* ... */ },
    platform:   { /* ... */ },
    security:   { /* ... */ },
    operations: { /* ... */ }
  }
})
```

The server returns an `AimAssessmentResult`:

```
{
  aim: {            // AimScores patch — merged into intention.aim by the handler
    business, people, governance, platform, security, operations, overall
  },
  evidence: [       // citations to the responses array, one per tier claim
    { perspective, tier, quote, respondent }
  ],
  recommendations: [ /* short human-readable next steps */ ]
}
```

Pass only the perspectives you have collected so far; the server will return partial scores and flag which perspectives still need coverage. The handler will also apply the `aim` subtree as a patch to the intention and re-run `resolve`, so downstream program activation updates live as the interview progresses.

## Output contract

When the interview completes, the skill emits the same `AimAssessmentResult` shape produced by the pre-generated mode. Downstream consumers (the resolver, the roadmap skill, the engagement state writer) MUST NOT need to know which mode produced the result.

## Done when

- All six perspectives have a tier, a verbatim evidence quote, and one counter-example check.
- `fde_aim_assess` has been called with the full `responses` map and returned a complete `AimAssessmentResult`.
- The bottleneck perspective is named and acknowledged by the customer.
- The engagement state reflects the overall tier (`aim.overall`) and the `assess` stage is marked active.
