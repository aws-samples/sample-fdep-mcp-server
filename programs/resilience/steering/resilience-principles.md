---
id: resilience-principles
description: "Core principles for building resilient AI systems in production"
inclusion: always
priority: 75
---

# AI Resilience Principles

> Reference: [AWS Well-Architected Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)

## Principles

- **Assume failure.** Every AI dependency will fail. The question is when, how you detect it, and what happens next.
- **Measure recovery, not uptime.** MTTR matters more than MTBF for AI systems because model behaviour is inherently probabilistic.
- **Degrade gracefully.** When the model is unavailable, slow, or wrong, the system should fall back to a safe state - not crash or hallucinate silently.
- **Blast radius is bounded.** A failure in one AI system must not cascade to unrelated systems. Dependency isolation is a first-class design concern.
- **Test failure paths.** If you haven't tested the failure path, it doesn't work. Chaos days exist to prove (or disprove) your recovery claims.

## AI-specific failure modes

| Failure Mode | Detection | Impact | Recovery |
|---|---|---|---|
| Silent regression | Golden-set evaluation, quality metrics drift | Wrong decisions made without alerting | Rollback to previous model version |
| Hallucination spike | Factuality checks, user feedback rate | User trust erosion, incorrect actions taken | Guardrail tightening, model downgrade |
| Latency degradation | p99 monitoring, timeout tracking | UX degradation, downstream timeouts | Circuit breaker, fallback response |
| Cost runaway | Daily spend anomaly detection | Budget exhaustion, surprise bills | Rate limiting, model tier downgrade |
| Prompt injection | Input pattern monitoring, guardrail hit rate | Security breach, data exfiltration | Input sanitization, session termination |
| Data drift | Distribution monitoring, embedding distance | Degraded relevance, increased errors | Reindexing, knowledge base refresh |

## Rules

1. Every production AI system must have a documented blast radius.
2. Every AI dependency must have a fallback behaviour defined.
3. Resilience claims must be tested (chaos day) at least quarterly.
4. Cost governance is a resilience concern - unbounded spend is a failure mode.
