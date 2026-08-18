# Layer 2 — Enterprise Resources

## Purpose

The data, APIs, knowledge, and document processing capabilities that AI applications consume and produce. This is the "what the agent works with" layer.

## Coverage: 80% (Strong — most patterns have accelerators)

## Capabilities

### 1. Knowledge Bases (RAG)

**Coverage:** ✅ Both (Accel #1 + Agentic #37, #92)

| Resource | Link |
|----------|------|
| Amazon Bedrock RAG | https://github.com/aws-samples/amazon-bedrock-rag |
| GAAB (Generative AI App Builder) | https://github.com/aws-solutions/generative-ai-application-builder-on-aws |
| Agentic RAG Pattern | https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html |
| RAG Evaluation | https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-evaluate.html |
| EventBridge + Bedrock KB + S3 + AOSS | https://github.com/aws-samples/serverless-patterns/tree/main/eventbridge-bedrock-s3-aoss |

**Vector store options:**
- OpenSearch Serverless (default, managed)
- Amazon S3 Vectors (new, cost-effective for large scale)
- Aurora PostgreSQL (pgvector)
- Neptune Analytics
- Pinecone, MongoDB, Redis (third-party)

**CDK pattern:**

```python
from aws_cdk import aws_bedrock as bedrock

kb = bedrock.CfnKnowledgeBase(self, "AppKB",
    name="app-knowledge-base",
    role_arn=kb_role.role_arn,
    knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(
        type="VECTOR",
        vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(
            # Resolve the current embedding model live via the AWS MCP server
            # (see bedrock-model-selection.md). Match embedding dimensions to
            # the vector store index configuration.
            embedding_model_arn=f"arn:aws:bedrock:{region}::foundation-model/<current-embedding-model-id>"
        )
    ),
    storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(
        type="OPENSEARCH_SERVERLESS",
        opensearch_serverless_configuration=...
    )
)
```

### 2. Services / APIs

**Coverage:** ✅ Both (Accel #27 + Agentic #4, #43)

| Resource | Link |
|----------|------|
| ServerlessLand (400+ patterns) | https://github.com/aws-samples/serverless-patterns |
| AgentCore Gateway | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html |

**Standard API stack:**
- API Gateway (REST or HTTP API)
- Lambda (handlers)
- DynamoDB or Aurora (data)
- Cognito Authorizer (auth)

### 3. Structured & Unstructured Data

**Coverage:** 🔵 Accel #5 (IDP), #28 (DynamoDB)

| Resource | Link |
|----------|------|
| IDP Accelerator | https://github.com/aws-solutions-library-samples/accelerated-intelligent-document-processing-on-aws |
| DynamoDB Design Patterns | https://github.com/aws-samples/amazon-dynamodb-design-patterns |
| Bedrock Data Automation (BDA) | https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html |

**Data store selection:**

| Use Case | Service | When |
|----------|---------|------|
| Transactional (claims, orders, users) | DynamoDB | Key-value access, high throughput |
| Relational (complex queries, joins) | Aurora PostgreSQL | Multi-table relationships |
| Documents (PDFs, images) | S3 | Object storage + lifecycle |
| Vector embeddings | OpenSearch / S3 Vectors | Semantic search, RAG |
| Graph (relationships, fraud) | Neptune | Entity relationships, path queries |
| Time-series (metrics, logs) | Timestream | IoT, monitoring data |

### 4. Document Processing (IDP)

**Coverage:** 🔵 Accel #5

| Resource | Link |
|----------|------|
| IDP Accelerator | https://github.com/aws-solutions-library-samples/accelerated-intelligent-document-processing-on-aws |
| Textract | https://docs.aws.amazon.com/textract/latest/dg/what-is.html |
| Bedrock Data Automation (BDA) | https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html |
| BDA PII Redaction | https://github.com/aws-samples/sample-bda-redaction |

**Document processing pipeline:**

```
S3 Upload → EventBridge → Lambda (classify) → Textract/BDA (extract) → DynamoDB (store) → Agent (use)
```

**Textract vs BDA:**
- **Textract:** Forms, tables, handwriting, queries. Mature, well-documented.
- **BDA:** Newer, handles complex multi-page documents, invoices, receipts with higher accuracy. Supports custom blueprints.

### 5. Document Summarization

**Coverage:** 🔵 Accel #2

| Resource | Link |
|----------|------|
| Bedrock Summarization | https://aws-samples.github.io/amazon-bedrock-samples/genai-use-cases/text-generation/how_to_work_with_text-summarization-titan+claude/ |

### 6. Document Classification

**Coverage:** 🔵 Accel #4

| Resource | Link |
|----------|------|
| Bedrock Classification | https://github.com/aws-samples/amazon-bedrock-samples |
| Comprehend | https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html |

### 7. Org Assets & MCP Servers

**Coverage:** 🟢 Agentic #29, #55

| Resource | Link |
|----------|------|
| AWS Agent Plugins (MCP) | https://github.com/awslabs/agent-plugins |

### 8. External AI Agents

**Coverage:** 🟢 Agentic #24

Agent-to-Agent (A2A) Protocol support in AgentCore Runtime for calling external agents.

## Build Checklist

- [ ] Define data model (entities, relationships, access patterns)
- [ ] Choose data store(s) based on access patterns
- [ ] Set up S3 bucket for documents (encrypted, versioned)
- [ ] Configure document processing pipeline (Textract or BDA)
- [ ] Set up Knowledge Base if RAG is needed
- [ ] Define API endpoints and Lambda handlers
- [ ] Implement data access layer with proper error handling
- [ ] Set up DynamoDB GSIs for query patterns

## Common Mistakes

1. **Single-table DynamoDB without understanding access patterns** — Design GSIs before coding
2. **Not enabling point-in-time recovery** — Always enable PITR on production tables
3. **Textract without confidence thresholds** — Always check confidence scores; flag low-confidence for human review
4. **Knowledge Base without chunking strategy** — Default chunking may not suit your documents; test with different chunk sizes
5. **Missing S3 lifecycle rules** — Documents accumulate; archive to Glacier after 90-365 days
