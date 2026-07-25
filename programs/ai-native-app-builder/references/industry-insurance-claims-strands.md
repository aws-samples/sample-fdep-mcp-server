# Strands Agent Implementation for Claims Processing

This reference provides a complete implementation of a claims processing agent using Strands Agents, ready to deploy on Amazon Bedrock AgentCore Runtime.

## Project Structure

```
claims-agent/
├── my_agent.py              # Agent entrypoint (AgentCore app)
├── tools/
│   ├── __init__.py
│   ├── claims.py            # Claim CRUD tools
│   ├── documents.py         # Document extraction tools
│   ├── notifications.py     # Notification tools
│   └── policy.py            # Policy lookup tools
├── models/
│   ├── __init__.py
│   └── claim.py             # Data models
├── config.py                # Configuration
├── requirements.txt
└── .bedrock_agentcore.yaml  # AgentCore config (created by agentcore configure)
```

## Agent Entrypoint (my_agent.py)

```python
import os
from bedrock_agentcore import BedrockAgentCoreApp
from strands import Agent
from strands.models.bedrock import BedrockModel
from tools.claims import create_claim, get_claim_status, list_open_claims, update_claim_status
from tools.documents import extract_document, assess_damage
from tools.notifications import send_notification, send_pending_docs_reminder
from tools.policy import lookup_policy

app = BedrockAgentCoreApp()

# Configure the model
model = BedrockModel(
    model_id="anthropic.claude-sonnet-4-20250514-v1:0",
    region_name=os.environ.get("AWS_REGION", "us-west-2")
)

# System prompt for the claims agent
SYSTEM_PROMPT = """You are an insurance claims processing agent. You help policy holders 
file new claims, check claim status, and guide them through the claims process. You also 
assist adjusters by validating claims, assessing damage, and making adjudication recommendations.

Your capabilities:
- Create new claims and collect required information
- Look up policy details and coverage
- Check claim status and pending documents
- Extract data from uploaded documents (when provided)
- Assess damage from images (when provided)
- Send notifications to policy holders
- List all open claims for an adjuster

Rules:
- Always verify the policy ID exists before creating a claim
- Never approve claims above $10,000 without recommending human review
- Flag claims for fraud review if: duplicate submission, inconsistent dates, 
  amount exceeds coverage, or suspicious patterns detected
- Be empathetic and professional when communicating with policy holders
- Provide clear next steps after every interaction
- When creating a claim, always tell the user what documents they need to submit
"""

# Create the agent with tools
agent = Agent(
    model=model,
    system_prompt=SYSTEM_PROMPT,
    tools=[
        create_claim,
        get_claim_status,
        list_open_claims,
        update_claim_status,
        lookup_policy,
        extract_document,
        assess_damage,
        send_notification,
        send_pending_docs_reminder,
    ]
)


@app.entrypoint
def invoke(payload):
    """Claims processing agent entrypoint."""
    user_message = payload.get("prompt", "How can I help you with your claim?")
    session_id = payload.get("session_id")
    
    result = agent(user_message)
    
    return {
        "result": result.message,
        "session_id": session_id
    }


if __name__ == "__main__":
    app.run()
```

## Tools Implementation

### tools/claims.py

```python
import uuid
import os
from datetime import datetime
from strands import tool
import boto3

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
claims_table = dynamodb.Table(os.environ.get("CLAIMS_TABLE", "InsuranceClaims"))

REQUIRED_DOCUMENTS = {
    "auto": ["police_report", "damage_photos", "drivers_license", "repair_estimate"],
    "health": ["medical_records", "itemized_bill", "referral_letter"],
    "property": ["police_report", "damage_photos", "inventory_list", "repair_estimate"],
    "benefits": ["receipt", "proof_of_payment", "supporting_documentation"],
}


@tool
def create_claim(
    policy_id: str,
    claim_type: str,
    incident_date: str,
    description: str
) -> dict:
    """Create a new insurance claim for a policy holder.
    
    Args:
        policy_id: The policy ID of the claimant (e.g., PY1234)
        claim_type: Type of claim - must be one of: auto, health, property, benefits
        incident_date: Date of the incident in ISO 8601 format (YYYY-MM-DD)
        description: Detailed description of the incident
    
    Returns:
        dict with claimId, status, required documents, and next steps
    """
    # Validate claim type
    if claim_type not in REQUIRED_DOCUMENTS:
        return {"error": f"Invalid claim type. Must be one of: {list(REQUIRED_DOCUMENTS.keys())}"}
    
    claim_id = f"{uuid.uuid4().hex[:5]}-{uuid.uuid4().hex[:2]}"
    now = datetime.utcnow().isoformat()
    
    required_docs = REQUIRED_DOCUMENTS[claim_type]
    
    claim = {
        "claimId": claim_id,
        "policyId": policy_id,
        "status": "open",
        "claimType": claim_type,
        "incidentDate": incident_date,
        "filingDate": now,
        "description": description,
        "documents": [
            {"type": doc, "status": "pending"} for doc in required_docs
        ],
        "createdAt": now,
        "updatedAt": now,
    }
    
    claims_table.put_item(Item=claim)
    
    return {
        "claimId": claim_id,
        "status": "open",
        "requiredDocuments": required_docs,
        "message": f"Claim {claim_id} created successfully. Please upload the required documents."
    }


@tool
def get_claim_status(claim_id: str) -> dict:
    """Get the current status and details of a claim.
    
    Args:
        claim_id: The claim ID to check (e.g., a1b2c-3d)
    
    Returns:
        dict with full claim details including status, documents, and adjudication info
    """
    response = claims_table.get_item(Key={"claimId": claim_id})
    item = response.get("Item")
    
    if not item:
        return {"error": f"Claim {claim_id} not found"}
    
    return item


@tool
def list_open_claims() -> dict:
    """List all claims with open or pending_documents status. Used by adjusters.
    
    Returns:
        dict with list of open claims including claimId, policyId, type, and filing date
    """
    # Note: In production, use a GSI on status field
    response = claims_table.scan(
        FilterExpression="(#s = :open) OR (#s = :pending)",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":open": "open", ":pending": "pending_documents"}
    )
    
    claims = [{
        "claimId": item["claimId"],
        "policyId": item["policyId"],
        "claimType": item["claimType"],
        "status": item["status"],
        "filingDate": item["filingDate"],
    } for item in response.get("Items", [])]
    
    return {"openClaims": claims, "count": len(claims)}


@tool
def update_claim_status(claim_id: str, new_status: str, reason: str) -> dict:
    """Update the status of a claim. Used by adjusters for adjudication.
    
    Args:
        claim_id: The claim ID to update
        new_status: New status - one of: pending_documents, under_review, approved, denied, closed
        reason: Reason for the status change
    
    Returns:
        dict with updated claim status
    """
    valid_statuses = ["pending_documents", "under_review", "approved", "denied", "closed"]
    if new_status not in valid_statuses:
        return {"error": f"Invalid status. Must be one of: {valid_statuses}"}
    
    now = datetime.utcnow().isoformat()
    
    claims_table.update_item(
        Key={"claimId": claim_id},
        UpdateExpression="SET #s = :status, updatedAt = :now, adjudication = :adj",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":status": new_status,
            ":now": now,
            ":adj": {
                "decision": new_status,
                "reason": reason,
                "adjudicator": "agent",
                "timestamp": now
            }
        }
    )
    
    return {
        "claimId": claim_id,
        "newStatus": new_status,
        "reason": reason,
        "updatedAt": now
    }
```

### tools/policy.py

```python
import os
from strands import tool
import boto3

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
policies_table = dynamodb.Table(os.environ.get("POLICIES_TABLE", "InsurancePolicies"))


@tool
def lookup_policy(policy_id: str) -> dict:
    """Look up policy details including coverage, deductible, and limits.
    
    Args:
        policy_id: The policy ID to look up (e.g., PY1234)
    
    Returns:
        dict with coverage details, deductible, limits, and policy holder info
    """
    response = policies_table.get_item(Key={"policyId": policy_id})
    item = response.get("Item")
    
    if not item:
        return {"error": f"Policy {policy_id} not found. Please verify the policy ID."}
    
    return {
        "policyId": item["policyId"],
        "policyHolder": item.get("policyHolder", {}),
        "coverageType": item.get("coverageType"),
        "coverageLimit": item.get("coverageLimit"),
        "deductible": item.get("deductible"),
        "premiumAmount": item.get("premiumAmount"),
        "status": item.get("status"),
        "effectiveDate": item.get("effectiveDate"),
        "expirationDate": item.get("expirationDate"),
    }
```

### tools/documents.py

```python
import os
import json
from strands import tool
import boto3

textract = boto3.client("textract", region_name=os.environ.get("AWS_REGION", "us-west-2"))
bedrock_runtime = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-west-2"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-west-2"))

DOCUMENTS_BUCKET = os.environ["DOCUMENTS_BUCKET"]  # Required — no default to prevent bucket-squatting


@tool
def extract_document(s3_key: str, document_type: str) -> dict:
    """Extract structured data from an uploaded document using Amazon Textract.
    
    Args:
        s3_key: S3 key of the uploaded document in the claims documents bucket
        document_type: Type of document - one of: receipt, check, medical_record, drivers_license, police_report
    
    Returns:
        dict with extracted fields relevant to the document type and confidence scores
    """
    try:
        response = textract.analyze_document(
            Document={
                "S3Object": {
                    "Bucket": DOCUMENTS_BUCKET,
                    "Name": s3_key
                }
            },
            FeatureTypes=["FORMS", "TABLES"]
        )
        
        # Extract key-value pairs
        extracted = {}
        for block in response.get("Blocks", []):
            if block["BlockType"] == "KEY_VALUE_SET" and "KEY" in block.get("EntityTypes", []):
                key_text = get_text_from_block(block, response["Blocks"])
                value_block = find_value_block(block, response["Blocks"])
                if value_block:
                    value_text = get_text_from_block(value_block, response["Blocks"])
                    extracted[key_text] = {
                        "value": value_text,
                        "confidence": block.get("Confidence", 0)
                    }
        
        return {
            "documentType": document_type,
            "s3Key": s3_key,
            "extractedFields": extracted,
            "status": "extracted"
        }
    except Exception as e:
        return {"error": f"Document extraction failed: {str(e)}"}


@tool
def assess_damage(image_s3_key: str) -> dict:
    """Analyze vehicle or property damage from an image using Bedrock vision model.
    
    Args:
        image_s3_key: S3 key of the damage image in the claims documents bucket
    
    Returns:
        dict with damage assessment including severity, affected areas, and estimated repair cost
    """
    try:
        # Get image from S3
        image_obj = s3.get_object(Bucket=DOCUMENTS_BUCKET, Key=image_s3_key)
        image_bytes = image_obj["Body"].read()
        
        # Use Bedrock vision model for damage assessment
        response = bedrock_runtime.converse(
            modelId="anthropic.claude-sonnet-4-20250514-v1:0",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "jpeg",
                            "source": {"bytes": image_bytes}
                        }
                    },
                    {
                        "text": """Analyze this image for insurance damage assessment. Provide:
1. Type of damage (collision, weather, vandalism, etc.)
2. Severity (minor, moderate, severe, total loss)
3. Affected areas/components
4. Estimated repair cost range (USD)
5. Whether the vehicle/property appears repairable

Respond in JSON format."""
                    }
                ]
            }],
        )
        
        assessment_text = response["output"]["message"]["content"][0]["text"]
        assessment = json.loads(assessment_text)
        
        return {
            "imageKey": image_s3_key,
            "assessment": assessment,
            "status": "assessed",
            "note": "Estimate is preliminary. Professional inspection recommended for claims over $5,000."
        }
    except Exception as e:
        return {"error": f"Damage assessment failed: {str(e)}"}


def get_text_from_block(block, all_blocks):
    """Helper to extract text from Textract block relationships."""
    text = ""
    if "Relationships" in block:
        for rel in block["Relationships"]:
            if rel["Type"] == "CHILD":
                for child_id in rel["Ids"]:
                    child = next((b for b in all_blocks if b["Id"] == child_id), None)
                    if child and child["BlockType"] == "WORD":
                        text += child.get("Text", "") + " "
    return text.strip()


def find_value_block(key_block, all_blocks):
    """Helper to find the value block for a key-value pair."""
    if "Relationships" in key_block:
        for rel in key_block["Relationships"]:
            if rel["Type"] == "VALUE":
                for value_id in rel["Ids"]:
                    return next((b for b in all_blocks if b["Id"] == value_id), None)
    return None
```

### tools/notifications.py

```python
import os
from strands import tool
import boto3

sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "us-west-2"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
claims_table = dynamodb.Table(os.environ.get("CLAIMS_TABLE", "InsuranceClaims"))

SNS_TOPIC_ARN = os.environ.get("CLAIMS_SNS_TOPIC_ARN", "")


@tool
def send_notification(claim_id: str, notification_type: str, message: str) -> dict:
    """Send a notification to the policy holder about their claim.
    
    Args:
        claim_id: The claim ID
        notification_type: Type of notification - one of: status_update, document_reminder, settlement
        message: The notification message to send
    
    Returns:
        dict with delivery status
    """
    if not SNS_TOPIC_ARN:
        return {"error": "SNS topic not configured. Set CLAIMS_SNS_TOPIC_ARN environment variable."}
    
    subject_map = {
        "status_update": f"Claim {claim_id} - Status Update",
        "document_reminder": f"Claim {claim_id} - Documents Required",
        "settlement": f"Claim {claim_id} - Settlement Notice",
    }
    
    subject = subject_map.get(notification_type, f"Claim {claim_id} - Notification")
    
    try:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=message,
        )
        return {"status": "sent", "claimId": claim_id, "type": notification_type}
    except Exception as e:
        return {"error": f"Failed to send notification: {str(e)}"}


@tool
def send_pending_docs_reminder(claim_id: str) -> dict:
    """Send a reminder to the policy holder about pending documents for their claim.
    
    Args:
        claim_id: The claim ID with pending documents
    
    Returns:
        dict with reminder status and list of pending documents
    """
    response = claims_table.get_item(Key={"claimId": claim_id})
    item = response.get("Item")
    
    if not item:
        return {"error": f"Claim {claim_id} not found"}
    
    pending_docs = [
        doc["type"] for doc in item.get("documents", [])
        if doc.get("status") == "pending"
    ]
    
    if not pending_docs:
        return {"claimId": claim_id, "message": "No pending documents for this claim."}
    
    message = (
        f"Reminder: Your claim {claim_id} has pending documents.\n\n"
        f"Please upload the following:\n"
        + "\n".join(f"- {doc.replace('_', ' ').title()}" for doc in pending_docs)
        + "\n\nUpload at: https://claims.example.com/upload/{claim_id}"
    )
    
    result = send_notification(claim_id, "document_reminder", message)
    
    return {
        "claimId": claim_id,
        "pendingDocuments": pending_docs,
        "reminderSent": result.get("status") == "sent"
    }
```

## requirements.txt

```
bedrock-agentcore
strands-agents
boto3
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `AWS_REGION` | AWS region for all services | Yes |
| `CLAIMS_TABLE` | DynamoDB table name for claims | Yes |
| `POLICIES_TABLE` | DynamoDB table name for policies | Yes |
| `DOCUMENTS_BUCKET` | S3 bucket for claim documents | Yes |
| `CLAIMS_SNS_TOPIC_ARN` | SNS topic ARN for notifications | Yes |

Set these in your `.env.local` for local development or configure via AgentCore Identity/Secrets Manager for production.

## Deployment

```bash
# 1. Install dependencies
pip install bedrock-agentcore strands-agents boto3

# 2. Configure
agentcore configure -e my_agent.py

# 3. Deploy (direct code deploy — no Docker, no repo needed)
agentcore deploy

# 4. Test
agentcore invoke '{"prompt": "I need to file a new auto insurance claim. My policy ID is PY1234."}'
```

## IAM Role Permissions

The AgentCore execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/InsuranceClaims",
        "arn:aws:dynamodb:*:*:table/InsurancePolicies"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::${DOCUMENTS_BUCKET}/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:*:*:ClaimsNotifications"
    }
  ]
}
```

## Testing Locally

```bash
# Start the agent
python my_agent.py

# In another terminal, test various scenarios:

# Create a claim
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "I was in a car accident yesterday. My policy is PY1234."}'

# Check status
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the status of claim a1b2c-3d?"}'

# Adjuster workflow
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show me all open claims and send reminders for pending documents."}'
```
