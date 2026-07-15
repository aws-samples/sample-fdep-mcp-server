---
id: data-residency
description: "Data residency and cross-border controls for public sector AI operations"
inclusion: always
priority: 90
---

# Data Residency for AI Operations

## Rules

### 1. Regional Enforcement
- AI Operating Manual must specify which AWS region(s) are approved
- All infrastructure (compute, storage, model endpoints) confined to approved regions
- SCP (Service Control Policy) enforcing region restrictions at the Organization level

### 2. Model Selection Constraints
- Only models available in the approved region may be used
- If a model is not available in-region, it CANNOT be used (no cross-region API calls)
- Document model availability by region and update quarterly

### 3. Incident Response with Residency
- Incident investigation must not involve exporting data outside sovereign boundary
- Support cases with AWS: ensure no data leaves region (use metadata-only descriptions)
- Forensic data stays in-region; only sanitized reports may be shared externally

### 4. Backup and DR
- Backup regions must be within the same sovereign boundary
- Cross-region replication only to pre-approved regions
- Test DR failover annually to confirm data stays within boundary
