---
id: orchestration-contract
description: "FDE orchestration contract defining how programs compose and agents spawn"
inclusion: auto
match: "artifacts/orchestration/**"
priority: 50
---

# FDE Orchestration Contract

 FDE is the meta-layer that ties all programs together. This document describes the orchestration contract — how programs are composed, how agents are spawned, and how the intention drives routing.

## Signal sources

FDE draws from:
- **AIM assessment** (primary — self-scored capability baseline)
- **Intention file** (structured customer state: industry, goals, cloud posture, team shape)
- **Engagement history** (prior decisions, stage transitions, artifact completions)
- **Lens overlays** (industry-specific augmentations applied by the resolver)
- **Partner feedback** (SI and ISV signals where available)

## How programs compose

Each program declares:
- **When it activates** (applicability rules evaluated against engagement state)
- **What it depends on** (prerequisites — e.g., AgentPath requires AIM Platform — 2)
- **What it pairs with** (programs typically delivered alongside)
- **What artifacts it produces** (stored under `engagements/<customer>/artifacts/<program>/`)

The pipeline planner composes active programs deterministically per engagement. Two FDEs hitting the same intake get the same pipeline.

## How agents are spawned

FDE does **not** ship a fixed roster of agents. An engagement-specific agent topology is spawned from the active programs:

- Each active program declares the agent capabilities it needs (a resilience reviewer, a governance reviewer, an adoption analyst).
- The runtime instantiates agents on demand when the skill fires.
- When the engagement closes (or moves to the next stage), short-lived agents terminate.
- Long-lived agents (e.g., the AI BOM governance agent for a customer post-engagement) are declared explicitly by the program.

This keeps the agent population bounded (no idle agents) and extensible (new programs bring new agents, no central registry change).

## How this program differs from the FDE toolkit itself

**FDE Toolkit** = the git repo, the CLI, the loader, the planner, the renderer, the adapters. A thing you clone.

**FDE Orchestration Layer** (this program) = the program catalog entry that documents how everything composes at runtime. A thing you read to understand what the toolkit does on your behalf.
