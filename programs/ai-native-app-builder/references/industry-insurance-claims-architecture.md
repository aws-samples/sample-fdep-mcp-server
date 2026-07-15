# Claims Processing Architecture Patterns

This reference covers three architecture patterns for building claims processing systems on AWS, from simple agent-based to full enterprise omnichannel solutions.

## Pattern 1: Strands Agent on AgentCore (Simplest — No Repo Needed)

Best for: New projects, rapid prototyping, teams wanting minimal infrastructure.

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentCore Runtime                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Strands Claims Agent                      │   │
│  │                                                       │   │
│  │  Tools:                    Knowledge Base (RAG):       │   │
│  │  ├── create_claim          ├── Policy documents       │   │
│  │  ├── lookup_policy         ├── SOPs                   │   │
│  │  ├── get_claim_status      ├── FAQs                   │   │
│  │  ├── extract_document      └── Coverage guides        │   │
│  │  ├── assess_damage                                    │   │
│  │  ├── validate_claim        Memory (AgentCore):        │   │
│  │  ├── send_notification     ├── STM (conversation)     │   │
│  │  └── update_status         └── LTM (claim history)    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ DynamoDB │ │    S3    │ │   SNS    │
        │ (claims) │ │  (docs)  │ │ (notify) │
        └──────────┘ └──────────┘ └──────────┘
```

**Deploy:**
```bash
pip install bedrock-agentcore strands-agents
agentcore configure -e my_agent.py
agentcore deploy
```

**Pros:** Fastest to deploy, no Docker/repo needed, serverless, auto-scaling.
**Cons:** Single agent handles all logic, limited to Python, no built-in UI.

## Pattern 2: Bedrock Agent with Action Groups (Managed)

Best for: Teams wanting fully managed agents with console-based configuration.

Source: [Insurance Claim Lifecycle Automation](https://github.com/aws-samples/amazon-bedrock-samples/tree/main/agents-and-function-calling/bedrock-agents/use-case-examples/insurance-claim-lifecycle-automation)

```
┌─────────────────────────────────────────────────────────────┐
│                    Amazon Bedrock Agent                       │
│                                                              │
│  Model: Claude Sonnet                                        │
│  Instructions: "You are an insurance agent that..."          │
│                                                              │
│  Action Groups:                                              │
│  ├── create-claim                                            │
│  │   ├── OpenAPI Schema (S3)                                 │
│  │   └── Lambda: CreateClaimFunction                         │
│  ├── gather-evidence                                         │
│  │   ├── OpenAPI Schema (S3)                                 │
│  │   └── Lambda: GatherEvidenceFunction                      │
│  └── send-reminder                                           │
│      ├── OpenAPI Schema (S3)                                 │
│      └── Lambda: SendReminderFunction                        │
│                                                              │
│  Knowledge Base:                                             │
│  ├── Data Source: S3 (policy docs, FAQs, SOPs)               │
│  ├── Embeddings: Titan Text Embeddings                       │
│  └── Vector Store: OpenSearch Serverless                     │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Supporting Resources (CloudFormation)                        │
│  ├── DynamoDB: Claims table (synthetic data)                 │
│  ├── S3: API schemas + knowledge base assets                 │
│  ├── SNS: Policy holder notifications                        │
│  ├── Lambda: 3 action group functions                        │
│  └── IAM: Roles and permissions                              │
└─────────────────────────────────────────────────────────────┘
```

**Deploy:**
```bash
git clone https://github.com/aws-samples/amazon-bedrock-samples.git
cd agents-and-function-calling/bedrock-agents/use-case-examples/insurance-claim-lifecycle-automation/shell/
source ./create-customer-resources.sh
# Then create agent via Bedrock console
```

**Action Group API Schemas:**

Each action group needs an OpenAPI schema. Example for `create-claim`:

```json
{
  "openapi": "3.0.0",
  "info": { "title": "Create Claim API", "version": "1.0.0" },
  "paths": {
    "/claims": {
      "post": {
        "summary": "Create a new insurance claim",
        "operationId": "createClaim",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "policyId": { "type": "string", "description": "Policy ID of the claimant" },
                  "claimType": { "type": "string", "enum": ["auto", "health", "property"] },
                  "incidentDate": { "type": "string", "format": "date" },
                  "description": { "type": "string" }
                },
                "required": ["policyId", "claimType", "incidentDate", "description"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Claim created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "claimId": { "type": "string" },
                    "status": { "type": "string" },
                    "pendingDocuments": { "type": "array", "items": { "type": "string" } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Pros:** Fully managed, console UI for testing, built-in tracing, no infrastructure to manage.
**Cons:** Less flexible than custom agents, limited to supported models, action groups require Lambda.

## Pattern 3: Omnichannel Claims Pipeline (Enterprise)

Best for: Large insurers needing multi-channel intake, complex workflows, third-party integrations.

Source: [Guidance for Omnichannel Claims Processing](https://github.com/aws-solutions-library-samples/guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FNOL Channels                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │  Chat   │  │   SMS   │  │  Voice  │  │  Email  │  │ Web Form│  │
│  │(Connect)│  │(Connect)│  │(Connect)│  │         │  │ (React) │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  │
└───────┼─────────────┼───────────┼─────────────┼─────────────┼───────┘
        │             │           │             │             │
        └─────────────┴─────┬─────┴─────────────┴─────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Processing Pipeline                                │
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ DynamoDB │◄───│   Lambda     │◄───│  S3 Upload   │               │
│  │ (claims) │    │ (extraction) │    │  (documents) │               │
│  └────┬─────┘    └──────┬───────┘    └──────────────┘               │
│       │                  │                                           │
│       │                  ▼                                           │
│       │          ┌──────────────┐                                    │
│       │          │   Textract   │  ← Document extraction             │
│       │          │   + Bedrock  │  ← Image analysis (Nova Pro)       │
│       │          └──────┬───────┘                                    │
│       │                  │                                           │
│       │                  ▼                                           │
│       │          ┌──────────────┐                                    │
│       │          │   Lambda     │  ← Validation + business rules     │
│       │          │ (validation) │                                    │
│       │          └──────┬───────┘                                    │
│       │                  │                                           │
│       ▼                  ▼                                           │
│  ┌──────────┐    ┌──────────────┐                                    │
│  │ Bedrock  │    │  EventBridge │  ← Event routing                   │
│  │    KB    │    └──────┬───────┘                                    │
│  │  (RAG)   │           │                                           │
│  └──────────┘           ▼                                           │
│                  ┌──────────────┐    ┌──────────────┐               │
│                  │     SQS      │───►│   Lambda     │               │
│                  │              │    │ (notify/3rd) │               │
│                  └──────────────┘    └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │  3rd Party APIs   │
                                    │  (Guidewire,      │
                                    │   Socotra, Stripe) │
                                    └──────────────────┘
```

**Key Components:**
- **Amazon Connect**: Chat, SMS, voice channels with Amazon Lex chatbot
- **React Web App**: CloudFront-hosted claims portal with Cognito auth
- **Amazon Textract**: Document data extraction (driver's license, receipts)
- **Amazon Bedrock (Nova Pro)**: Vehicle damage image analysis
- **Bedrock Knowledge Base**: RAG for adjuster assistance
- **EventBridge + SQS**: Event-driven processing pipeline
- **DynamoDB**: Claims state management
- **Third-party integrations**: Guidewire, Socotra, Stripe

**Deploy:**
```bash
git clone https://github.com/aws-solutions-library-samples/guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws.git
cd guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws
sh deploy.sh us-east-1
```

**Pros:** Full enterprise solution, multi-channel, third-party integrations, production-ready patterns.
**Cons:** Complex setup (Connect, Lex, CDK), requires SMS registration, higher cost.

## Pattern 4: Benefits Claims with Bedrock Data Automation (BDA)

Best for: Document-heavy claims (medical receipts, checks) with custom extraction blueprints.

Source: [Benefits Claims Processing with BDA](https://github.com/aws-samples/sample-accelerate-benefits-claims-processing-with-amazon-bedrock-data-automation)

```
S3 (ingestion) → Lambda (BDA extraction) → Lambda (validation) → Lambda (integration)
                       │                          │                       │
                       ▼                          ▼                       ▼
              Custom Blueprints           Business Rules            DynamoDB
              (check, receipt)            (SOPs via KB)            (state mgmt)
```

**Key Feature:** Custom BDA blueprints for document classification and extraction. Automatically classifies documents (bank check vs. medical receipt) and extracts relevant fields.

**Deploy:**
```bash
cd infrastructure
sam build
sam deploy --guided --capabilities CAPABILITY_NAMED_IAM
```

## Choosing a Pattern

| Factor | Pattern 1 (Strands) | Pattern 2 (Bedrock Agent) | Pattern 3 (Omnichannel) | Pattern 4 (BDA) |
|---|---|---|---|---|
| Setup time | Minutes | Hours | Days | Hours |
| Infrastructure | None (serverless) | Minimal (Lambda) | Complex (Connect, CDK) | Moderate (SAM) |
| Channels | API only | API + console | Chat, SMS, voice, web | API + Streamlit |
| Customization | Full code control | Action groups | Full stack | Document-focused |
| Best for | Prototypes, new builds | Managed agents | Enterprise production | Document processing |
| Repo needed | No | No (console) or Yes (CFN) | Yes (CDK) | Yes (SAM) |

## Combining Patterns

For a production claims system, you might combine:

1. **Pattern 1** for the core agent logic (Strands on AgentCore)
2. **Pattern 3's channels** for omnichannel intake (Connect for chat/SMS/voice)
3. **Pattern 4's BDA** for document extraction (custom blueprints)
4. **Pattern 2's Knowledge Base** for RAG-powered adjuster assistance

The agent on AgentCore Runtime can call into the same DynamoDB tables, S3 buckets, and notification services that the omnichannel pipeline uses.
