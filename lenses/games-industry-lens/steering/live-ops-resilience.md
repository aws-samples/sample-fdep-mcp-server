---
id: live-ops-resilience
description: "Resilience patterns for AI systems in live gaming environments with zero-downtime requirements"
inclusion: always
priority: 80
---

# Live Operations Resilience for AI in Gaming

Reference: [AWS Well-Architected Games Industry Lens](https://docs.aws.amazon.com/wellarchitected/latest/games-industry-lens/games-industry-lens.html)

## Context

Gaming AI systems operate under unique constraints:
- 24/7 live environments with global player bases across time zones
- Zero-tolerance for AI failures during live events (revenue impact in minutes)
- Massive scale spikes during launches, events, and seasonal peaks
- Player experience directly tied to AI response latency (< 200ms for gameplay-affecting AI)

## Rules

### 1. Latency Budgets
- Gameplay-affecting AI (NPC behaviour, matchmaking): < 200ms p99
- Non-gameplay AI (recommendations, chat moderation): < 2s p99
- Generative AI (dialogue, content creation): < 5s with streaming

### 2. Scaling Patterns
- Pre-scale 2 hours before known events (launches, tournaments, seasonal)
- Auto-scale based on concurrent player count, not request rate
- Cold start mitigation: provisioned concurrency for player-facing Lambda

### 3. Degradation Strategy
- AI failure MUST NOT crash the game session
- Fallback: deterministic/scripted behaviour when AI is unavailable
- Players must not notice the switch (graceful, not error-message)

### 4. Deployment Safety
- No AI model deployments during live events or peak hours
- Blue/green deployment for AI endpoints with instant rollback
- Canary: 1% of players → 10% → 50% → 100% over 4 hours minimum
