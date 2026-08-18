---
id: build-aws-app
name: Build an AWS AI-Native Application
description: Guides the full lifecycle of building an AI-native application on AWS using the AI Native multi-layer architecture — from spec through deployment. Routes app type to correct layers, accelerators, and CDK patterns.
trigger:
  kind: command
  phrase: "/build-app"
inputs:
  - name: appType
    type: string
    required: true
    prompt: "What type of application? (claims-processing, enterprise-chatbot, document-pipeline, multi-agent, rag-assistant, contact-center, data-analytics, industry-vertical)"
outputs:
  - name: spec
    path: artifacts/ai-native-app-builder/spec-{timestamp}.md
    kind: document
  - name: architecture
    path: artifacts/ai-native-app-builder/architecture-{timestamp}.md
    kind: diagram
---

## Objective

Build a production-ready AI-native application on AWS by routing the app type through the AI Native multi-layer architecture, activating only the layers needed, and following the phased build order.

## FDE Architecture — 15 Layers

### Core 8 Layers

| Layer | Name | Purpose |
|-------|------|---------|
| L1 | Enterprise System Integrations | Connect to SoR, SoK, SoA (Salesforce, SAP, Slack, Jira) |
| L2 | Enterprise Resources | Knowledge Bases, APIs, Data stores, Document Processing |
| L3 | AI & Data Ontology | Semantic data, catalogs, knowledge graphs, data quality |
| L4 | AI Workflow | API Gateway, Step Functions, prompt chaining, decision tables |
| L5a | AI App Creation | Web/Mobile apps, UI components, app blueprints |
| L5b | AI Model Management | Model selection, prompts, RAG tuning, fine-tuning, benchmarking |
| L6 | AI Agents | Agent builder, multi-agent, RAG, chatbot, voice, guardrails |
| L7 | Developer Experience | Specs, build/test, CI/CD, deploy, monitor (Kiro) |

### Cross-Cutting Layers (span all 8)

| Layer | Name | Purpose |
|-------|------|---------|
| Spec | Spec-Driven Methodology | Requirements → Design → Tasks BEFORE code |
| Infra | Cloud Platform & Foundation | IaC, VPC, containers, auth & identity |
| Gov | AI Governance & Security | Guardrails, PII, HITL, RBAC, audit, model eval |
| Obs | Observability & Evaluation | Agent monitoring, eval, analytics, cost governance |
| Res | Resilience & Operations | Error handling, retry, backup/DR, scaling, secrets |
| Test | Testing & Quality | Unit tests, integration tests, agent evals, seed data |
| Env | Environment & Configuration | Multi-env (dev/staging/prod), feature flags, local dev |

## Decision Matrix — Which Layers Does Your App Need?

| Application Type | Infra | L1 | L2 | L3 | L4 | L5a | L5b | L6 | L7 | Gov | Obs | Res | Test | Env |
|-----------------|-------|----|----|----|----|-----|-----|----|----|-----|-----|-----|------|-----|
| Claims Processing | ✅ | ⬜ | ✅ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enterprise Chatbot | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Document Pipeline | ✅ | ⬜ | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-Agent Orchestration | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| RAG Knowledge Assistant | ✅ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contact Center Agent | ✅ | ✅ | ✅ | ⬜ | ✅ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Data Analytics + GenAI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Industry Vertical App | ✅ | ✅ | ✅ | ⬜ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ = Required, ⬜ = Optional/Later

## Build Order (Dependencies)

```
Phase 0: Methodology (ALWAYS FIRST)
  Spec-Driven → Create Kiro Spec: Requirements → Design → Tasks
                Do NOT write code until spec is reviewed.

Phase 1: Foundation
  Infrastructure → CDK project, Cognito, VPC (if needed)
  Environment   → Multi-env strategy, SSM parameters, local dev setup

Phase 2: Data & Resources
  L2 Enterprise Resources → DynamoDB/Aurora, S3, Knowledge Bases, Textract/BDA
  L3 AI Data Ontology → Embeddings, vector stores, data quality (if needed)
  Testing → Seed data, test fixtures, mocking setup

Phase 3: Intelligence
  L5b AI Model Management → Model selection, prompt management, RAG tuning
  L6 AI Agents → Agent definition, tools, system prompt, guardrails
  L4 AI Workflow → Step Functions orchestration, API Gateway, prompt chains
  Resilience → Error handling, retries, DLQs, circuit breakers

Phase 4: Experience
  L5a AI App Creation → React/Amplify UI, Authenticator, connected components
  L1 Enterprise Integrations → MCP servers, EventBridge, external connectors

Phase 5: Production Readiness
  Testing → Agent evaluation suite, integration tests, quality gates
  Governance → Guardrails, PII filters, HITL, audit trails
  Observability → CloudWatch GenAI, AgentCore Observability, evaluations
  Resilience → Backup/DR, scaling, provisioned concurrency
  L7 Developer Experience → Kiro specs, hooks, CI/CD pipeline, deployment
```

## Procedure

### MANDATORY PREREQUISITE — Load References Before Code Generation

**DO NOT generate any application code until you have completed these steps:**

1. Call `fde_get_engagement_context` to load the current engagement state, active programs, and intentionId.
2. Read the layer references relevant to your app type. For each ✅ layer in the decision matrix above, read the corresponding reference file from this skill's references folder:
   - Kiro: `.kiro/skills/ai-native-app-builder-build-aws-app/references/<filename>`
   - Claude: `.claude/references/ai-native-app-builder/<filename>`
   - Use `fde_get_skill` with `file` parameter to read via MCP if needed.
3. **Cite which references you read** before proceeding. State: "I have read: [list of reference filenames]."
4. Use ONLY patterns from the references. Do NOT generate AWS SDK calls, CDK constructs, or agent code from memory — the references contain version-verified, tested patterns.

**If you skip these steps, the generated code will use outdated patterns and fail at deployment.**

---

### Phase 0 — Spec (no code yet)

1. **Identify the app type** from the decision matrix. If the customer's use case doesn't map cleanly, pick the closest match and note deviations.

2. **Identify the appLevel** (PoC / MVP / Production) from `state/current.yaml`. If unset, default to **PoC** for a new workload, **MVP** when graduating from a delivered PoC, **Production** when the workload has already shipped. The full level definitions, per-level decision matrix, tagged-criteria convention, and graduation criteria are in the auto-loaded `app-level` steering file. Read it before continuing.

3. **Create the Kiro Spec**:
   - One requirement per active FDE layer
   - Design section with architecture diagram (mermaid), data model, API contract
   - Tasks ordered by build phases above
   - Acceptance criteria are tagged `[PoC]`, `[MVP]`, `[Production]` per the `app-level` steering — write all levels once, render only the current level
   - Get customer sign-off before writing code

### Phase 1 — Foundation

4. **Execute Phase 1 — Foundation**:
   - Scaffold CDK project (Python or TypeScript)
   - Configure Cognito user pool + identity pool
   - Set up SSM parameters for environment config
   - Create S3 buckets, DynamoDB tables per data model

5. **Execute Phase 2 — Data & Resources**:
   - Implement data layer (DynamoDB tables, GSIs, S3 buckets)
   - Configure document processing (Textract, BDA) if needed
   - Set up Knowledge Bases if RAG is required
   - Create seed data scripts for development

6. **Execute Phase 3 — Intelligence**:
   - Select model (Claude Sonnet for most, Haiku for cost-sensitive)
   - Implement agent with Strands SDK: system prompt, tools, guardrails
   - Wire API Gateway → Lambda → Agent
   - Add Step Functions if multi-step orchestration needed

7. **Execute Phase 4 — Experience**:
   - Build React frontend with Vite + Tailwind
   - Add Amplify Authenticator for auth
   - Implement chat interface, dashboard, detail views
   - Connect to API via typed client

8. **Execute Phase 5 — Production Readiness**:
   - Add Bedrock Guardrails (content filters, PII, topic denial)
   - Enable CloudWatch metrics and alarms
   - Write integration tests and agent evaluation suite
   - Configure CI/CD pipeline
   - Deploy with `agentcore deploy` or CDK

## PoC Scope (2-3 weeks)

| Week | Focus | Layers Active |
|------|-------|--------------|
| 1 | Foundation + Data | Infra, L2, Env, L7 (Kiro) |
| 2 | Agent + API | L5b, L6, L4, Res (basic) |
| 3 | UI + Validate | L5a, Obs (minimal), Test (manual eval) |

Defer for production: Full Governance, full Resilience, L1 integrations, L3 ontology.

## Done when

- Kiro spec exists with all active layers mapped to requirements
- CDK stack deploys without errors
- Agent responds correctly to the primary use case
- Frontend is accessible and authenticated
- At least one end-to-end test passes
- Customer has seen a demo

## Reference Material

When this skill renders into an engagement, the toolkit also renders 26 reference
files alongside it — 18 layer guides covering the AI Native multi-layer architecture, plus
deep-dive content for the Insurance vertical (4) and AgentCore deployment (4).
Read the relevant ones for each ✅ layer in the decision matrix.

For Kiro engagements, references are inside this skill's own folder:
`<engagement-root>/.kiro/skills/ai-native-app-builder-build-aws-app/references/`

For Claude engagements:
`<engagement-root>/.claude/references/ai-native-app-builder/`

### multi-layer architecture (always read in order)

1. `cross-spec-driven-methodology.md` — read FIRST, before any code
2. `layer-0-infrastructure.md`
3. `layer-1-enterprise-integrations.md`
4. `layer-2-enterprise-resources.md`
5. `layer-3-ai-data-ontology.md`
6. `layer-4-ai-workflow.md`
7. `layer-5-ai-model-management.md`
8. `layer-6-ai-app-creation.md` — architecture and approach selection
9. `layer-6-ui-implementation.md` — implementation-ready React/Chat/Dashboard/Upload code
10. `layer-7-ai-agents.md` — links to the AgentCore deployment deep-dive
11. `layer-8-developer-experience.md`
12. `cross-governance-security.md`
13. `cross-observability-evaluation.md`
14. `cross-industry-verticals.md` — links to the Insurance claims deep-dive
15. `cross-resilience-operations.md`
16. `cross-testing-quality.md`
17. `cross-environment-config.md`
18. `cross-deployment-guide.md`

### Insurance claims deep-dive (read when `appType=claims-processing`)

- `industry-insurance-claims-overview.md` — capability map, agent tool design, system prompt, gotchas
- `industry-insurance-claims-architecture.md` — four architecture patterns with selection matrix
- `industry-insurance-claims-strands.md` — full Strands agent implementation ready to deploy
- `industry-insurance-claims-samples.md` — 7 AWS sample repos and 3 blog posts

### AgentCore deployment deep-dive (read in Phase 5: Production Readiness)

- `deployment-agentcore-overview.md` — decision guide (CLI vs Starter Toolkit), deployment modes, 10 gotchas, troubleshooting
- `deployment-agentcore-cli.md` — `agentcore create / dev / deploy / invoke` workflow
- `deployment-agentcore-services.md` — Runtime, Memory, Gateway, Code Interpreter, Browser, Observability, Evaluation, Identity, Policy
- `deployment-agentcore-starter-toolkit.md` — Python toolkit + IaC generation (CDK/Terraform)



