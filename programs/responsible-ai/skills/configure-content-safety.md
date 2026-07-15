---
id: configure-content-safety
name: "Configure Content Safety Controls"
description: "Stand up the content-safety stack for a generative AI workload. Bedrock Guardrails, custom denylists, output classifiers, and abstain conditions tied to the workload's risk profile."
trigger:
  kind: command
  phrase: "/content-safety"
outputs:
  - name: config
    path: artifacts/rai-guardrails/content-safety-{workload-id}.yaml
    kind: config
  - name: runbook
    path: artifacts/rai-guardrails/content-safety-{workload-id}-runbook.md
    kind: document
---


## Objective

Wire the workload to a tested, monitored content-safety stack. The customer should not be writing their own profanity filter. They should be configuring the AWS-provided primitives to their threat profile.

## Procedure

1. **Profile the threat surface.** What harms are in scope (PII leak, hate, self-harm, professional misconduct, hallucination of regulated facts). What harms are explicitly out (e.g. an internal tool may not need profanity filtering).
2. **Pick the primitives.**
   - Amazon Bedrock Guardrails for input/output content classifiers and topic policies.
   - Bedrock Guardrails contextual grounding for hallucination detection in RAG.
   - PII detection and redaction (Comprehend / Bedrock).
   - Custom denylists for customer-specific terms (legal disclosed, brand-protected, IP-restricted).
3. **Configure the policy.** Encode in `content-safety-{workload-id}.yaml` so the policy is versioned and reviewable. Reference: AWS Bedrock Guardrails policy schema.
4. **Define abstain conditions.** When does the system refuse vs. respond with caveats vs. respond normally. Refusal text must be customer-approved.
5. **Test against a held-out eval.** Min 100 prompts covering each in-scope harm and 50 benign prompts. Track false-positive and false-negative rates.
6. **Wire metrics.** Every classifier decision lands in CloudWatch with the tier and the policy id. Alarms on false-positive rate spikes (false alarms erode user trust faster than missed harms).
7. **Write the runbook.** What to do when a guardrail fires. Who reviews. How to amend the policy.

## Done when

- The policy file is checked into the workload's IaC repo.
- The runbook is linked from the on-call rotation.
- Eval scores are recorded in `artifacts/rai-guardrails/eval-{workload-id}-{timestamp}.json`.
- A scheduled re-eval cadence is in the customer's calendar.
