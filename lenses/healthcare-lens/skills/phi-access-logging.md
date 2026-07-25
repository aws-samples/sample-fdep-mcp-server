---
id: phi-access-logging
name: PHI Access Logging
description: Stand up an access log for AI system interactions that touch protected health information so that privacy, security, and compliance reviewers have a single source of truth aligned to the customer's existing audit posture.
trigger:
  kind: command
  phrase: "/phi-access-logging"
---

# PHI Access Logging

## Purpose

Establish an append-only access log covering every AI system interaction that reads, derives, or emits protected health information (PHI), aligned to the customer's existing HIPAA security controls and audit posture.

## Inputs

- The PHI boundary the customer's privacy function has drawn, including identifiers and quasi-identifiers.
- The customer's preferred audit destination (SIEM, warehouse, or lakehouse) and the retention schedule required by their records-management program.
- The minimum-necessary ruleset the customer applies to AI-accessible PHI.

## Outputs

- A log schema capturing caller identity, purpose-of-use, PHI fields accessed, decision outcome, control version, and timestamp — without duplicating PHI payloads into the log itself.
- A configured writer that appends to the customer's chosen destination with integrity controls.
- A runbook describing retrieval, legal hold, break-glass procedures, and redaction aligned to the customer's existing processes.

## Checklist

1. Confirm the retention schedule and legal-hold workflow with the customer's records and privacy functions before any code lands.
2. Establish an integrity scheme (hash or signature chain) that makes the trail tamper-evident without persisting sensitive content twice.
3. Emit a round-trip test proving a captured access event can be retrieved end-to-end from the customer's audit destination.
4. Document the detection and escalation path for anomalous or break-glass access, aligning with the customer's security operations intake.
5. Review with the customer's privacy function that log contents respect the minimum-necessary principle and do not themselves constitute a new PHI store.
