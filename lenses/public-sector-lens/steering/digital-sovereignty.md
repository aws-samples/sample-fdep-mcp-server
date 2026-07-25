---
id: digital-sovereignty
description: "Digital sovereignty requirements for AI systems in government and public sector"
inclusion: always
priority: 95
---

# Digital Sovereignty for AI Systems

Reference: [AWS Digital Sovereignty Well-Architected Lens](https://aws.amazon.com/blogs/architecture/announcing-the-aws-digital-sovereignty-well-architected-lens/)

## Context

Public sector AI systems must meet sovereignty requirements: data stays within jurisdictional boundaries, access is controlled by the sovereign entity, and infrastructure can be operated independently if needed.

## Rules

### 1. Data Residency
- All citizen data MUST remain within the designated AWS region (no cross-region replication without explicit authorization)
- Model training data must not leave the sovereign region
- Inference requests and responses must not transit non-sovereign regions
- Backup and DR: within-region or to approved sovereign regions only

### 2. Access Control and Sovereignty
- Only cleared/vetted personnel can access production AI systems
- No vendor (including AWS) access to citizen data without formal authorization
- Encryption keys: customer-managed (AWS KMS with customer-controlled key material) or external key store (XKS)
- Break-glass procedures documented and tested quarterly

### 3. AI Transparency for Government
- Every AI decision affecting citizens MUST be explainable in plain language
- Citizens have the right to know when AI was used in decisions affecting them
- Human review must be available for any AI-influenced government decision
- No fully autonomous decisions for benefits, enforcement, or rights determinations

### 4. Supply Chain Control
- Document all AI model providers and their data handling practices
- Prefer sovereign model options (models trained on sovereign data, hosted in-region)
- No model telemetry or usage data sent outside sovereign boundary
- Regular review of third-party AI component compliance

### 5. Audit and Compliance
- All AI system access logged and available for audit within 24 hours
- Retention: per national archives requirements (typically 7-25 years)
- Regular compliance assessments against national AI strategy/framework
- Annual third-party audit of AI systems making citizen-impacting decisions

## AWS Sovereignty Patterns

| Requirement | AWS Capability |
|-------------|---------------|
| Data residency | Regional service endpoints + S3 bucket policies |
| Key management | KMS with imported key material or External Key Store (XKS) |
| Access control | IAM + Organizations SCPs + Control Tower |
| Audit | CloudTrail (organization-wide) + Config |
| Network isolation | VPC + PrivateLink (no internet egress) |
| Sovereign cloud | AWS Sovereign Cloud (where available) |
| Compliance evidence | Artifact (compliance reports) + Audit Manager |
