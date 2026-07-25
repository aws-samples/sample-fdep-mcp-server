---
id: fs-lens-regulatory-reporting
description: "Regulatory reporting posture guidance for AI system documentation in financial services"
inclusion: auto
match: "**/*.md"
priority: 70
---

# Regulatory Reporting Posture

When documenting AI systems for a financial-services customer, include evidence that supports their supervisory reporting obligations. Capture model intent, scope of use, and change-control artifacts in the same format the customer's model risk function already uses. Prefer templates the customer has already adopted over introducing new formats.

## What to document

- Model purpose, inputs, outputs, and boundaries of intended use.
- Training data lineage summary, including any third-party sources and the governance controls applied.
- Change log of material model updates and the approvals recorded against each.
- Monitoring metrics the customer has agreed map to their supervisory obligations.

## Anti-patterns

- Replicating the customer's reporting package inside FDE artifacts — link to or reference their authoritative system instead.
- Citing specific regulations in generic program content (those should live in customer-managed artifacts, not in the portable lens).
