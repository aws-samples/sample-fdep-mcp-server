---
id: aim-bootstrap-pregenerated
name: "AIM Bootstrap (Pre-generated)"
description: "Static, auditable AI Maturity Model assessment. Works offline; required for regulated engagements."
trigger:
  kind: command
  phrase: "run aim assessment pregenerated"
outputs:
  - name: assessment
    path: artifacts/assessments/aim-{timestamp}.md
    kind: document
---

## When to use this mode

Choose this mode when **any** of the following hold:

- The engagement is **air-gapped** or there is no live MCP server.
- The customer is **regulated** (`intention.regulated === true`). Regulated
  customers require identical question banks across sessions so a compliance
  reviewer can audit the tier assignment.
- The facilitator wants a **deterministic, reviewable** assessment with a
  visible rubric.

## How to run

Walk through every question in each perspective with the customer. Record
verbatim responses. Apply the rubric at the end of each perspective to
assign a tier 1..5. Cite responses in the output.

Every answer feeds exactly one `EvidenceRef`. The scoring rubric maps
response content to a tier; when multiple tiers are plausible, always take
the lower tier and note the counter-evidence.

## Question bank

### Business (intent, sponsorship, funding)

1. Name the executive sponsor for the current AI portfolio. Are they the
   same person who approves the budget?
2. How many current AI initiatives have a dollar target tied to them
   (cost saved or revenue uplift)? How many ship this quarter?
3. Who in the business is accountable for AI-driven outcomes (not the
   model, the business result)?
4. Describe the last AI initiative that was cancelled. Why?
5. Across the last 12 months, how has the AI portfolio's funding
   envelope changed — shrunk, held, grown?
6. How does the business measure the success of the AI portfolio as a
   whole, separate from individual use cases?

**Rubric**

- **Tier 1** — no named sponsor, no budget authority for AI, no business
  metric. AI is science-fair.
- **Tier 2** — sponsor exists but portfolio metrics live only in
  engineering; business can't articulate outcomes.
- **Tier 3** — funded portfolio with at least one production business
  metric; cancellations happen on evidence, not gut feel.
- **Tier 4** — portfolio KPIs reviewed in the business operating rhythm;
  business owners co-sign each use case.
- **Tier 5** — AI P&L is part of the business plan; allocation shifts
  between bets based on measured returns.

### People (skills, structure, change management)

1. How many engineers in the org are hands-on with generative AI today
   versus LLM-using-but-not-building?
2. Who owns the AI enablement curriculum (assume it exists)?
3. Are there AI-specific roles in the org chart — e.g. MLE, prompt
   engineer, AI SRE — or is AI work an overlay on existing roles?
4. Describe the last hire made specifically for AI work. How long did
   it take from req to start?
5. How do engineers learn what is and isn't allowed with customer data
   on AI projects?
6. When a model breaks in production, who is paged?

**Rubric**

- **Tier 1** — no named AI skills, no role separation, no enablement.
- **Tier 2** — pockets of AI skill in one or two teams; no shared
  curriculum.
- **Tier 3** — at least one dedicated AI team; AI enablement curriculum
  owned and measured.
- **Tier 4** — AI roles codified in the career framework; hiring
  pipeline exists and is shorter than 90 days.
- **Tier 5** — every engineer has an AI on-ramp; there is a published
  ladder from LLM user to AI engineer.

### Governance (policy, review, risk)

1. What written policy governs the use of generative AI in your
   organization? When was it last updated?
2. For each production AI system, can you name the decision-maker who
   approved its launch?
3. How is a model reviewed before it touches customer data?
4. When a model's behaviour changes (drift, new version, new prompt),
   who is notified?
5. Is there a register of production AI systems? If so, what fields
   does it carry?
6. How do you respond to a regulator question about a specific model's
   behaviour on a specific date?

**Rubric**

- **Tier 1** — no policy, no registry, no pre-launch review.
- **Tier 2** — policy exists but is not enforced; reviews happen
  post-hoc.
- **Tier 3** — every production model goes through a named review;
  registry exists but is partially populated.
- **Tier 4** — registry is authoritative; change notifications are
  wired to stakeholders; audit trails exist for every production
  model.
- **Tier 5** — policy, registry, audit trail, and change notifications
  are all machine-readable and regulator-ready on demand.

### Platform (infrastructure, tooling, lifecycle)

1. Where do production models run? Shared cluster or per-app?
2. How are prompts stored, versioned, and deployed?
3. How long does it take a model change to move from commit to
   production?
4. What observability do you have on LLM calls — token counts, latency,
   hallucination rate?
5. How do you A/B test a prompt change?
6. Is there a shared agent framework in the org, or does every team
   build its own?

**Rubric**

- **Tier 1** — ad hoc deployments, no prompt store, no LLM
  observability.
- **Tier 2** — shared infra for models but prompts live in tribal
  knowledge; observability is invoice-level only.
- **Tier 3** — prompts versioned; deployment path documented; LLM
  telemetry captured.
- **Tier 4** — platform team owns the substrate; A/B testing for
  prompts is native; rollout is automated.
- **Tier 5** — platform is a paved road — new teams inherit
  observability, A/B, and agent framework by default.

### Security (data handling, access, threat model)

1. What data classes are allowed to flow to a third-party model
   provider?
2. How do you prevent a developer from accidentally sending customer
   PII to a public model?
3. How is model-access credentialed — shared key, per-user, per-service?
4. What controls exist against prompt-injection attacks?
5. Have you done an offensive exercise against your AI stack? When?
6. How do you confirm that a model vendor is not training on your
   prompts?

**Rubric**

- **Tier 1** — no data-class policy; keys shared via chat; no prompt-
  injection controls.
- **Tier 2** — policy exists but is not enforced at runtime; keys are
  per-service but often reused.
- **Tier 3** — data-class enforcement at the gateway; keys are per-
  service and rotated; prompt-injection controls exist for user-
  facing apps.
- **Tier 4** — threat model documented; red-teamed at least once;
  vendor training-opt-out confirmed in writing.
- **Tier 5** — automated DLP on all AI inputs and outputs; continuous
  red-teaming; third-party attestation of vendor posture.

### Operations (monitoring, incident response, cost)

1. Do you know the dollar cost of your AI portfolio this month?
2. Who is paged when a production agent fails?
3. What's the MTTR for an AI-related incident?
4. Are AI incidents recorded in the same system as non-AI incidents?
5. What is the current p99 latency on your busiest LLM call path?
6. How do you notice a silent model regression?

**Rubric**

- **Tier 1** — no runtime telemetry; discovery happens when a customer
  complains.
- **Tier 2** — dashboards exist but no paging; cost is visible only
  after the invoice arrives.
- **Tier 3** — on-call rotation for AI; cost dashboards updated daily;
  incidents logged in the shared system.
- **Tier 4** — MTTR and cost are reviewed weekly; silent regression
  detection (golden sets, canaries) runs in CI.
- **Tier 5** — AI SRE playbooks cover the top failure modes; regression
  detection blocks bad deploys; cost is forecast with < 10% error.

## Output contract — `AimAssessmentResult`

When the assessment is complete, emit:

```
{
  aim: {
    business:   <1..5>,
    people:     <1..5>,
    governance: <1..5>,
    platform:   <1..5>,
    security:   <1..5>,
    operations: <1..5>,
    overall:    <minimum of the above>
  },
  evidence: [
    { questionId, excerpt, source }
  ],
  recommendations: [
    "< short next-step string >"
  ]
}
```

The overall tier is always the **minimum** across perspectives (weakest
link). The downstream resolver uses `aim.governance`, `aim.security`, and
`aim.overall` to decide which programs activate — so an honest tier in
the weakest perspective is more useful than a generous average.

## Done when

- Every perspective has a tier, a rubric match, and at least one
  verbatim evidence excerpt.
- The overall tier is set to the minimum across perspectives.
- The recommendations list names one concrete next action per
  bottom-two perspectives.
