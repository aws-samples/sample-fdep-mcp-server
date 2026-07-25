---
id: design-graceful-degradation
name: "Design Graceful Degradation"
description: "Define what the system does when the model is unavailable, slow, returns garbage, or returns offensive content."
trigger:
  kind: command
  phrase: "/design-degradation"
outputs:
  - name: artifact
    path: artifacts/resilience/graceful-degradation-{timestamp}.md
    kind: document
---

## Objective

Define what the system does when each AI dependency fails. The system must never crash silently, hallucinate without detection, or leave the user without feedback. Every failure mode gets a defined fallback behaviour.

## Procedure

1. **For each failure mode in the blast radius map, define the fallback:**

   | Failure | Fallback pattern |
   |---------|-----------------|
   | Model unavailable | Return cached response, show "AI temporarily unavailable", or route to human |
   | Model slow (latency > SLA) | Circuit breaker opens, serve degraded response, alert ops |
   | Model returns garbage | Confidence check fails, discard response, serve fallback |
   | Model returns harmful content | Guardrail catches it, log for review, serve safe fallback |
   | Knowledge base stale | Flag response as "may be outdated", surface refresh date |
   | Cost cap exceeded | Queue requests, serve cached responses, notify admin |

2. **Define the degradation hierarchy:**
   - Level 0: Full functionality (model healthy, all features active)
   - Level 1: Reduced quality (model slow, using cached/simplified responses)
   - Level 2: Core-only (model unavailable, only non-AI features work)
   - Level 3: Maintenance mode (system acknowledges the issue, no functionality)

3. **Implement circuit breakers.** Define the thresholds:
   - Open threshold (e.g., 5 failures in 30 seconds)
   - Half-open check interval (e.g., try one request every 60 seconds)
   - Close threshold (e.g., 3 consecutive successes)

4. **Document user communication.** What does the user see at each degradation level? No silent failures.

## Done when

- Every failure mode has a defined fallback behaviour.
- The degradation hierarchy is documented (levels 0-3).
- Circuit breaker thresholds are defined.
- User-facing messaging is documented for each degradation level.


## Integration with ai-native-app-builder

The degradation policy produced here drives implementation in `ai-native-app-builder`:
- Fallback patterns → implemented as circuit breakers in `cross-resilience-operations.md` (Python CircuitBreaker class)
- Degradation levels → mapped to CloudWatch alarm severity levels
- Circuit breaker thresholds → configured in the Lambda/agent code during `/build-app`
- User messaging → implemented in the frontend (Layer 5a) during UI build

Handoff: once this policy is approved, run `/build-app` — the builder reads `cross-resilience-operations.md` for implementation patterns.


## Handoff to Implementation

This skill produces the degradation **policy** (design artifact). Implementation happens in `ai-native-app-builder`:

- Circuit breaker thresholds → `CircuitBreaker` class in agent tools
- Fallback responses → cached response logic in Lambda handlers
- Degradation level switching → feature flags or DynamoDB state
- User messaging → UI component states per `cross-resilience-operations.md`

The `ai-native-app-builder` reference file `cross-resilience-operations.md` contains working code for all patterns defined in this policy.
