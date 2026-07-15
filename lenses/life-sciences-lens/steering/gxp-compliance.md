---
id: gxp-compliance
description: "GxP compliance steering for AI systems in drug development, clinical trials, and manufacturing"
inclusion: always
priority: 90
---

# GxP Compliance for AI Systems

Reference: [AWS Well-Architected Life Sciences Lens](https://docs.aws.amazon.com/wellarchitected/latest/life-sciences-lens/life-sciences-lens.html)

## Context

GxP (Good x Practice) refers to quality guidelines and regulations for life sciences:
- **GLP** (Good Laboratory Practice) — research and discovery
- **GCP** (Good Clinical Practice) — clinical trials
- **GMP** (Good Manufacturing Practice) — manufacturing
- **GVP** (Good Vigilance Practice) — post-market surveillance

When AI systems are used in any GxP-regulated activity, they must be validated and controlled.

## Rules for AI Systems in GxP Environments

### 1. Data Integrity (ALCOA+)

All AI system data must satisfy ALCOA+ principles:
- **A**ttributable — every output traceable to the AI system and its inputs
- **L**egible — outputs human-readable and unambiguous
- **C**ontemporaneous — timestamps accurate, audit trail immutable
- **O**riginal — source data preserved, not overwritten
- **A**ccurate — validated against known-good datasets

Plus: Complete, Consistent, Enduring, Available

### 2. Computer System Validation (CSV)

AI systems used in GxP activities MUST be validated:
- Risk assessment (GAMP 5 categories)
- Installation Qualification (IQ)
- Operational Qualification (OQ)
- Performance Qualification (PQ)
- Ongoing validation (model drift monitoring = continuous PQ)

### 3. Change Control

Any change to an AI model, training data, or inference pipeline requires:
- Change request with impact assessment
- Approval from Quality Assurance
- Re-validation if the change affects GxP output
- Documentation in the system's validation master file

### 4. Audit Trail Requirements

- Every AI inference must be logged with: input, output, model version, timestamp, user
- Audit trail must be immutable (append-only, tamper-evident)
- Retention: minimum 15 years for clinical data, or per applicable regulation
- Audit trail must be available for regulatory inspection within 48 hours

### 5. Model Governance

- Model inventory with: purpose, training data source, validation status, owner
- Periodic re-validation schedule (minimum annual, or on data drift detection)
- Retirement procedure (what happens when a model is deprecated)
- Clear human oversight for any AI decision affecting patient safety

## AWS Implementation Guidance

| GxP Requirement | AWS Service | Pattern |
|-----------------|-------------|---------|
| Audit trail | CloudTrail + DynamoDB (append-only) | Immutable log with hash chain |
| Data integrity | S3 Object Lock (compliance mode) | WORM storage for source data |
| Validation evidence | S3 + version control | IQ/OQ/PQ documents versioned |
| Change control | AWS Config + CloudTrail | Detect and record all changes |
| Model registry | SageMaker Model Registry or custom | Track model versions + validation status |
| Access control | IAM + Cognito + MFA | Role-based, least privilege |
| Encryption | KMS (customer-managed keys) | Encrypt at rest and in transit |
| Environment separation | Separate AWS accounts | Dev/validation/production isolation |
