---
id: pci-dss-steering
description: "PCI DSS compliance considerations for AI systems handling cardholder data"
inclusion: auto
match: "artifacts/rai-reviews/**"
priority: 80
---

# PCI DSS Considerations for AI Systems

This steering applies when the financial institution handles cardholder
data (CHD) or sensitive authentication data (SAD) anywhere the AI system
can read, store, or influence. Assume PCI DSS v4.0 is the target standard
unless the customer explicitly declares otherwise.

## Scope questions to resolve before design

1. Does any prompt, tool call, retrieval source, or fine-tuning corpus
   contain cardholder data (PAN, cardholder name paired with PAN, service
   code, expiration date) or sensitive authentication data (full track,
   CAV/CVC/CVV, PIN)? If yes, the component is **in scope**.
2. Can the model or an agent tool cause cardholder data to be written to
   a log, cache, vector store, trace, or observability pipeline? If yes,
   those sinks are in scope.
3. Does the AI system authenticate users, authorize transactions, or
   influence fraud decisions? If yes, treat it as a cardholder data
   environment (CDE) adjunct and apply the same controls.

## Control expectations

- **Data minimization**: Strip, truncate, or tokenize PAN before any
  prompt reaches a third-party model endpoint. Prefer tokenization at the
  integration edge over redaction in application code.
- **Key management (Requirement 3)**: Any encryption keys that protect
  cardholder data touched by the AI system must live in the institution's
  existing PCI-scoped KMS, not in an AI-specific vault.
- **Audit trail (Requirement 10)**: Every agent tool invocation that
  reads or writes cardholder data must emit an audit event containing
  actor, time, action, affected identifier hash, and correlation id.
- **Access control (Requirement 7)**: Model and tool access must follow
  least-privilege and role-based access. Agent identities are subject to
  the same access review cadence as human identities.
- **Change management (Requirement 6)**: Model version changes, prompt
  changes, and retrieval corpus changes that affect in-scope behavior
  are treated as in-scope change events and follow the institution's
  existing change approval flow.
- **Segmentation (Requirement 1)**: Where feasible, isolate the AI
  inference path from the CDE via an enforced egress filter that
  strips cardholder data before it leaves the CDE.

## Artifacts to produce

- A data flow diagram showing where cardholder data may enter or leave
  the AI system, with scope boundaries annotated.
- A mapping from each PCI DSS requirement that applies to the system's
  existing controls, with gaps explicitly called out.
- A redaction or tokenization test suite with representative positive
  and negative fixtures.

## Anti-patterns to refuse

- Sending raw PAN or full track data to any external model endpoint,
  even for a proof of concept.
- Storing cardholder data in an AI-specific vector store, cache, or
  fine-tuning dataset without the same controls as the CDE.
- Using shared system accounts for agent-to-service authentication.
- Relying on model output redaction as a primary control. Redaction
  must happen before the model sees the data.

## Done when

- Scope of the AI system relative to the CDE is documented and signed
  off by the institution's QSA or internal compliance function.
- Every in-scope control is either implemented and evidenced, or
  tracked as a gap with an owner and target date.
- The data flow diagram, control mapping, and test suite are committed
  to the engagement artifacts.
