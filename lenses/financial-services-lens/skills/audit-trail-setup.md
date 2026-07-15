---
id: audit-trail-setup
name: Audit Trail Setup for Regulated AI Systems
description: Stand up an end-to-end audit trail for an AI system operating in a regulated financial-services environment, covering agent actions, tool calls, model inputs and outputs, and human overrides.
trigger:
  kind: command
  phrase: "/audit-trail-setup"
outputs:
  - name: audit-trail-spec
    path: artifacts/ops/audit-trail-spec.md
    kind: document
  - name: audit-event-schema
    path: artifacts/ops/audit-event.schema.json
    kind: schema
---

## Objective

Produce a portable, auditable trail of every consequential action an AI
system takes in a regulated environment. The trail must support
regulator, internal audit, and MRM requests without requiring a rebuild
of the system. The target standards are SR 11-7 model risk governance,
SOX ICFR evidence, and PCI DSS Requirement 10 where cardholder data is
in scope.

## When to use

Run this skill when any of the following is true for the AI system:

- It influences a SOX-relevant process or a prudential risk decision.
- It reads, writes, or can cause the logging of cardholder data,
  personally identifiable information, or other regulated data classes.
- The financial institution's operational risk or compliance function
  requires reconstructable evidence of system actions.

## Procedure

1. **Inventory the actors and actions.** List every actor that can cause
   the system to take an action: end users, agent identities, service
   accounts, scheduled jobs, upstream systems. For each, list the
   actions they can trigger. Group actions by materiality tier
   (informational, advisory, decisioning, autonomous-execution).
2. **Define the minimum event envelope.** Every audit event must carry
   `eventId`, `occurredAt` (ISO-8601 UTC), `actor` (type + stable id),
   `action`, `resource`, `correlationId`, `causationId`, `outcome`
   (success or failure with reason), and a cryptographic `integrity`
   field (HMAC or signature) that binds the event to its source.
3. **Capture model inputs and outputs carefully.** Log a stable hash of
   the prompt and the response, plus the model version and any
   retrieval document ids. Do not log raw sensitive content; instead,
   store it in a separately controlled vault and log the vault pointer
   with access-controlled dereference.
4. **Capture agent tool calls.** Every tool invocation emits an event
   with the tool id, the argument hash, the return hash, and the
   correlation id linking it to the triggering user action. Include the
   agent identity and the authorization decision.
5. **Capture human overrides and escalations.** When a human approves,
   rejects, or modifies an AI recommendation, emit an override event
   that links to the original recommendation by `causationId`.
6. **Write to an append-only sink.** The primary sink must be
   append-only with integrity verification (e.g. WORM object storage
   with object lock, a verifiable ledger, or an equivalent control).
   A secondary hot-path sink can feed analytics but cannot be the
   system of record.
7. **Define retention.** Align retention with the institution's records
   retention policy for the relevant data class. Do not set AI-specific
   shorter retention without a documented exception.
8. **Define access and break-glass.** Read access to audit data is
   separated from write access. Break-glass access is logged in the
   same trail and reviewed on a defined cadence.
9. **Prove it works.** Produce a reconstruction test: given a user
   action id, the team must reconstruct the full chain of model calls,
   tool calls, retrieval documents, and human overrides that produced
   the outcome, within a defined time budget.
10. **Document the spec and schema.** Commit
    `artifacts/ops/audit-trail-spec.md` (narrative + diagrams) and
    `artifacts/ops/audit-event.schema.json` (machine-readable schema)
    to the engagement.

## Guardrails

- Do not log raw cardholder data, credentials, secrets, or full
  personal identifiers. Use hashes, tokens, or vault pointers.
- Do not design a new retention policy. Reuse the institution's.
- Do not use shared service accounts for agent identity. Each agent
  and each tool needs a distinct, attributable identity.
- Do not skip the reconstruction test. An untested trail is an
  unverified trail.

## Done when

- The audit trail spec and event schema exist under `artifacts/ops/`.
- The institution's compliance, operational risk, or internal audit
  function has reviewed the spec.
- A reconstruction test has been executed against a representative
  user action and the result is recorded.
- Retention, access, and break-glass policies are aligned with the
  institution's existing standards and referenced from the spec.
