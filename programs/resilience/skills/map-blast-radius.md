---
id: map-blast-radius
name: "Map Blast Radius"
description: "For each AI dependency, document failure mode, downstream impact, recovery procedure, and recovery objective (RTO/RPO)."
trigger:
  kind: command
  phrase: "/map-blast-radius"
outputs:
  - name: artifact
    path: artifacts/resilience/blast-radius-{timestamp}.md
    kind: document
---

## Objective

For each AI dependency in the customer's production environment, document the failure mode, downstream impact, recovery procedure, and recovery objective (RTO/RPO). The blast radius map is the foundation for all other resilience work.

## Procedure

1. **Inventory AI dependencies.** List every AI component the system depends on: model endpoints, knowledge bases, vector stores, guardrail services, embedding services, agent runtimes.

2. **For each dependency, document:**
   - What it does (one sentence)
   - What happens when it fails (immediate impact)
   - What downstream systems are affected (cascade)
   - How you detect the failure (monitoring signal)
   - How you recover (procedure)
   - Recovery time objective (RTO) and recovery point objective (RPO)

3. **Classify by blast radius size:**
   - **Contained** - failure affects only one feature, users can still use the rest of the system
   - **Partial** - failure degrades the primary user journey but system remains available
   - **Total** - failure renders the system unusable

4. **Identify isolation boundaries.** Where can you draw circuit breakers so a contained failure stays contained?

5. **Produce the artifact** using the blast radius template.

## Done when

- Every AI dependency has a row in the blast radius map.
- Each row has: failure mode, impact classification, detection method, recovery procedure, RTO/RPO.
- At least one isolation boundary is identified and documented.


## Integration with ai-native-app-builder

The blast radius map produced here is consumed by `ai-native-app-builder` during Construction:
- Circuit breaker thresholds from this map → implemented in `cross-resilience-operations.md` patterns
- Recovery procedures → inform the CDK stack design (DLQ config, retry policies, health checks)
- RTO/RPO targets → drive the backup/DR configuration in the infrastructure layer

When AI-DLC is active, this artifact feeds into `aidlc-docs/operations/resilience.md`.


## Handoff to Implementation

This skill produces the blast radius **map** (design artifact). Implementation happens in `ai-native-app-builder`:

- Circuit breakers → Python `CircuitBreaker` class per `cross-resilience-operations.md`
- Isolation boundaries → CDK VPC/subnet separation, Lambda reserved concurrency
- Detection mechanisms → CloudWatch alarms per `cross-observability-evaluation.md`

Sequence:
```
/map-blast-radius → documents failure modes and isolation points (this skill)
    ↓
/design-degradation → defines fallback behaviour for each failure
    ↓
/build-app → ai-native-app-builder implements circuit breakers, retry, fallback code
```
