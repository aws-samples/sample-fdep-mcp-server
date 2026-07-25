---
id: rai-five-dimensions
description: "The five dimensions of Responsible AI assessment and review"
inclusion: always
---


# Responsible AI: the five dimensions

Every Responsible AI conversation we have with a customer covers five dimensions. They are not a checklist; they are the lens through which any AI workload is reviewed.

## Fairness

Outcomes do not systematically disadvantage protected or quasi-protected groups. Disaggregated performance is measured. Disparate impact is documented. The customer can defend their fairness posture to a regulator.

Common gaps: missing disaggregated eval data; "we don't collect demographic data so we can't measure" (that is itself the finding); proxy attributes (zip code as race proxy).

## Privacy

Personal data is identified, classified, retained per a documented policy, and accessible only by parties with a legitimate need. PII does not leak through model outputs. Right-to-deletion is operationally executable.

Common gaps: training data with unconsented PII; RAG retrievers indexing PII-laden documents without per-document access control; no DSAR (data subject access request) flow for AI-generated content.

## Transparency

The customer can explain to a user why the model made the decision the user is seeing. The customer can explain to a regulator how the system was built and is operated. The model card is up-to-date.

Common gaps: black-box deployments with no model card; explanations that are post-hoc rationalisations (LIME / SHAP without grounding); marketing copy that overclaims model capabilities.

## Safety

The model does not produce outputs that cause real-world harm (medical mis-advice, illegal instruction, hate). Failure modes are documented. There is a kill-switch.

Common gaps: no input filtering; no output classification; "the model is well-behaved in our internal testing" (not an answer); no incident-response runbook for safety violations.

## Accountability

A named human owns the workload. A named human owns each guardrail. There is a clear escalation when the system misbehaves. Audit trails exist and are retained.

Common gaps: distributed ownership (everyone is responsible, no one is accountable); guardrails that no one tests; audit logs that are not retained long enough to support an investigation.

## When applying these dimensions

Use them as a structured lens during reviews. Score each dimension low / medium / high risk with cited evidence. The output is a documented review artifact, not a one-time conversation.

Be specific. "Privacy is fine" is not an answer. "We retain conversation logs for 90 days, redact PII at write time, and the redaction tested at 99.2% recall on the eval set" is an answer.
