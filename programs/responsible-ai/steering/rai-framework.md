---
id: rai-framework
description: "Responsible AI review framework for systematic evaluation of AI systems"
inclusion: auto
match: "artifacts/rai-reviews/**"
priority: 85
---

# Responsible AI Review Framework

Five dimensions evaluated for any AI workload. Each dimension gets a risk rating (low / medium / high) with cited evidence.

## The five dimensions

1. **Fairness** — Does the system perform equitably across user populations (race, gender, age, geography, income, ability)? Are disparate outcomes measured, monitored, and remediated?
2. **Privacy** — Are personal data flows minimized, encrypted in transit and at rest, and subject to data-subject access rights? Where does training data come from and can consent be traced?
3. **Transparency** — Can the system's behavior, capabilities, and limitations be explained to users, operators, and auditors? Is there a model card? An incident log? A way to contest a decision?
4. **Safety** — What are the failure modes (hallucination, prompt injection, jailbreak, data leakage, denial-of-service)? What keeps them bounded? What is the blast radius if a bound breaks?
5. **Accountability** — Who owns the decisions the system makes? Who signs off on deployment? Who is notified on incident? Who can shut it down? Are those names real today?

## Risk rating

- **Low** — Controls in place, evidence exists, residual risk is acceptable.
- **Medium** — Partial controls or weak evidence; mitigation proposed but deployment proceeds.
- **High** — Controls absent or evidence contradictory; deployment pauses or scale is capped until mitigation is in place.

## Applicable regulatory frameworks (map, do not substitute for legal review)

- **EU AI Act** (European Union) — risk-tiered obligations; high-risk AI systems require conformity assessments
- **NIST AI RMF** (US) — voluntary but increasingly required in federal procurement
- **HIPAA** (US healthcare) — PHI handling, minimum necessary, access logs
- **FINRA / SEC / MiFID II** (financial services) — explainability, audit trail, customer-facing AI disclosures
- **State-level AI laws** (e.g., NYC AEDT, Colorado AI Act) — bias audits, notification, opt-out

## How the FDE toolkit uses RAI

RAI activates automatically when:
- Customer is in a regulated industry (`intake.regulated === true`)
- AIM Governance score ≤ 2
- AIM Security score ≤ 2
- The engagement intent includes `responsible-ai`

RAI pairs with:
- **AIM** (always — RAI is a follow-on to the assessment)
- **AgentPath** (for agent-specific safety guardrails)
- **School of Resilience** (for production AI systems)
- **AI Operations** (when Governance AND Operations both score low)

## Done-when

An RAI review artifact exists at `artifacts/rai-reviews/rai-*.md` with:
- All five dimensions assessed with cited evidence
- Risk ratings per dimension
- High-risk findings with named mitigations and escalation paths
- Regulatory framework mapping where applicable
- Signed off by both product owner and compliance representative
