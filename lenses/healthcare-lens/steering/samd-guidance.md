---
id: healthcare-lens-samd-guidance
description: "Software as a Medical Device (SaMD) regulatory alignment guidance for AI systems"
inclusion: auto
match: "**/*.md"
priority: 70
---

# Software as a Medical Device Guidance

When an AI system's outputs inform clinical decisions or patient care, the customer may classify it as Software as a Medical Device (SaMD). Align FDE artifacts to the customer's existing quality and regulatory program for medical devices rather than introducing parallel processes.

## Intended use and risk

- Document the clinical situation, the decision the system informs, and the significance of information provided to the healthcare decision.
- Confirm the risk category the customer's regulatory function has assigned, including any adaptive or learning behavior that changes after deployment.
- Record the boundary between clinical judgment and system output so downstream reviewers can see where human oversight is retained.

## Lifecycle evidence

- Design controls, verification, and validation evidence should flow into the customer's existing quality system, not a parallel FDE store.
- Capture the change-control path for model updates, including when a change constitutes a new submission under the customer's regulatory plan.
- Record post-market surveillance signals the customer already collects and how AI-specific monitoring maps to them.

## Anti-patterns

- Treating a clinical-decision AI feature as general software and skipping the customer's device quality gates.
- Citing specific regulatory frameworks or geographies in portable lens content — those decisions belong in customer-managed artifacts that track their jurisdiction and submission posture.
- Shipping adaptive model behavior without documenting the predetermined change-control plan the customer's regulatory function requires.
