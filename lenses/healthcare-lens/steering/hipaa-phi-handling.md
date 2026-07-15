---
id: healthcare-lens-hipaa-phi-handling
description: "HIPAA-aligned guidance for handling Protected Health Information (PHI) in AI systems"
inclusion: auto
match: "**/*.md"
priority: 70
---

# HIPAA-Aligned Handling of Protected Health Information

Healthcare customers operate under strict privacy and security rules on patient data. When AI systems interact with data the customer classifies as protected health information (PHI), align FDE artifacts to the customer's existing privacy and security program rather than introducing parallel controls.

## Boundary and minimum necessary

- Confirm where the customer draws the PHI boundary, including identifiers they treat as quasi-identifiers.
- Apply the minimum-necessary principle as the customer has implemented it: pass only the fields required for the task at hand.
- Treat any de-identified dataset as recoverable until the customer's privacy function has certified otherwise.

## Safeguards to record

- Administrative: documented access approvals, workforce training attestations, and business-associate arrangements already in place.
- Physical: the customer's existing controls over devices and workstations that touch PHI.
- Technical: encryption at rest and in transit, authentication, integrity, and audit controls the customer already relies on.

## Anti-patterns

- Standing up new PHI data stores inside FDE artifacts instead of reusing the customer's governed systems of record.
- Copying PHI into prompts, logs, or analytics pipelines that have not been assessed by the customer's privacy function.
- Treating de-identification as a one-time event rather than an ongoing obligation.
