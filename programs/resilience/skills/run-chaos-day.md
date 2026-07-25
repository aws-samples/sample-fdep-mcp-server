---
id: run-chaos-day
name: "Run a Chaos Day"
description: "Inject controlled failures into a non-production replica of the AI workload. Measure detection, response, and recovery."
trigger:
  kind: command
  phrase: "/run-chaos-day"
outputs:
  - name: artifact
    path: artifacts/resilience/chaos-day-{timestamp}.md
    kind: document
---

## Objective

Inject controlled failures into a non-production replica of the AI workload to validate that detection, response, and recovery work as documented. A chaos day proves (or disproves) the claims in the blast radius map and graceful degradation policy.

## Procedure

1. **Pre-requisites check:**
   - Blast radius map exists
   - Graceful degradation policy exists
   - Non-production environment available that mirrors production topology
   - On-call team is aware and standing by
   - Rollback plan is documented (how to stop the exercise instantly)

2. **Select failure scenarios (pick 3-5 per session):**
   - Kill the model endpoint (simulate 503)
   - Add 10x latency to inference calls
   - Return random/garbage responses from the model
   - Exhaust the token rate limit
   - Corrupt a knowledge base document
   - Disable guardrails and send adversarial input

3. **For each scenario, measure:**
   - Time to detect (from injection to alert firing)
   - Time to respond (from alert to human acknowledging)
   - Time to recover (from acknowledgment to system back to Level 0)
   - User impact (what did users experience during the failure?)
   - Did the fallback work as documented?

4. **Document findings:**
   - What worked as expected
   - What didn't work (gaps in detection, recovery, or documentation)
   - Action items with owners and deadlines

5. **Post-chaos review (within 48 hours):**
   - Update the blast radius map with observed (not assumed) recovery times
   - Update graceful degradation policy if fallbacks didn't trigger
   - Schedule fixes for gaps found

## Done when

- At least 3 failure scenarios were exercised.
- Detection, response, and recovery times are measured (not assumed).
- Gaps are documented with action items and owners.
- Blast radius map is updated with actual measured values.


## Integration with ai-native-app-builder

Chaos day results update the blast radius map with **measured** (not assumed) values. These measured values then feed back into `ai-native-app-builder`:
- Measured MTTR → validates or adjusts timeout/retry configuration
- Gaps found → generate implementation tasks for the next build sprint
- Fallback failures → trigger updates to the graceful degradation code

For AI-DLC engagements, chaos day results are documented in `aidlc-docs/operations/resilience.md` and feed into the production-readiness checklist.
