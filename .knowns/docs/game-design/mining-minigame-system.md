---
title: Mining Minigame System
createdAt: '2026-02-24T12:12:16.169Z'
updatedAt: '2026-03-19T03:17:59.445Z'
description: Documentation for the interactive mining minigame mechanics
tags:
  - gameplay
  - mining
  - mechanics
---
# Mining Minigame System

## Overview

The mining minigame is an interactive, timing-based mechanic inspired by Dredge's fishing system. Players must time button presses to align a rotating indicator with stable zones on asteroids/planets.

## Core Mechanics

### Visual Components
- **Stability Ring**: Gray circular ring showing the mining area
- **Rotating Indicator**: White arrow that spins around the ring
- **Stable Zones**: Green arc segments where successful mining occurs
- **Drill Visual**: Line showing mining depth progress
- **Progress Bar**: Shows hits required to complete mining

### Gameplay Loop
1. Player presses Mine button on asteroid preview
2. Minigame overlay appears with rotating indicator
3. Player presses SPACE when indicator aligns with green zones
4. Successful hits fill progress bar
5. Complete required hits to finish mining
6. 3 misses = failure, no resources collected

### Timing Windows
- **Perfect Hit**: Within 0.08 radians of zone center (90-100% quality)
- **Good Hit**: Within 0.15 radians of zone center (70-90% quality)
- **Miss**: Outside timing windows

## Difficulty Scaling

Mining difficulty scales with asteroid/planet level:

| Level | Speed Multiplier | Zone Count | Zone Size | Hits Required |
|-------|-----------------|------------|-----------|---------------|
| 1-2   | 1.0x - 1.15x   | 3          | 100%      | 5-6           |
| 3-4   | 1.3x - 1.45x   | 3          | 85%       | 7-8           |
| 5-6   | 1.6x - 1.75x   | 2          | 85%       | 9-10          |
| 7-8   | 1.9x - 2.05x   | 2          | 64%       | 11-12         |
| 9-10  | 2.2x - 2.35x   | 2          | 64%       | 13-14         |

### Difficulty Formula
- **Rotation Speed**: `1.2 * (1.0 + (level - 1) * 0.15)`
- **Required Hits**: `5 + (level - 1)`
- **Zone Count**: 3 for levels 1-4, 2 for levels 5+
- **Zone Size**: Reduced at levels 3+ and 7+

## Reward System

### Success Rate Calculation
```
success_rate = hits / (hits + misses)
```

### Mining Yield Bonus
```
bonus_multiplier = 1.0 + (success_rate * 0.5)
final_yield = base_yield * mining_multiplier * bonus_multiplier
```

### Examples
- Perfect play (5 hits, 0 misses): 1.5x yield
- Good play (5 hits, 2 misses): ~1.36x yield
- Minimum success (5 hits, 2 misses): ~1.36x yield
- Failure (2 hits, 3 misses): 0x yield (no resources)

## Player Feedback

### Visual Feedback
- **Perfect Hit**: Green flash, "PERFECT!" text
- **Good Hit**: Light green flash, "Good" text
- **Miss**: Red flash, "Miss" text
- **Drill Progress**: Line extends toward center as hits accumulate
- **Indicator Flash**: Changes color based on hit quality

### Audio Feedback (Future)
- Success hit sound
- Perfect hit sound (higher pitch)
- Miss sound
- Completion fanfare
- Failure sound

## Integration Points

### AsteroidPreview.gd
- Launches minigame when Mine button pressed
- Passes asteroid level for difficulty scaling
- Receives success_rate on completion
- Applies bonus multiplier to mining yield
- Maintains cooldown timer after minigame

### MiningInventory.gd
- Receives final yield with bonus multiplier
- Tracks collected resources per target
- Updates remaining mass

## Design Philosophy

### Inspired by Dredge
- **Timing-based**: Requires player skill and attention
- **Visual clarity**: Clear indicators and feedback
- **Progressive challenge**: Difficulty scales with progression
- **Rewarding mastery**: Better timing = better rewards
- **Forgiving failure**: Can retry after cooldown

### Differences from Dredge
- **Single rotating element**: Simpler than multi-lane system
- **Fixed zones**: Zones don't rotate (easier to learn)
- **Bonus system**: Rewards skill with yield multipliers
- **Failure state**: 3 misses ends minigame (adds tension)

## Future Enhancements

### Potential Additions
- **Asteroid composition effects**: Different minerals affect zone patterns
- **Equipment upgrades**: Slower rotation, larger zones, more misses allowed
- **Special events**: Rare "jackpot" zones for bonus resources
- **Combo system**: Consecutive perfect hits increase multiplier
- **Visual variety**: Different ring styles for planets vs asteroids
- **Haptic feedback**: Controller rumble on hits/misses
- **Accessibility options**: Slower speeds, larger zones, auto-complete

### Balance Considerations
- Monitor player success rates across difficulty levels
- Adjust timing windows if too difficult/easy
- Consider reducing miss limit for higher levels
- Add practice mode for new players



---

## Design Clarification (2026-03-16)

### Active vs. Passive
- Mining is an **active minigame**, not passive. Players must be present.
- Multiple rockets can be on simultaneous missions, but each target requires its own active mining session.

### Implementation
- The active mining implementation is a **side-scrolling minigame** (see `SidescrollMining.gd`).
- The ring-based rotating indicator system documented above is a legacy design reference.

### Laser & Resource Access
- Mining laser level determines access to material tiers, not just speed.
- Stronger laser → deeper extraction + harder/rarer materials unlocked.
- A "depleted" target at laser level N can be mined again at laser level N+1.

### Failure States
- Tutorial: failure message → restart.
- Post-tutorial: partial salvage available → restart option with penalty.

### Session Duration
- Laser charge and fuel limits bound how long mining can continue per visit.
- Cargo Bay capacity limits total haul weight (see @doc/game-design/rocket-and-room-system).

## Design Review Round 2 — 2026-03-17

### Planet vs Asteroid Differentiation
- Planets should have **different mineral types and quantities** vs. asteroids — not just a longer asteroid.
- Planets have 5–20× more capacity; the mining *experience* should feel proportionally different.
- Exact mechanical differences (zone pattern, laser behaviour, multi-session) to be specced when planet mining is implemented.

### Variety Mechanics — Planned
To address minigame repetition after many sessions:
- **Different zone shapes per mineral type** — silicon vs. iron vs. platinum have distinct zone patterns.
- **Variable laser ranges** — some minerals require precision at different depth bands.
- **Environmental disruptions** — solar flares or other events alter zone stability mid-session.
- **Puzzle elements** — light "figure out the pattern" moments on higher-tier targets.
- Open to further suggestions; no single mechanism selected yet.

### Target Depletion — Visual Indicator
- When a target's mineral quantity is exhausted **at the current laser level**, a clear visual indicator is shown.
- Indicator should suggest future value (e.g. "Deeper extraction requires Laser L3").
- The first time a player re-mines a previously depleted target with a higher laser = designed as a satisfying "aha" moment.

## Order Clarity UX — 2026-03-19

### Contract Order Highlighting
When a player has an active contractor order during mining, the mineral patches on the surface that match the order are visually highlighted with a **golden tint** (`Color(1.5, 1.25, 0.4)` modulate). This makes it immediately obvious which terrain deposits to target without having to cross-reference the order panel.

- Only surface deposits are highlighted (subsurface order minerals remain at standard dim modulate).
- Once a mineral is collected, it fades to the standard grey collected state regardless of order status.
- The `is_order_target` flag is written onto each region dict after terrain generation, before the first frame is rendered.

### Contract Order Panel
The contract order progress panel (`$UI/ContractOrderPanel`) is visible from the **moment mining begins** — not only after the first collection. This ensures the player always knows what they are working towards, even before they mine anything.

### Signpost
The pre-mining signpost (shown at mission start for ~3.5s) also marks order-target minerals with a `★ (ordered)` suffix in the mineral list.
