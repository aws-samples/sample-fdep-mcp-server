---
id: run-rai-review
name: "Run Responsible AI Review"
description: "Walk a specific AI workload through the Responsible AI five-dimension review; produce a risk-rated findings artifact and mitigation plan."
trigger:
  kind: command
  phrase: "/rai-review"
outputs:
  - name: review
    path: artifacts/rai-reviews/rai-{timestamp}.md
    kind: document
---

## Objective

Produce a documented Responsible AI review of a specific customer workload covering Fairness, Privacy, Transparency, Safety, and Accountability. Every dimension gets a risk rating (low / medium / high) with cited evidence. Every high-risk finding gets a named mitigation and escalation path.

## Procedure

1. Identify the workload in scope with the customer. One workload per review; do not combine. "All our AI" is not a workload.
2. Open the `rai-framework` steering file for the five-dimension checklist.
3. For each dimension:
   - Walk the dimension's checkpoints with the workload's product owner AND a compliance / legal representative.
   - Capture: controls currently in place, specific gaps, evidence for each gap (logs, test results, policy text, or the absence thereof).
   - Assign a risk rating: low / medium / high.
4. For every **high-risk** finding:
   - Propose a named mitigation (concrete, time-bound, owner-assigned).
   - Identify the escalation path (who approves the mitigation, who signs off on residual risk).
   - Flag whether the workload should pause deployment or scale-up until mitigation is in place.
5. For **medium-risk** findings, propose a mitigation but do not block deployment.
6. Produce `artifacts/rai-reviews/rai-{timestamp}.md` using the standard RAI template, including workload identifier, five-dimension findings, risk summary, and the signed-off mitigation plan.
7. Where the customer is in a regulated industry, cross-reference findings against the applicable framework (EU AI Act, NIST AI RMF, HIPAA, FINRA, etc.) — do not substitute for legal review but name the mapping.

## Done when

- The review artifact exists and covers all five dimensions.
- Every finding has a risk rating and cited evidence.
- Every high-risk finding has a named mitigation, owner, and deadline.
- The applicable regulatory framework (if any) is mapped.
- The workload's product owner and a compliance representative have both signed off (email counts).


## Handoff

After the RAI review is complete:
- High-risk findings → `/rai-guardrails` (design the controls)
- Guardrail spec → `/build-app` (implement in `ai-native-app-builder`)
- Model card requirement → `/produce-model-card` (document the model)
- Content safety → `/configure-content-safety` (Bedrock Guardrails setup)
