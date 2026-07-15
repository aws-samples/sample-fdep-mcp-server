# Claims Processing Agent

## Overview

This skill guides the design and implementation of AI agents that automate insurance claims processing workflows. It covers the full claims lifecycle from First Notice of Loss (FNOL) through adjudication and settlement.

**Key capabilities an agent can automate:**

| Capability | What the Agent Does |
|---|---|
| Claims intake (FNOL) | Collect incident details via chat, SMS, web form, or voice |
| Document extraction | Extract data from receipts, checks, medical records, police reports |
| Validation | Cross-reference extracted data with policy details, detect discrepancies |
| Fraud detection | Analyze patterns, flag anomalies, detect duplicate/inflated claims |
| Damage assessment | Use computer vision to assess damage from images, estimate repair costs |
| Adjudication | Apply business rules and SOPs to approve/deny/escalate claims |
| Customer notification | Send status updates, pending document reminders, settlement notices |
| Knowledge assistance | Answer policy questions, coverage details, process guidance |

**When NOT to use this skill:**

- Deploying the agent to AWS → use the `deploying-agent-to-bedrock-agentcore` skill
- Building a general-purpose chatbot without claims logic → use general agent patterns
- Processing documents without claims context → use document processing patterns
- Building Bedrock Agents with action groups (managed) → use the `amazon-bedrock` skill

## Architecture Patterns

### Pattern 1: Strands Agent on AgentCore Runtime (Recommended for new builds)

```
User → AgentCore Runtime → Strands Agent
                              ├── Tool: create_claim (DynamoDB)
                              ├── Tool: lookup_policy (DynamoDB)
                              ├── Tool: extract_document (Textract/BDA)
                              ├── Tool: assess_damage (Bedrock vision)
                              ├── Tool: validate_claim (business rules)
                              ├── Tool: send_notification (SNS/SES)
                              └── Knowledge Base (RAG for policy docs)
```

Deploy with `agentcore deploy` — no repo needed. See `deploying-agent-to-bedrock-agentcore` skill.

### Pattern 2: Bedrock Agent with Action Groups (Managed)

```
User → Bedrock Agent
          ├── Action Group: create-claim (Lambda)
          ├── Action Group: gather-evidence (Lambda)
          ├── Action Group: send-reminder (Lambda)
          └── Knowledge Base (policy docs, SOPs, FAQs)
```

Fully managed by AWS. Configure via console or API.

### Pattern 3: Event-Driven Claims Pipeline

```
S3 (document upload) → Lambda (extraction) → EventBridge → Lambda (validation) → DynamoDB
                                                                                      ↓
                                                              Lambda (notification) ← SQS
```

Serverless, event-driven. Best for high-volume batch processing.

## Data Model

### Claims Table (DynamoDB)

```json
{
  "claimId": "string (PK)",
  "policyId": "string (GSI)",
  "status": "open | pending_documents | under_review | approved | denied | closed",
  "claimType": "auto | health | property | benefits",
  "incidentDate": "ISO 8601",
  "filingDate": "ISO 8601",
  "claimAmount": "number",
  "description": "string",
  "documents": [
    {
      "documentId": "string",
      "type": "police_report | medical_record | receipt | photo | drivers_license",
      "s3Key": "string",
      "status": "pending | uploaded | validated | rejected",
      "extractedData": {}
    }
  ],
  "adjudication": {
    "decision": "approved | denied | escalated",
    "reason": "string",
    "adjudicator": "agent | human",
    "timestamp": "ISO 8601"
  },
  "policyHolder": {
    "name": "string",
    "email": "string",
    "phone": "string"
  }
}
```

## Agent Tools Design

A claims processing agent needs these core tools:

### 1. create_claim

```python
@tool
def create_claim(policy_id: str, claim_type: str, incident_date: str, description: str) -> dict:
    """Create a new insurance claim for a policy holder.
    
    Args:
        policy_id: The policy ID of the claimant
        claim_type: Type of claim (auto, health, property, benefits)
        incident_date: Date of the incident (ISO 8601)
        description: Description of the incident
    
    Returns:
        dict with claimId, status, and list of required documents
    """
    claim_id = generate_claim_id()
    # Store in DynamoDB
    # Return claim details with pending documents list
```

### 2. lookup_policy

```python
@tool
def lookup_policy(policy_id: str) -> dict:
    """Look up policy details including coverage, deductible, and limits.
    
    Args:
        policy_id: The policy ID to look up
    
    Returns:
        dict with coverage details, deductible, limits, and policy holder info
    """
```

### 3. get_claim_status

```python
@tool
def get_claim_status(claim_id: str) -> dict:
    """Get the current status and details of a claim.
    
    Args:
        claim_id: The claim ID to check
    
    Returns:
        dict with status, documents, adjudication details
    """
```

### 4. extract_document

```python
@tool
def extract_document(s3_key: str, document_type: str) -> dict:
    """Extract structured data from an uploaded document using Textract or BDA.
    
    Args:
        s3_key: S3 key of the uploaded document
        document_type: Type of document (receipt, check, medical_record, drivers_license)
    
    Returns:
        dict with extracted fields relevant to the document type
    """
```

### 5. assess_damage

```python
@tool
def assess_damage(image_s3_key: str) -> dict:
    """Analyze damage from an image using Bedrock vision model.
    
    Args:
        image_s3_key: S3 key of the damage image
    
    Returns:
        dict with damage assessment, severity, estimated repair cost
    """
```

### 6. validate_claim

```python
@tool
def validate_claim(claim_id: str) -> dict:
    """Validate a claim against policy rules and SOPs.
    
    Args:
        claim_id: The claim ID to validate
    
    Returns:
        dict with validation result, issues found, recommendation
    """
```

### 7. send_notification

```python
@tool
def send_notification(claim_id: str, notification_type: str, message: str) -> dict:
    """Send a notification to the policy holder about their claim.
    
    Args:
        claim_id: The claim ID
        notification_type: Type (status_update, document_reminder, settlement)
        message: The notification message
    
    Returns:
        dict with delivery status
    """
```

## Agent Instructions (System Prompt)

```
You are an insurance claims processing agent. You help policy holders file new claims, 
check claim status, and guide them through the claims process. You also assist adjusters 
by validating claims, assessing damage, and making adjudication recommendations.

Your capabilities:
- Create new claims and collect required information
- Look up policy details and coverage
- Check claim status and pending documents
- Extract data from uploaded documents
- Assess damage from images
- Validate claims against policy rules
- Send notifications to policy holders

Rules:
- Always verify the policy ID before creating a claim
- Never approve claims above $10,000 without human review
- Flag claims for fraud review if: duplicate submission, inconsistent dates, 
  amount exceeds coverage, or suspicious patterns detected
- Be empathetic and professional when communicating with policy holders
- Provide clear next steps after every interaction
```

## Gotchas

1. **Claims amounts should NEVER be auto-approved above a threshold.** Always route high-value claims to human review. The threshold depends on the business but $10,000 is a common starting point.

2. **Document extraction is not 100% accurate.** Always include confidence scores and flag low-confidence extractions for human review. Textract returns confidence per field.

3. **Fraud detection requires historical data.** A single claim in isolation is hard to flag. Build patterns over time using DynamoDB streams or analytics.

4. **PII handling is critical.** Claims contain sensitive data (SSN, medical records, financial info). Encrypt at rest and in transit. Use fine-grained IAM. Never log PII in CloudWatch without encryption.

5. **Multi-turn conversations need session management.** Use AgentCore Memory (STM) to maintain context across a claims intake conversation. Without it, the agent loses context between messages.

6. **Image analysis costs add up.** Bedrock vision model calls for damage assessment are more expensive than text. Batch where possible and cache results.

7. **SOPs change frequently.** Store Standard Operating Procedures in a Knowledge Base (RAG) rather than hardcoding in agent instructions. This allows updates without redeploying.

8. **Claims status transitions must be validated.** Don't allow invalid transitions (e.g., "denied" → "open"). Enforce a state machine in your validation logic.

9. **Regulatory compliance varies by jurisdiction.** Insurance is heavily regulated. Claims processing rules differ by state/country. Make rules configurable, not hardcoded.

10. **Test with realistic data, not synthetic.** Synthetic claims data often misses edge cases (partial coverage, multi-party claims, subrogation). Use anonymized real data for testing.

## Common Workflows

Read reference files for deeper implementation details:

- Read [industry-insurance-claims-strands.md](industry-insurance-claims-strands.md) for a complete Strands Agent implementation with tools, ready to deploy on AgentCore Runtime.
- Read [industry-insurance-claims-architecture.md](industry-insurance-claims-architecture.md) for detailed architecture patterns including event-driven pipelines, omnichannel FNOL, and the Bedrock Agent approach with action groups.
- Read [industry-insurance-claims-samples.md](industry-insurance-claims-samples.md) for links to official AWS sample repositories and blog posts covering claims processing with Bedrock, including the insurance claim lifecycle automation sample.

## Security Considerations

- You MUST encrypt all claims data at rest (DynamoDB encryption, S3 SSE-KMS)
- You MUST use fine-grained IAM — agent role should only access claims-related resources
- You MUST NOT log PII (names, SSN, medical data) in plain text to CloudWatch
- You SHOULD use VPC endpoints for DynamoDB and S3 access from agents in private subnets
- You MUST implement audit logging for all claim state changes (CloudTrail + DynamoDB Streams)
- You SHOULD use Bedrock Guardrails to prevent the agent from discussing non-claims topics
- You MUST validate all user inputs — prevent injection via claim descriptions
- You SHOULD implement rate limiting on claim creation to prevent abuse
- You MUST confirm destructive actions (claim deletion, status override) with the user

## Additional Resources

- [Automate the insurance claim lifecycle (AWS Blog)](https://aws.amazon.com/blogs/machine-learning/automate-the-insurance-claim-lifecycle-using-amazon-bedrock-agents-and-knowledge-bases/)
- [Insurance Claim Lifecycle Automation (GitHub)](https://github.com/aws-samples/amazon-bedrock-samples/tree/main/agents-and-function-calling/bedrock-agents/use-case-examples/insurance-claim-lifecycle-automation)
- [Benefits Claims Processing with BDA (GitHub)](https://github.com/aws-samples/sample-accelerate-benefits-claims-processing-with-amazon-bedrock-data-automation)
- [Omnichannel Claims Processing Guidance (GitHub)](https://github.com/aws-solutions-library-samples/guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws)
- [Serverless EDA Insurance Claims (GitHub)](https://github.com/aws-samples/serverless-eda-insurance-claims-processing)
- [Strands Agent with AgentCore (GitHub)](https://github.com/aws-samples/sample-strands-agent-with-agentcore)
- [Bedrock AgentCore with Strands and Nova (GitHub)](https://github.com/aws-samples/sample-bedrock-agentcore-with-strands-and-nova)
- [Guidance for Automating Tasks Using Agents for Amazon Bedrock](https://aws.amazon.com/solutions/guidance/automating-tasks-using-agents-for-amazon-bedrock/)
