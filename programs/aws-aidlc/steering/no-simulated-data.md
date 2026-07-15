---
id: no-simulated-data
description: "Rule preventing simulated data in code generation to ensure end-to-end flow integrity"
inclusion: always
priority: 95
---

# No Simulated Data in Implementation

## Context

This rule was created after a pattern failure observed across AI-DLC Construction phases: code generation produces unit-by-unit implementations that internally look correct but have broken cross-unit data flows because intermediate data is simulated rather than real.

**Common failure pattern**: Unit A's code says `// For PoC: simulate photo keys from filenames` while Unit B's code assumes those keys point to real S3 objects. Each unit passes its own review, but the end-to-end flow fails at deployment.

## Rule

When generating code for any unit marked as "Code Generation" in the AI-DLC workflow:

1. **Never use fake/simulated data** where the requirements specify real integration. If a Functional Requirement says "photo upload" â-" the code must actually upload to the data store, not generate fake keys or placeholder strings.

2. **Never skip API endpoints** that are needed for end-to-end flow. If Component A calls Component B for data, the endpoint in B must exist, accept the request, and return real data. A TODO comment is not an endpoint.

3. **Trace data flows before marking complete**. For every user story in scope, trace the full path: UI action â-' API call â-' service logic â-' data store write â-' data store read â-' response â-' UI render. Every hop must produce and consume real data.

4. **TODO/mock comments are failures**. A comment that says `// TODO: implement real upload` or `// For PoC: simulate` means the requirement is not met. Either implement it or escalate to the FDE that the requirement cannot be met within the time box â-" do not silently skip it.

5. **Cross-unit seam verification**. When completing a unit that produces data consumed by another unit (e.g., S3 keys, DynamoDB records, API responses), verify the consuming unit can actually read what this unit writes. Data format, key structure, and access permissions must all align.

## What "mock" means in this context

- **Acceptable mock**: The REQUIREMENT explicitly says to mock/stub something (e.g., "Mock/stub interface to existing PIR system"). The mock IS the implementation. The requirement is satisfied.
- **Unacceptable mock**: The REQUIREMENT says to implement real functionality (e.g., "photo upload", "compensation calculation", "email notification"). Generating fake data, placeholder values, or TODO comments is not an implementation â-" it's a gap that must be flagged.

## How to distinguish

Read the requirement's Detail column literally:
- "Multiple photos per claim (min 1, max 10)" = actual file upload to actual storage
- "Customer choice: AWS gift voucher OR Etihad Guest loyalty miles" = actual selection UI + actual persistence of choice
- "Mock/stub interface to existing Etihad PIR system" = a mock is the correct implementation

## Enforcement

- Applies to all Code Generation stages across all engagements
- Applies regardless of appLevel (PoC, MVP, Production) â-" the level determines WHAT to build, not WHETHER to actually build it
- If violated, the code must be fixed before the stage is marked complete
- If fixing exceeds the time box, escalate to the FDE with: what was specified, what was skipped, and why

## Pairs with

- aws-aidlc-rules/core-workflow.md (Construction phase gates)
- verify-e2e-flow hook (post-task data flow trace)
- requirements-traceability hook (FR cross-reference)

## Origin

Created: 2026-06-11  
Engagement: etihad-baggage  
Failure: Photo upload simulated (fake S3 keys generated client-side), breaking Assessment Service which needed real images in S3 to call Bedrock. Compensation amount was never calculated because assessment failed silently. Agent UI showed no images because presigned URLs pointed to non-existent keys.
