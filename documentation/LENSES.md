# Industry Lenses

Lenses are industry-specific overlays that activate automatically when the customer's `industry` field matches. They add specialized steering, skills, and exit criteria to active programs without modifying the base programs.

## How Lenses Work

1. Customer sets `industry: "financial-services"` in their intention
2. The resolver activates `financial-services-lens` (weight 100)
3. The lens **overlays** onto active programs — adding steering files and exit criteria
4. Programs gain industry-specific guidance alongside their base content

Lenses never remove program content. They only add (`addSteering`, `addSkills`, `addExitCriteria`) or override exit criteria (`overrideExitCriteria`).

---

## Available Lenses

### Financial Services Lens

**ID:** `financial-services-lens` | **Activates for:** `industry: "financial-services"`

Adds regulated financial services guidance to active programs.

| Overlays onto | What it adds |
|---------------|-------------|
| `responsible-ai` | PCI-DSS steering, SOX model risk, regulatory reporting, model risk governance (SR 11-7), separation of duties |
| `ai-operations` | Audit trail setup skill |

**Exit criteria added:** SR 11-7 aligned model risk governance document must be produced.

**Reference:** [AWS Well-Architected Financial Services Lens](https://docs.aws.amazon.com/wellarchitected/latest/financial-services-industry-lens/welcome.html)

---

### Healthcare Lens

**ID:** `healthcare-lens` | **Activates for:** `industry: "healthcare"`

Adds patient data protection and medical device guidance.

| Overlays onto | What it adds |
|---------------|-------------|
| `responsible-ai` | HIPAA PHI handling steering, Software as Medical Device (SaMD) guidance |
| `ai-operations` | PHI access logging skill |

**Reference:** [AWS Well-Architected Healthcare Lens](https://docs.aws.amazon.com/wellarchitected/latest/healthcare-industry-lens/healthcare-industry-lens.html)

---

### Life Sciences Lens

**ID:** `life-sciences-lens` | **Activates for:** `industry: "life-sciences"`

Adds GxP compliance, clinical data integrity, and computerized system validation guidance for pharma/biotech.

| Overlays onto | What it adds |
|---------------|-------------|
| `responsible-ai` | GxP compliance steering (ALCOA+, change control, audit trail), clinical data integrity (de-identification, reproducibility, 21 CFR Part 11) |
| `ai-operations` | Validation lifecycle steering (GAMP 5 aligned IQ/OQ/PQ), computerized system validation skill (`/validate-ai-system`) |

**Exit criteria added:** GxP compliance review must be completed for AI systems in drug development or manufacturing.

**Reference:** [AWS Well-Architected Life Sciences Lens](https://docs.aws.amazon.com/wellarchitected/latest/life-sciences-lens/life-sciences-lens.html)

---

### Games Industry Lens

**ID:** `games-industry-lens` | **Activates for:** `industry: "entertainment"`

Adds player safety and live operations resilience for gaming/entertainment.

| Overlays onto | What it adds |
|---------------|-------------|
| `responsible-ai` | Player safety steering (content moderation, minor protection, fair play) |
| `resilience` | Live-ops resilience steering (latency budgets, zero-downtime deployment, graceful degradation for live environments) |

**Reference:** [AWS Well-Architected Games Industry Lens](https://docs.aws.amazon.com/wellarchitected/latest/games-industry-lens/games-industry-lens.html)

---

### Manufacturing Lens

**ID:** `manufacturing-lens` | **Activates for:** `industry: "manufacturing"`

Adds industrial AI safety and data governance for manufacturing/OT environments.

| Overlays onto | What it adds |
|---------------|-------------|
| `responsible-ai` | Industrial AI safety steering (IT/OT boundary, safety classification, explainability for operators) |
| `ai-operations` | Industrial data governance steering (sensor data ownership, edge vs cloud, ISA-95 hierarchy) |

**Reference:** [AWS Well-Architected Modern Industrial Data Lens](https://docs.aws.amazon.com/wellarchitected/latest/modern-industrial-data-technology-lens/modern-industrial-data-technology-lens.html)

---

### Public Sector Lens

**ID:** `public-sector-lens` | **Activates for:** `industry: "public-sector"`

Adds digital sovereignty, citizen transparency, and data residency for government.

| Overlays onto | What it adds |
|---------------|-------------|
| `responsible-ai` | Digital sovereignty steering (data residency, sovereign key management, supply chain control), citizen AI transparency (disclosure, explainability, right to human review, bias monitoring) |
| `ai-operations` | Data residency steering (regional enforcement, model availability constraints, sovereign DR) |

**Reference:** [AWS Digital Sovereignty Well-Architected Lens](https://aws.amazon.com/blogs/architecture/announcing-the-aws-digital-sovereignty-well-architected-lens/)

---

## Adding a New Lens

1. Create a directory under `lenses/<id>/`
2. Add `lens.yaml` with:
   - `industry` — which intention industry value triggers it
   - `activation` — rules (typically `industry === '<value>'`)
   - `overlays` — which programs to augment and what to add
3. Add steering files under `steering/`
4. Add skills under `skills/` (if needed)

See the [Adding a Program](ADD-A-PROGRAM.md) guide for the overlay schema details.

---

## Industry Values in the Intention Schema

| Industry | Lens activated |
|----------|---------------|
| `financial-services` | financial-services-lens |
| `healthcare` | healthcare-lens |
| `life-sciences` | life-sciences-lens |
| `entertainment` | games-industry-lens |
| `public-sector` | public-sector-lens |
| `retail` | *(none yet)* |
| `manufacturing` | manufacturing-lens |
| `other` | *(none)* |
