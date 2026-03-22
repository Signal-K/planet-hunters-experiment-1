---
title: Contractor Mission Generation
createdAt: '2026-03-17T06:44:38.524Z'
updatedAt: '2026-03-17T06:45:36.164Z'
description: >-
  Architecture for hybrid procedural + AI contractor mission generation from
  reusable templates
tags:
  - spec
  - contractors
  - mission-generation
  - ai
  - game-design
---
# Contractor Mission Generation

**Status:** Active — spec ready for implementation
**Last updated:** 2026-03-17

---

## Approach
Hybrid: **procedural template assembly** (option b) + **AI text generation** (option c).

Goal: maximum mission variety with minimal codebase footprint.

---

## Template Structure

Each mission is assembled from these components:

| Component | Type | Notes |
|-----------|------|-------|
| `mission_type` | enum | `resource_collection`, `target_scouting`, `infrastructure` |
| `mineral` | variable | From mineral taxonomy (early: 6–8 types) |
| `quantity` | calculated | Based on rocket cargo capacity at player level |
| `location` | **always variable** | Injected from live TESS/asteroid feed — never hardcoded |
| `narrative_tone` | enum | `urgent`, `curious`, `routine`, `high_stakes` |
| `payout_tier` | calculated | Based on mineral rarity + contractor affinity |
| `reward_type` | enum | `francs`, `francs+xp`, `francs+affinity_boost` |

---

## Generation Flow

1. **Template selected** — pick mission_type + narrative_tone from contractor's allowed range.
2. **Variables injected** — mineral + quantity calculated from player level; location pulled from live feed.
3. **AI text generated** — Claude API generates the mission title, description, and contractor dialogue from the template scaffold. Single short prompt, no large context needed.
4. **Payout calculated** — based on mineral rarity × quantity × contractor affinity multiplier.
5. **Mission surfaced** — appears on contractor job board.

---

## Variety Targets
- No mission text repeat within 5 consecutive missions per contractor.
- Each contractor has a defined project narrative that influences tone and mineral preferences.
- Location is always unique (TESS data provides effectively unlimited variety).

---

## Contractor Project Narratives
- Each contractor has a fixed project type (e.g. "deep-space relay assembly", "research station build-out").
- Project phase advances as missions are completed — contractor dialogue reflects progress.
- Milestone missions (every ~5 deliveries) trigger a "project update" narrative moment.

---

## AI Integration Notes
- Use Claude API (Haiku tier for cost efficiency).
- Prompt: template scaffold → short paragraph mission briefing + one-liner contractor quote.
- Keep context minimal: contractor persona + mission variables only.
- Cache generated text per mission instance (don't regenerate on re-view).

---

## Related Docs
- @doc/game-design/contractor-system
- @doc/game-design/economy-and-minerals
