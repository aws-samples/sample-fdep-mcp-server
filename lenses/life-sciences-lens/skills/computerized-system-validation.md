---
id: computerized-system-validation
name: "Computerized System Validation (CSV) for AI"
description: "Produce validation documentation for an AI system operating in a GxP environment. Covers risk assessment, IQ/OQ/PQ, and ongoing validation plan."
trigger:
  kind: command
  phrase: "/validate-ai-system"
outputs:
  - name: validation-plan
    path: artifacts/life-sciences/csv-validation-{timestamp}.md
    kind: document
---

## Objective

Produce computer system validation (CSV) documentation for an AI/ML system operating in a GxP-regulated life sciences environment. The output enables Quality Assurance to approve the system for GxP use.

## Procedure

1. **Identify the system.** Name the AI system, its intended use, and which GxP activity it supports (GLP, GCP, GMP, GVP).

2. **Risk classify** per GAMP 5:
   - Category and impact level (High/Medium/Low)
   - Justification for classification

3. **Produce validation deliverables:**
   - Validation Master Plan (scope, strategy, acceptance criteria)
   - Design Qualification (architecture, data flows, supplier assessment)
   - IQ protocol (infrastructure verification test cases)
   - OQ protocol (functional test cases)
   - PQ protocol (performance test cases with acceptance thresholds)
   - Traceability matrix (requirement → test case → result)

4. **Define ongoing validation:**
   - Model drift monitoring approach
   - Re-validation triggers (data change, model update, performance drop)
   - Periodic review schedule
   - Change control integration

5. **Document regulatory mapping:**
   - 21 CFR Part 11 (if US FDA)
   - EU Annex 11 (if EMA)
   - ICH guidelines (if applicable)

## Done when

- Validation documentation package exists at the documented path
- Risk classification is justified and approved by QA
- IQ/OQ/PQ protocols have defined acceptance criteria
- Ongoing validation plan specifies drift monitoring and re-validation triggers
- Quality Assurance has reviewed and approved the validation strategy

## Handoff

Once validation documentation is approved:
- `ai-native-app-builder` implements the monitoring and logging infrastructure (CloudTrail, S3 Object Lock, audit trail)
- `ai-operations` includes the system in the AI Operating Manual with GxP-specific SLAs
- The validation evidence becomes a regulatory submission artifact
