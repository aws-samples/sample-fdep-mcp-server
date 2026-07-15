---
id: clinical-data-integrity
description: "Data integrity requirements for AI systems processing clinical trial or real-world evidence data"
inclusion: always
priority: 85
---

# Clinical Data Integrity for AI Systems

Reference: [AWS Well-Architected Life Sciences Lens](https://docs.aws.amazon.com/wellarchitected/latest/life-sciences-lens/life-sciences-lens.html)

## Scope

Applies when AI systems process:
- Clinical trial data (from EDC, CTMS, or lab systems)
- Real-world data (RWD) from EHR, claims, or registries
- Real-world evidence (RWE) derived from RWD analysis
- Pharmacovigilance / adverse event data
- Manufacturing quality data (batch records, deviations)

## Rules

### 1. Source Data Preservation

- Raw clinical data MUST NOT be modified by AI processing
- AI outputs (summaries, classifications, predictions) are derived data — stored separately
- Clear lineage: which source records produced which AI output
- Source data accessible for re-processing if model is updated

### 2. Patient Privacy

- De-identification before AI processing (HIPAA Safe Harbor or Expert Determination)
- No re-identification risk in AI outputs (check for small cohort leakage)
- Cross-border data transfer rules (GDPR Article 49 if EU data involved)
- Consent tracking: which patients consented to AI-based analysis

### 3. Bias and Fairness in Clinical AI

- Document patient demographics in training data
- Assess model performance across demographic subgroups
- Report any differential performance (e.g., lower accuracy for underrepresented groups)
- Regulatory requirement: FDA guidance on AI/ML in drug development requires bias assessment

### 4. Reproducibility

- AI analyses supporting regulatory submissions MUST be reproducible
- Pin: model version, inference parameters, input data snapshot, code version
- Provide a "rerun package" that produces identical results from archived inputs
- Document random seeds and sampling strategies

### 5. 21 CFR Part 11 Compliance (US FDA)

For AI systems producing electronic records used in regulatory submissions:
- Electronic signatures with two-factor authentication
- System access controls (role-based, unique user IDs)
- Audit trail (who, what, when, why for every change)
- Validation documentation per GAMP 5

## AWS Patterns for Clinical Data

| Requirement | AWS Pattern |
|-------------|-------------|
| De-identification | Amazon Comprehend Medical (PHI detection) + custom redaction |
| Data lineage | AWS Glue Data Catalog + Lake Formation |
| Immutable storage | S3 Object Lock (compliance mode, governance mode) |
| Reproducibility | CodeCommit/GitHub + S3 versioning + ECR (container pinning) |
| Electronic signatures | Cognito + custom signature workflow with MFA |
| Cross-border compliance | Regional S3 buckets + data residency controls |
