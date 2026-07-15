---
id: layer-methodology
description: "FDE layer methodology for always-on architectural guidance"
inclusion: auto
match: "artifacts/ai-native-app-builder/**"
priority: 90
---

# FDE Layer Methodology — Always-On Guidance

When building any AI-native application on AWS, follow these principles:

## Spec First, Code Second

Never write application code before a Kiro Spec exists. The spec must contain:
- One requirement per active FDE layer
- A design section with architecture diagram, data model, and API contract
- Tasks ordered by the 5-phase build order (Foundation → Data → Intelligence → Experience → Production)

## Layer Independence

Each layer is independently deployable and testable. A layer should:
- Have its own CDK construct or nested stack
- Be testable in isolation with mocked dependencies
- Have clear input/output contracts with adjacent layers

## Accelerator-First Development

Before writing custom code for any capability, check:
1. Is there an FDE Accelerator that covers this? (42 available)
2. Is there an Agentic Catalog sample? (117 available)
3. Is there a CDK construct or solution pattern?

Only write custom code when no accelerator exists or the accelerator doesn't fit the use case.

## The Three True Gaps

These capabilities have no existing accelerator and require custom implementation:
1. **Data Catalog & Lineage** (L3) — Build Glue Catalog CDK template + lineage via resource tags
2. **Golden Knowledge Graph Bootstrap** (L3) — Entity extraction → Neptune/OpenSearch graph seeding
3. **Production Cost Projection Calculator** (Obs) — Token usage extrapolation for PoC → production

Plan custom work for these explicitly in the spec.

## PoC vs Production Scope

For a 2-3 week PoC, defer:
- Full governance (use basic guardrails only)
- Full resilience (use basic error handling only)
- L1 enterprise integrations (mock external systems)
- L3 ontology (use simple embeddings)
- Multi-environment setup (single dev environment)

For production, all cross-cutting layers are mandatory.

## Agent Design Defaults

Unless the customer specifies otherwise:
- **Framework**: Strands Agents SDK (best AgentCore integration)
- **Model**: Claude Sonnet (balance of quality and cost)
- **Deployment**: AgentCore Runtime via direct_code_deploy
- **Memory**: AgentCore STM for session context
- **Guardrails**: Bedrock Guardrails with content filters + PII detection

## Frontend Defaults

Unless the customer specifies otherwise:
- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Amplify Authenticator (Cognito)
- **State**: React Query for server state
- **Routing**: React Router v6

## Infrastructure Defaults

Unless the customer specifies otherwise:
- **IaC**: AWS CDK (Python for agent-heavy, TypeScript for frontend-heavy)
- **Compute**: Lambda (API handlers) + AgentCore Runtime (agents)
- **Database**: DynamoDB (single-table design for most apps)
- **Storage**: S3 with lifecycle policies
- **API**: API Gateway REST or HTTP API
- **Auth**: Cognito User Pool + Identity Pool

