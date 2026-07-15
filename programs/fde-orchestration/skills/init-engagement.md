---
id: init-engagement
name: "Initialize Engagement"
description: "Creates a new customer engagement — prompts for customer name, industry, goals, and AIM scores, then uses MCP tools (load_intention → resolve → render) to scaffold the engagement with activated programs rendered to the chosen targets."
trigger:
  kind: command
  phrase: "/init"
inputs:
  - name: customer
    type: string
    required: true
    prompt: "Customer name (kebab-case, e.g. acme-corp)?"
  - name: industry
    type: string
    required: true
    prompt: "Customer industry (e.g. financial-services, healthcare, media, retail, manufacturing)?"
  - name: goals
    type: string
    required: true
    prompt: "Goals — comma-separated (e.g. build, aidlc, responsible-ai, gen-ai-rollout, resilience)?"
  - name: regulated
    type: boolean
    required: false
    prompt: "Is the customer in a regulated environment (true/false)?"
  - name: aimTierEstimate
    type: number
    required: true
    prompt: "Estimated current AIM tier (1–5)? 1=ad-hoc, 5=optimized"
  - name: targets
    type: string
    required: false
outputs:
  - name: steering
    path: .kiro/steering/
    kind: directory
  - name: skills
    path: .kiro/skills/
    kind: directory
  - name: state
    path: state/
    kind: directory
---

## Objective

Create a new customer engagement by collecting intake answers and running the MCP tool workflow: `fde_load_intention` → `fde_resolve` → `fde_render`. This activates the right programs based on the customer's goals and AIM scores, and renders all steering, skills, and references into the user's workspace.

## Procedure

1. **Collect inputs.** Gather the required fields from the FDE:
   - `customer` — kebab-case name (e.g. `meridian-bank`)
   - `industry` — sector (e.g. `financial-services`, `healthcare`)
   - `goals` — comma-separated list that drives program activation
   - `regulated` — true/false (drives responsible-ai activation)
   - `aimTierEstimate` — current AI maturity (1–5)
   - `targets` — which IDE/platform to render for (default: `kiro`)

2. **Load the intention.** Call `fde_load_intention`:
   ```json
   {
     "schemaVersion": "1",
     "customer": "<customer>",
     "industry": "<industry>",
     "regulated": true,
     "goals": ["build", "aidlc"],
     "aim": { "overall": <aimTierEstimate> },
     "updatedAt": "<ISO timestamp>"
   }
   ```
   This returns an `intentionId` handle.

3. **Resolve.** Call `fde_resolve` with the `intentionId`. This evaluates activation predicates and returns:
   - Which programs activated (and why)
   - Any lens overlays applied (e.g. healthcare-lens, financial-services-lens)

4. **Render.** Call `fde_render` with:
   - `intentionId` — from step 2
   - `targets` — array of platform targets (e.g. `["kiro"]`)

   This returns all files (steering, skills, references, spec, state) as a bulk payload. Write every file to the workspace.

5. **Report the result.** Show the FDE:
   - Which programs activated
   - How many files were rendered
   - Any lens overlays applied
   - What skills are now available (e.g. `/build-app`, `/aidlc-install`, `/run-rai-review`)

## Goals → Program Activation Reference

| Goal value | Programs activated |
|---|---|
| `build` | ai-native-app-builder |
| `aidlc` | aws-aidlc |
| `responsible-ai` | responsible-ai |
| `gen-ai-rollout` | aim, agentpath, ai-operations |
| `resilience` | resilience |

Multiple goals can be combined (e.g. `["build", "aidlc", "responsible-ai"]`) to activate multiple programs simultaneously.

Regulated customers (`regulated: true`) always activate `responsible-ai` regardless of goals.

## AIM Tier Guide

| Tier | Meaning | Typical state |
|---|---|---|
| 1 | Ad-hoc | No AI strategy, experimentation only |
| 2 | Emerging | Some AI use cases, no governance |
| 3 | Defined | AI strategy exists, some operational practices |
| 4 | Managed | AI integrated into operations, measured |
| 5 | Optimized | AI-native, continuous improvement |

## Targets Reference

| Target | Platform | Output dir |
|---|---|---|
| `kiro` | Kiro IDE | `.kiro/` |
| `claude` | Claude Code | `.claude/` |
| `cursor` | Cursor | `.cursor/` |
| `copilot` | GitHub Copilot | `.github/` |
| `codex` | OpenAI Codex | root |
| `cline` | Cline | `.clinerules/` |
| `continue` | Continue | `.continue/` |
| `aider` | Aider | `.aider/` |
| `windsurf` | Windsurf | `.windsurf/` |
| `zed` | Zed | `.zed/` |
| `chatgpt-custom-gpt` | ChatGPT Custom GPT | `.chatgpt/` |
| `gemini-code-assist` | Gemini Code Assist | `.gemini/` |
| `mcp` | MCP Server (no files) | — |

## Example

```
# FDE says: "/init"
# Agent asks for inputs, then calls MCP tools:

1. fde_load_intention({
     schemaVersion: "1",
     customer: "acme-partner",
     industry: "financial-services",
     regulated: true,
     goals: ["build", "aidlc", "responsible-ai"],
     aim: { overall: 2 },
     updatedAt: "2026-07-07T10:00:00Z"
   })
   → { intentionId: "abc-123", status: "loaded" }

2. fde_resolve({ intentionId: "abc-123" })
   → { activatedPrograms: [...], lensOverlays: ["financial-services-lens"] }

3. fde_render({ intentionId: "abc-123", targets: ["kiro"] })
   → { files: [...], count: 47, activatedPrograms: [...] }

4. Agent writes all 47 files to workspace.
```

## Done when

- All rendered files are written to the workspace
- `state/intention.json` and `state/resolution.json` exist
- `.kiro/specs/<customer>/engagement.md` exists
- FDE has been shown which programs activated and what skills are now available

## Anti-patterns

- Creating an engagement without goals — the resolver needs goals to activate programs
- Skipping the AIM tier — it influences which assessment and roadmap skills are relevant
- Calling render without resolve — resolve determines which programs are active
- Using the CLI (`ace init`) instead of MCP tools — the MCP approach is the primary workflow
