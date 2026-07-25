---
id: fs-lens-separation-of-duties
description: "Separation of duties controls for AI model development and deployment in regulated environments"
inclusion: auto
match: "**/*.md"
priority: 70
---

# Separation of Duties

Operational controls in regulated financial-services environments typically require that the identity that develops or trains a model is not the same identity that deploys or approves that model for production use. Reflect that separation in any FDE-generated runbooks and operational playbooks.

- Identify the role expected to develop, the role expected to review, and the role expected to approve each change.
- Document the control point in the customer's change-management system rather than in FDE.
- When automation spans those roles, require a human approval gate at the boundary.
