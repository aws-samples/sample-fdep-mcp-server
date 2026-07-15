# AWS Samples & References for Claims Processing

This reference catalogs official AWS samples, blog posts, and guidance packages relevant to building claims processing agents.

## GitHub Repositories

### 1. Insurance Claim Lifecycle Automation (Bedrock Agents)

**Repo:** [aws-samples/amazon-bedrock-samples/.../insurance-claim-lifecycle-automation](https://github.com/aws-samples/amazon-bedrock-samples/tree/main/agents-and-function-calling/bedrock-agents/use-case-examples/insurance-claim-lifecycle-automation)

**What it demonstrates:**
- Bedrock Agent with 3 action groups (create-claim, gather-evidence, send-reminder)
- Knowledge Base with RAG for policy documents and FAQs
- DynamoDB for claims data storage
- SNS for policy holder notifications
- Streamlit web UI for testing
- CloudFormation for resource provisioning

**Key files:**
- `cfn/bedrock-customer-resources.yml` — CloudFormation template
- `agent/lambda/action-groups/` — Lambda functions for each action group
- `agent/api-schema/` — OpenAPI schemas for action groups
- `agent/knowledge-base-assets/` — Policy docs, FAQs, claim data
- `agent/streamlit/` — Web UI application

**Use when:** You want a managed Bedrock Agent approach with action groups and knowledge bases.

---

### 2. Omnichannel Claims Processing (Enterprise Guidance)

**Repo:** [aws-solutions-library-samples/guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws](https://github.com/aws-solutions-library-samples/guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws)

**What it demonstrates:**
- Multi-channel FNOL: Amazon Connect (chat, SMS, voice) + React web app
- Amazon Lex chatbot for conversational claims intake
- Amazon Textract for document extraction (driver's license)
- Amazon Bedrock (Nova Pro) for vehicle damage image analysis
- Bedrock Knowledge Base for adjuster assistance
- DynamoDB for claims state management
- SQS + Lambda for async processing and notifications
- Third-party integrations (Guidewire, Socotra, Stripe)
- CDK deployment with Cognito auth and CloudFront

**Key components:**
- `source/` — React frontend + Lambda functions
- `source/AmazonConnect/` — Contact flow for claims
- `source/Amazon Lex/` — Chatbot definition
- `deploy.sh` — Full deployment script
- `cdk.context.json` — CDK configuration

**Use when:** Building an enterprise-grade omnichannel claims solution with multiple intake channels and third-party integrations.

---

### 3. Benefits Claims Processing with Bedrock Data Automation

**Repo:** [aws-samples/sample-accelerate-benefits-claims-processing-with-amazon-bedrock-data-automation](https://github.com/aws-samples/sample-accelerate-benefits-claims-processing-with-amazon-bedrock-data-automation)

**What it demonstrates:**
- Amazon Bedrock Data Automation (BDA) for document processing
- Custom blueprints for document classification (bank checks, medical receipts)
- Three-stage Lambda pipeline: extraction → validation → integration
- EventBridge for event-driven orchestration
- DynamoDB for processing metadata and status
- Bedrock Knowledge Base for SOP-based validation
- Streamlit frontend for claims submission
- SAM deployment

**Key architecture:**
```
S3 (ingestion) → Extraction Lambda (BDA) → Validation Lambda (KB + rules) → Integration Lambda
```

**Use when:** Document-heavy claims processing where you need custom extraction blueprints and automated validation against SOPs.

---

### 4. Serverless EDA Insurance Claims Processing

**Repo:** [aws-samples/serverless-eda-insurance-claims-processing](https://github.com/aws-samples/serverless-eda-insurance-claims-processing)

**What it demonstrates:**
- Event-driven architecture (EDA) for claims processing
- Serverless pipeline with Step Functions
- Document upload and processing
- Claims state machine
- Frontend for evidence upload

**Use when:** You want a serverless, event-driven claims pipeline without an AI agent (or as the backend for an agent).

---

### 5. Strands Agent with AgentCore

**Repo:** [aws-samples/sample-strands-agent-with-agentcore](https://github.com/aws-samples/sample-strands-agent-with-agentcore)

**What it demonstrates:**
- Strands Agents SDK integration with AgentCore Runtime
- Agent deployment patterns
- Tool implementation
- AgentCore configuration

**Use when:** You want a reference for deploying any Strands agent (including claims) to AgentCore Runtime.

---

### 6. Bedrock AgentCore with Strands and Nova

**Repo:** [aws-samples/sample-bedrock-agentcore-with-strands-and-nova](https://github.com/aws-samples/sample-bedrock-agentcore-with-strands-and-nova)

**What it demonstrates:**
- Strands Agents with Amazon Nova models
- AgentCore Runtime deployment
- Multi-tool agent patterns

**Use when:** You want to use Amazon Nova models (instead of Claude) for your claims agent.

---

### 7. Amazon Bedrock AgentCore Samples

**Repo:** [awslabs/amazon-bedrock-agentcore-samples](https://github.com/awslabs/amazon-bedrock-agentcore-samples)

**What it demonstrates:**
- Multiple agent patterns for AgentCore
- Memory integration
- Gateway integration
- Various framework examples (Strands, LangGraph, CrewAI)

**Use when:** You need reference patterns for AgentCore features like memory, gateway, or multi-framework support.

---

## AWS Blog Posts

### Automate the Insurance Claim Lifecycle

**URL:** [aws.amazon.com/blogs/machine-learning/automate-the-insurance-claim-lifecycle-using-amazon-bedrock-agents-and-knowledge-bases/](https://aws.amazon.com/blogs/machine-learning/automate-the-insurance-claim-lifecycle-using-amazon-bedrock-agents-and-knowledge-bases/)

**Published:** February 2024

**Key takeaways:**
- Complete walkthrough of building a Bedrock Agent for claims
- Action group design with OpenAPI schemas
- Knowledge Base setup with RAG
- Agent testing and tracing methodology
- Security considerations for production

**Agent capabilities demonstrated:**
- Create new claims
- Send pending document reminders
- Gather claims evidence
- Search claims and knowledge repositories
- Handle multi-claim conversations

---

### Automated Insurance Claims Processing with BDA

**URL:** [aws.amazon.com/blogs/industries/automated-insurance-claims-processing-using-amazon-bedrock-knowledge-base-and-agents/](https://aws.amazon.com/blogs/industries/automated-insurance-claims-processing-using-amazon-bedrock-knowledge-base-and-agents/)

**Published:** August 2024

**Key takeaways:**
- Bedrock Data Automation for document processing
- Custom blueprints for insurance documents
- Integration with Knowledge Bases for validation

---

### Building an Insurance Policy AI Assistant

**URL:** [aws.amazon.com/blogs/industries/building-an-insurance-policy-ai-assistant-using-amazon-bedrock/](https://aws.amazon.com/blogs/industries/building-an-insurance-policy-ai-assistant-using-amazon-bedrock/)

**Published:** January 2025

**Key takeaways:**
- Policy information retrieval
- Coverage details explanation
- 24/7 customer assistance
- RAG-based knowledge retrieval

---

## AWS Solutions & Guidance

### Guidance for Automating Tasks Using Agents for Amazon Bedrock

**URL:** [aws.amazon.com/solutions/guidance/automating-tasks-using-agents-for-amazon-bedrock/](https://aws.amazon.com/solutions/guidance/automating-tasks-using-agents-for-amazon-bedrock/)

**What it provides:**
- Reference architecture for Bedrock Agents
- Insurance agent as primary use case
- Claims creation, document reminders, evidence gathering
- Knowledge repository search

---

## Key AWS Services for Claims Processing

| Service | Role in Claims Processing |
|---|---|
| **Amazon Bedrock** | Foundation models for reasoning, image analysis, text generation |
| **Bedrock Agents** | Managed agent orchestration with action groups |
| **Bedrock Knowledge Bases** | RAG for policy docs, SOPs, FAQs |
| **Bedrock AgentCore Runtime** | Serverless agent hosting (Strands, LangGraph, etc.) |
| **Bedrock Data Automation** | Document classification and extraction with custom blueprints |
| **Amazon Textract** | OCR and structured data extraction from documents |
| **Amazon DynamoDB** | Claims state management, policy data |
| **Amazon S3** | Document storage, knowledge base data source |
| **Amazon SNS/SES** | Policy holder notifications |
| **Amazon Connect** | Chat, SMS, voice channels for FNOL |
| **Amazon Lex** | Conversational chatbot for claims intake |
| **AWS Lambda** | Business logic, action group handlers |
| **Amazon EventBridge** | Event-driven pipeline orchestration |
| **Amazon SQS** | Async processing, notification queuing |
| **AWS Step Functions** | Complex workflow orchestration |
| **Amazon Cognito** | User authentication for claims portal |
| **Amazon CloudFront** | Web application hosting |
| **AWS WAF** | Web application security |

## Recommended Starting Points

**For a quick prototype (< 1 hour):**
→ Use the Strands Agent pattern from `strands-agent-implementation.md` + `agentcore deploy`

**For a managed agent (< 1 day):**
→ Follow the [Insurance Claim Lifecycle blog post](https://aws.amazon.com/blogs/machine-learning/automate-the-insurance-claim-lifecycle-using-amazon-bedrock-agents-and-knowledge-bases/) and deploy the CloudFormation stack

**For enterprise production (weeks):**
→ Use the [Omnichannel Claims Processing Guidance](https://github.com/aws-solutions-library-samples/guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws) as a foundation and customize
