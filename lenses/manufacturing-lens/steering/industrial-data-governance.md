---
id: industrial-data-governance
description: "Data governance for manufacturing AI — sensor data, process data, and quality records"
inclusion: always
priority: 80
---

# Industrial Data Governance for AI

Reference: [AWS Well-Architected Modern Industrial Data Lens](https://docs.aws.amazon.com/wellarchitected/latest/modern-industrial-data-technology-lens/modern-industrial-data-technology-lens.html)

## Rules

### 1. Data Ownership and Lineage
- Every data source (sensor, PLC, SCADA, MES, ERP) must have a named data owner
- Data lineage: from physical sensor → edge processing → cloud storage → AI model → output
- Document transformations at each stage (aggregation, cleaning, feature engineering)

### 2. Data Retention for Manufacturing
- Quality records: retain per industry regulation (e.g., 7 years automotive, 15 years pharma/medical devices)
- Process data: minimum 2 years for model retraining and root cause analysis
- Real-time data: aggregate after 30 days (raw → hourly → daily → monthly)

### 3. Edge vs Cloud Processing
- Latency-sensitive decisions (< 100ms): process at edge (Greengrass)
- Batch analytics and model training: process in cloud
- Hybrid: edge inference with cloud model updates

### 4. Data Integration Across Sites
- Standardize data models across plants (unified namespace)
- ISA-95 hierarchy: Enterprise → Site → Area → Line → Cell
- OPC-UA for machine connectivity standardization

## AWS Architecture Pattern

```
Plant Floor (OT)          Edge (DMZ)              Cloud (IT)
─────────────────    ─────────────────    ─────────────────
Sensors/PLCs     →   Greengrass ML     →   SiteWise / Timestream
SCADA/MES        →   IoT Core          →   S3 Data Lake
Quality systems  →   Edge inference     →   SageMaker training
                     Local dashboards       Lookout for Equipment
                                           QuickSight analytics
```
