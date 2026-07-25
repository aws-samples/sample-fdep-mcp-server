---
id: ai-failure-modes
description: "Common AI failure modes and their detection and mitigation patterns"
inclusion: always
priority: 74
---

# Common AI Failure Modes

This file catalogues the failure modes specific to AI systems that traditional reliability engineering does not cover. Use this when mapping blast radius or designing graceful degradation.

## Model-layer failures

- **Silent quality regression** - model output degrades without throwing errors. Only detectable via evaluation metrics or user feedback.
- **Hallucination** - model generates plausible but factually wrong output. Requires factuality checking or retrieval-grounded verification.
- **Context window overflow** - input exceeds model limits, causing truncation or refusal. Requires input size monitoring and chunking strategies.
- **Model version incompatibility** - new model version changes output format or behaviour. Requires regression testing on version upgrades.

## Data-layer failures

- **Knowledge base staleness** - indexed documents are outdated, leading to wrong answers. Requires freshness monitoring and re-indexing schedules.
- **Embedding drift** - semantic similarity scores shift as corpus grows. Requires periodic re-embedding and threshold calibration.
- **Data poisoning** - adversarial or incorrect data enters the knowledge base. Requires ingestion validation and provenance tracking.

## Infrastructure-layer failures

- **Inference endpoint unavailability** - model service returns 5xx or times out. Requires health checks, circuit breakers, and failover.
- **Token rate limiting** - exceeding provider quotas causes request rejection. Requires rate limiting, queuing, and burst capacity planning.
- **Cold start latency** - provisioned concurrency exhausted, first request takes 10-30s. Requires warm pool management or async patterns.

## Guardrail-layer failures

- **Guardrail bypass** - adversarial input circumvents safety filters. Requires layered defense and continuous red-teaming.
- **Over-filtering** - guardrails block legitimate requests, degrading functionality. Requires false-positive monitoring and threshold tuning.
