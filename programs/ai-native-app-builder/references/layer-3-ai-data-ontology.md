# Layer 3 — AI & Data Ontology

## Purpose

Quality-controlled, persistent derived data for AI. This layer transforms raw enterprise data into AI-ready semantic representations — embeddings, knowledge graphs, curated datasets with lineage tracking.

## Coverage: 30% (Weakest layer — 2 true gaps)

## Capabilities

### 1. Semantic Data (Embeddings & Vector Search)

**Coverage:** 🔵 Accel #3

| Resource | Link |
|----------|------|
| Bedrock Semantic Search / Embeddings | https://github.com/aws-samples/amazon-bedrock-samples |
| Amazon S3 Vectors | https://aws.amazon.com/s3/features/vectors/ |
| OpenSearch Serverless | https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html |

**Pattern:** Convert text/documents into vector embeddings for semantic similarity search.

```
Source Data → Bedrock Embeddings (Titan/Cohere) → Vector Store → Semantic Query
```

**Embedding models:**
- Amazon Titan Embed Text v2 (1024 dimensions, multilingual)
- Cohere Embed (1024 dimensions, strong for retrieval)
- Amazon Titan Embed Image (multimodal)

**Vector store selection:**
- **S3 Vectors** — New, cheapest, billions of vectors, sub-second queries
- **OpenSearch Serverless** — Mature, hybrid search (keyword + vector), filtering
- **Aurora pgvector** — If you already use Aurora for relational data
- **Neptune Analytics** — If combining with graph queries

### 2. Data Catalog & Lineage

**Coverage:** 🔴 TRUE GAP

No accelerator exists in either the FDE or Agentic catalog.

**Available services (no template):**
- AWS Glue Data Catalog — Schema registry, table metadata
- AWS Lake Formation — Fine-grained access control
- CloudTrail — API-level audit trail

**Custom build recommendation:**
1. Use Glue Catalog for schema registration
2. Tag all resources with lineage metadata (source, transform, version)
3. Build a Step Functions pipeline that tracks data transformations
4. Store lineage graph in DynamoDB or Neptune

### 3. Golden Knowledge Graph

**Coverage:** 🔴 TRUE GAP

No entity extraction → graph seeding pipeline exists as an accelerator.

**Available services (no template):**
- Amazon Neptune — Graph database (property graph + RDF)
- Amazon Comprehend — Entity extraction (NER)
- Bedrock — LLM-based entity/relationship extraction

**Custom build recommendation:**
1. Extract entities from documents using Comprehend or Bedrock
2. Define ontology (entity types, relationship types)
3. Seed Neptune graph with extracted entities and relationships
4. Build graph query tools for the agent

```
Documents → Bedrock (entity extraction) → Neptune (graph store) → Agent (graph queries)
```

### 4. Data Quality

**Coverage:** 🟠 Partial

| Resource | Link |
|----------|------|
| AWS Glue Data Quality | https://docs.aws.amazon.com/glue/latest/dg/glue-data-quality.html |

**Available but no AI-specific template.** Glue Data Quality provides rule-based validation. For AI pipelines, you need:
- Embedding quality checks (drift detection)
- Document freshness monitoring
- Knowledge Base accuracy evaluation (use Bedrock KB Evaluation)

### 5. ETL / Reverse ETL / Master Data Management

**Coverage:** 🟠 Partial

| Resource | Link |
|----------|------|
| AWS Glue | https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html |
| Step Functions | https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html |

**Available services but no AI-specific ETL accelerator.** For AI apps:
- Use Glue for batch data transformation
- Use Step Functions for orchestrating multi-step data pipelines
- Use EventBridge for triggering pipelines on data arrival
- Use Bedrock KB sync jobs for keeping knowledge current

## Build Checklist

- [ ] Define embedding strategy (which data gets embedded, which model)
- [ ] Choose vector store based on scale and query patterns
- [ ] Set up embedding pipeline (batch or real-time)
- [ ] Implement data quality checks for AI inputs
- [ ] Plan knowledge refresh cadence (how often to re-embed)
- [ ] If knowledge graph needed: define ontology, build extraction pipeline
- [ ] Tag all data assets with lineage metadata

## Common Mistakes

1. **Embedding everything** — Be selective; irrelevant embeddings dilute search quality
2. **No refresh strategy** — Stale embeddings give wrong answers; plan re-ingestion
3. **Ignoring chunk overlap** — Overlapping chunks improve retrieval but increase storage
4. **Knowledge graph without clear ontology** — Define entity/relationship types before building
5. **No data quality gates** — Bad data in = bad AI out; validate before embedding
