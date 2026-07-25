---
id: produce-model-card
name: "Produce a Model Card"
description: "Generate a Responsible AI model card for a customer's deployed (or about-to-deploy) ML/LLM workload. Covers intended use, performance characteristics, training data lineage, fairness analysis, and known limitations."
trigger:
  kind: command
  phrase: "/model-card"
outputs:
  - name: model-card
    path: artifacts/rai-model-cards/{model-id}-card.md
    kind: document
---


## Objective

Produce a documented model card for one ML/LLM workload following the AWS Responsible AI service-card pattern. The card is the durable artifact a customer can hand to their security review board, regulator, or compliance team without further translation work.

## Procedure

1. **Identify the model in scope.** One model per card. Custom-trained, fine-tuned, and prompt-engineered models all qualify. A retrieval-augmented generation pipeline counts as one model when the surface contract is the same.
2. **Capture intended use.** From the workload owner: the user populations, the decision the model supports, the failure mode the customer is willing to accept, the failure mode the customer is NOT willing to accept.
3. **Document data lineage.** Where did the training data come from. What was filtered out. What consent or licence applies. For RAG / retrieval, what is the corpus and how is it kept current.
4. **Performance characteristics.** Quantitative where possible (precision/recall/AUC, exact-match, BLEU, hallucination-rate against a held-out eval set). Qualitative where not (red-team findings, expert review notes).
5. **Fairness analysis.** Stratify performance by relevant protected and quasi-protected attributes. Document the analysis even when data is unavailable; the absence of disaggregated data is itself a finding.
6. **Known limitations.** Specific scenarios where the model is known to fail. Out-of-distribution behaviour. Drift signals. Recovery procedure.
7. **Operational guardrails.** Input filters, output filters, abstain conditions, human-in-the-loop checkpoints.
8. **Render to template.** Use `templates/rai-model-card.md.hbs`.

## Done when

- One model card artifact exists at `artifacts/rai-model-cards/{model-id}-card.md`.
- All eight sections are populated (no `TBD`s remaining).
- The customer's workload owner and a compliance representative have signed off.
- The card has been linked from the workload's runbook so on-call engineers can find it during incidents.
