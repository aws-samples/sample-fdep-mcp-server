---
id: industrial-ai-safety
description: "Safety requirements for AI systems controlling or monitoring industrial processes"
inclusion: always
priority: 90
---

# Industrial AI Safety

Reference: [AWS Well-Architected Modern Industrial Data Lens](https://docs.aws.amazon.com/wellarchitected/latest/modern-industrial-data-technology-lens/modern-industrial-data-technology-lens.html)

## Context

AI in manufacturing operates at the IT/OT (Information Technology / Operational Technology) boundary. Failures can cause physical harm, equipment damage, or production loss.

## Rules

### 1. Safety Classification
Every AI system must be classified by physical safety impact:
- **Safety-critical** — AI output directly controls actuators, valves, or robots (e.g., predictive maintenance triggering shutdown)
- **Safety-relevant** — AI informs human decisions about physical processes (e.g., quality prediction, anomaly detection)
- **Non-safety** — AI handles business processes only (e.g., demand forecasting, scheduling)

### 2. Human-in-the-Loop for Safety-Critical
- Safety-critical AI MUST have human confirmation before physical action
- Exception: emergency shutdown (can be autonomous with immediate notification)
- Response time SLA: human must confirm within defined window or system defaults to safe state

### 3. IT/OT Boundary Security
- AI systems MUST NOT have direct write access to OT networks from IT networks
- Use a DMZ architecture: IT → DMZ → OT (unidirectional where possible)
- Model inference can run in IT; actuation commands must pass through safety PLC

### 4. Data Quality for Industrial AI
- Sensor data must have quality metadata (accuracy, calibration date, drift status)
- AI models trained on sensor data must document sensor health at training time
- Alert if input sensor data quality degrades below training-time quality

### 5. Explainability for Process Decisions
- Operators must understand WHY the AI recommended an action
- No black-box decisions for process changes (use explainable models or provide evidence chain)
- Audit trail: every AI recommendation → operator decision → outcome

## AWS Patterns

| Requirement | AWS Service |
|-------------|-------------|
| IT/OT boundary | IoT SiteWise + Greengrass (edge) |
| Time-series data | Timestream + IoT SiteWise |
| Anomaly detection | Lookout for Equipment |
| Edge inference | SageMaker Edge + Greengrass ML |
| Data quality monitoring | Glue Data Quality |
| Unidirectional gateway | Network Firewall + VPC isolation |
