---
id: track-resilience-metrics
name: "Track Resilience Metrics"
description: "Define and instrument MTTR, false-positive alarm rate, chaos-day cadence, and blast-radius coverage metrics."
trigger:
  kind: command
  phrase: "/track-resilience"
outputs:
  - name: artifact
    path: artifacts/resilience/metrics-{timestamp}.md
    kind: document
---

## Objective

Define the metrics that prove the AI workload is resilient, instrument them, and establish review cadence. Metrics without measurement are aspirations, not resilience.

## Procedure

1. **Define the four core resilience metrics:**

   | Metric | Definition | Target |
   |--------|-----------|--------|
   | MTTR (Mean Time to Recovery) | Average time from failure detection to Level 0 restored | < 15 min for Sev 1, < 1 hour for Sev 2 |
   | False-positive alarm rate | % of alerts that don't require action | < 10% |
   | Chaos-day cadence | Frequency of resilience exercises | Quarterly minimum |
   | Blast-radius coverage | % of AI dependencies with documented blast radius | 100% for production systems |

2. **Instrument detection:**
   - CloudWatch alarms for model endpoint health, latency p99, error rate
   - Cost anomaly detection (AWS Cost Anomaly Detection or custom)
   - Golden-set evaluation (scheduled Lambda running test queries)
   - Guardrail hit-rate monitoring (Bedrock Guardrails metrics)

3. **Establish review cadence:**
   - Weekly: review open alarms, false-positive rate, cost trends
   - Monthly: MTTR trend, new dependencies added without blast-radius mapping
   - Quarterly: chaos day, full blast-radius map refresh

4. **Document the metrics dashboard:** Where do stakeholders look? CloudWatch dashboard URL, Grafana board, or equivalent.

## Done when

- All four core metrics are defined with targets.
- At least one detection mechanism is implemented (not just documented).
- Review cadence is agreed with named owner.
- Dashboard exists (even if minimal).
