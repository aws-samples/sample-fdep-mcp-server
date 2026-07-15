---
id: player-safety
description: "Player safety and content moderation for AI-powered gaming experiences"
inclusion: always
priority: 85
---

# Player Safety for AI in Gaming

Reference: [AWS Well-Architected Games Industry Lens](https://docs.aws.amazon.com/wellarchitected/latest/games-industry-lens/games-industry-lens.html)

## Rules

### 1. Content Generation Safety
- AI-generated content (dialogue, quests, items) MUST pass toxicity filters before player exposure
- Player-facing AI (NPCs, assistants) must have strict guardrails against generating harmful, sexual, or violent content beyond the game's age rating
- User-generated content processed by AI must be moderated before broadcast to other players

### 2. Fair Play and Anti-Cheat
- AI systems that affect gameplay balance must be auditable
- Matchmaking AI must not discriminate based on protected characteristics
- AI-driven difficulty adjustment must be transparent (players know it's adaptive)

### 3. Minor Protection
- AI interactions with players under 13 must comply with COPPA
- No collection of personal data through AI conversations without parental consent
- AI must not encourage in-app purchases to minors

### 4. Live Operations Considerations
- AI model updates during live events require staged rollout (canary → regional → global)
- Rollback capability within 5 minutes for any AI behaviour change
- Real-time monitoring of player sentiment after AI changes

## AWS Patterns

| Requirement | AWS Service |
|-------------|-------------|
| Content moderation | Amazon Bedrock Guardrails + Comprehend |
| Real-time monitoring | CloudWatch + GameLift metrics |
| Staged rollout | AppConfig feature flags |
| Player data protection | Cognito + KMS encryption |
