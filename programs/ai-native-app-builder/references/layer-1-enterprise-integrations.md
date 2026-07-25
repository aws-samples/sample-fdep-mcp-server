# Layer 1 — Enterprise System Integrations

## Purpose

Connect AI applications to existing enterprise systems — Systems of Record (SoR), Systems of Knowledge (SoK), and Systems of Activity (SoA). This is how agents access real business data and take actions in external tools.

## Coverage: 40% (Partial — many system-specific adapters still need building)

## Capabilities

### 1. Systems of Record (Salesforce, SAP, Oracle, Workday, ServiceNow)

**Coverage:** 🟢 Agentic #29, #43

| Resource | Link |
|----------|------|
| AgentCore Gateway User Federation | https://github.com/aws-samples/sample-bedrock-agentcore-gateway-user-federation |
| AgentCore Gateway (API-to-MCP) | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html |

**Pattern:** Use AgentCore Gateway to convert existing REST/OpenAPI endpoints into MCP tools that agents can call. The Gateway handles auth federation (OAuth2, API keys) so agents don't need direct credentials.

**Implementation approach:**
1. Define the external API as an OpenAPI spec
2. Register it with AgentCore Gateway
3. Gateway auto-generates MCP tools for the agent
4. Agent calls tools → Gateway handles auth + routing

**Gap:** System-specific MCP servers (Salesforce, SAP, ServiceNow) don't exist pre-built. You need to either:
- Build custom MCP servers for each system
- Use AgentCore Gateway with the system's REST API
- Use Lambda-based action groups as adapters

### 2. Systems of Knowledge (Confluence, Notion, SharePoint, GitHub)

**Coverage:** 🟢 Agentic #4

| Resource | Link |
|----------|------|
| Bedrock Knowledge Bases | https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html |
| AgentCore Gateway (OpenAPI → MCP) | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html |

**Pattern:** For document-based knowledge, ingest into Bedrock Knowledge Bases (S3 → embeddings → vector store). For live API access, use Gateway.

**Supported data sources for KB:**
- S3 (documents, PDFs, HTML)
- Web crawler
- Confluence (native connector)
- SharePoint (native connector)
- Salesforce (native connector)

**Gap:** No pre-built Notion MCP server. GitHub content needs custom ingestion.

### 3. Systems of Activity (Slack, Teams, Zoom, Jira, Asana)

**Coverage:** 🟠 Partial (Accel #29)

| Resource | Link |
|----------|------|
| EventBridge CDK Audit Service | https://github.com/aws-samples/amazon-eventbridge-cdk-audit-service-sample |
| EventBridge Partner Integrations | https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-saas.html |

**Pattern:** Use EventBridge for event-driven integration. Partner event sources exist for some SaaS tools. For bidirectional communication (agent sends messages to Slack), build Lambda adapters.

**Gap:** No pre-built Slack/Teams/Jira MCP adapters. Must build custom integrations using their APIs.

## Integration Patterns

### Pattern A: AgentCore Gateway (Recommended for REST APIs)

```
Agent → AgentCore Gateway → External API (OAuth2/API Key)
```

Best for: Any system with a REST/OpenAPI interface. Gateway handles auth, rate limiting, and converts to MCP tools.

### Pattern B: Bedrock Knowledge Base (For document ingestion)

```
External System → Sync to S3 → Bedrock KB → Agent (RAG)
```

Best for: Confluence, SharePoint, document repositories. Agent queries knowledge via RAG.

### Pattern C: EventBridge (For event-driven)

```
External System → EventBridge → Lambda → Agent/Workflow
```

Best for: Reacting to events (new Jira ticket, Slack message, calendar event).

### Pattern D: Custom MCP Server (For deep integration)

```
Agent → Custom MCP Server → External System SDK
```

Best for: Complex interactions requiring multi-step API calls, pagination, or custom logic.

## Build Checklist

- [ ] Identify which external systems the app needs to connect to
- [ ] For each system: determine pattern (Gateway, KB, EventBridge, or Custom MCP)
- [ ] Set up auth credentials in Secrets Manager
- [ ] Configure AgentCore Gateway for REST APIs
- [ ] Set up Bedrock KB data sources for document systems
- [ ] Build custom MCP servers for unsupported systems
- [ ] Test connectivity and error handling

## Common Mistakes

1. **Storing API keys in code** — Always use Secrets Manager or AgentCore Gateway credential management
2. **Not handling rate limits** — External APIs have quotas; implement backoff/retry
3. **Syncing too much data to KB** — Be selective; large KBs have slower retrieval
4. **Missing error handling for external system downtime** — Agent should gracefully degrade
