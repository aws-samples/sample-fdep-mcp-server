# ⬡ Cross-Cutting — Industry Verticals

## Purpose

Pre-built industry agents, templates, and compliance patterns that span all layers. When building for a specific industry, start here to leverage existing domain-specific accelerators.

## Coverage: 80% (Strong — most major verticals have samples)

## Verticals

### 1. 🏥 Healthcare & Life Sciences

**Coverage:** ✅ Both (Accel #32 + Agentic #16)

| Resource | Link |
|----------|------|
| Bedrock Agents Healthcare | https://github.com/aws-samples/amazon-bedrock-agents-healthcare-lifesciences |
| Comprehend Medical FHIR | https://github.com/aws-samples/amazon-comprehend-medical-fhir-integration |

**Key considerations:**
- HIPAA compliance required
- PHI (Protected Health Information) handling
- FHIR data standards
- Clinical decision support guardrails
- Audit trails for all patient data access

### 2. 🏦 Financial Services

**Coverage:** ✅ Both (Accel #33 + Agentic #74, #75)

| Resource | Link |
|----------|------|
| Fraud Detector Samples | https://github.com/aws-samples/aws-fraud-detector-samples |
| Regulatory Compliance Multi-Agent | Agentic Catalog #74 |
| FinServ Patterns | Agentic Catalog #75 |

**Key considerations:**
- SOX, PCI-DSS, GDPR compliance
- Transaction monitoring and fraud detection
- Regulatory reporting automation
- Data residency requirements
- Model explainability for credit decisions

### 3. 📋 Insurance

**Coverage:** 🟢 Agentic #76

| Resource | Link |
|----------|------|
| Insurance Claims Agent | https://aws.amazon.com/solutions/guidance/automating-insurance-claims/ |
| Insurance Claim Lifecycle (Bedrock) | https://github.com/aws-samples/amazon-bedrock-samples/tree/main/agents-and-function-calling/bedrock-agents/use-case-examples/insurance-claim-lifecycle-automation |
| Benefits Claims Processing (BDA) | https://github.com/aws-samples/sample-accelerate-benefits-claims-processing-with-amazon-bedrock-data-automation |
| Omnichannel Claims Processing | https://github.com/aws-solutions-library-samples/guidance-for-omnichannel-claims-processing-powered-by-generative-ai-on-aws |
| Serverless EDA Insurance Claims | https://github.com/aws-samples/serverless-eda-insurance-claims-processing |

**Key considerations:**
- State-specific regulatory compliance
- Claims fraud detection patterns
- Document processing (medical records, police reports, receipts)
- Human-in-the-loop for high-value claims

**Deep-dive reference material in this engagement:**

- `industry-insurance-claims-overview.md` — capability map, decision matrix, agent tools design (`create_claim`, `lookup_policy`, `extract_document`, `assess_damage`, `validate_claim`, `send_notification`), system prompt, gotchas (10 production-critical pitfalls), security checklist
- `industry-insurance-claims-architecture.md` — four claims architecture patterns (Strands on AgentCore, Bedrock Agents with action groups, omnichannel pipeline, BDA for benefits) with diagrams and pattern selection matrix
- `industry-insurance-claims-strands.md` — full implementation: agent entrypoint, six tool modules (claims, policy, documents, notifications), `requirements.txt`, IAM role, local testing recipes
- `industry-insurance-claims-samples.md` — catalog of 7 AWS sample repos and 3 AWS blog posts covering claims with Bedrock
- Multi-channel intake (web, phone, email, chat)

### 4. 🛒 Retail & E-Commerce

**Coverage:** ✅ Both (Accel #34 + Agentic #78)

| Resource | Link |
|----------|------|
| Multi-Agent Personalization | https://aws.amazon.com/solutions/guidance/multi-agent-personalization/ |

**Key considerations:**
- Product recommendation agents
- Customer service automation
- Inventory and supply chain optimization
- Personalization at scale
- Multi-language support

### 5. 🏭 Manufacturing & Automotive

**Coverage:** ✅ Both (Accel #35 + Agentic #15, #83)

| Resource | Link |
|----------|------|
| Manufacturing Automotive AI Toolkit | https://github.com/aws-samples/sample-manufacturing-automotive-ai-toolkit |

**Key considerations:**
- IoT data integration
- Predictive maintenance
- Quality control automation
- Supply chain optimization
- Safety compliance documentation

### 6. ⚡ Energy & Utilities

**Coverage:** ✅ Both (Accel #37 + Agentic #12, #84)

| Resource | Link |
|----------|------|
| Water Utility Agent | https://aws.amazon.com/blogs/industries/autonomous-water-utility-agent/ |
| Generator Interconnection | Agentic Catalog #84 |

**Key considerations:**
- SCADA/OT system integration
- Regulatory compliance (NERC, FERC)
- Grid optimization
- Customer service automation
- Outage management

### 7. 📱 Telecom

**Coverage:** 🟢 Agentic #11, #85

| Resource | Link |
|----------|------|
| Telco Network Ops Multi-Agent | https://github.com/aws-samples/sample-multi-agent-collaboration-using-bedrock-for-telco-network-ops |

**Key considerations:**
- Network operations automation
- Customer service (billing, plan changes)
- Fault detection and resolution
- 5G/edge computing integration

### 8. ⚖ Legal

**Coverage:** 🟢 Agentic #77

| Resource | Link |
|----------|------|
| eDiscovery Agent | Agentic Catalog #77 |

**Key considerations:**
- Document review automation
- Contract analysis
- Privilege detection
- Regulatory compliance research
- Citation accuracy (hallucination prevention critical)

### 9. 🏛 Public Sector

**Coverage:** 🟠 Partial (Accel #36 + Agentic #17)

| Resource | Link |
|----------|------|
| Power Consumption Agent | Agentic Catalog #17 |

**Key considerations:**
- GovCloud deployment requirements
- FedRAMP compliance
- Data sovereignty
- Accessibility (Section 508)
- Citizen service automation

## How to Use Industry Verticals

1. **Check if your industry has a pre-built sample** — Start from existing code, not scratch
2. **Identify compliance requirements** — Each industry has specific regulations
3. **Layer industry patterns on top of core FDE layers** — The vertical doesn't replace layers; it adds domain-specific configuration
4. **Use industry-specific guardrails** — Denied topics, required disclaimers, compliance language

## Industry-Specific Guardrail Examples

```python
# Healthcare
topics_config=[
    {"name": "MedicalAdvice", "definition": "Providing specific medical diagnoses or treatment recommendations", "type": "DENY"},
    {"name": "DrugPrescription", "definition": "Recommending specific medications or dosages", "type": "DENY"},
]

# Financial Services
topics_config=[
    {"name": "InvestmentAdvice", "definition": "Providing specific investment recommendations or guarantees", "type": "DENY"},
    {"name": "CreditDecision", "definition": "Making final credit approval or denial decisions without human review", "type": "DENY"},
]

# Insurance
topics_config=[
    {"name": "CoverageGuarantee", "definition": "Guaranteeing coverage or claim approval before review", "type": "DENY"},
    {"name": "LegalAdvice", "definition": "Providing legal counsel about claim disputes", "type": "DENY"},
]
```

## Build Checklist

- [ ] Identify industry vertical and applicable regulations
- [ ] Check for pre-built samples/accelerators
- [ ] Define industry-specific guardrails (denied topics, required disclaimers)
- [ ] Identify compliance requirements (HIPAA, PCI-DSS, SOX, etc.)
- [ ] Plan data handling for industry-specific sensitive data
- [ ] Set up audit trails meeting regulatory requirements
- [ ] Document compliance posture and controls
