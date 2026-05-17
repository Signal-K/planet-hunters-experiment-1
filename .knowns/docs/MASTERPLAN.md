---
labels:
  - project-landnam
---

# Coral Clicker — Master Plan
_Last updated: 2026-03-15_

---

## What This Game Is

A **relaxed puzzle game** with embedded citizen science. Each level starts with a real Zooniverse reef photograph. The player identifies the coral species present — that identification IS the puzzle goal. Then they replicate that reef composition using fish and environmental controls within a turn limit, earning more coins the fewer turns they use.

No idle mechanics in levels. Offline-first. Mobile-first PWA (Godot → React Native / Next.js).

---

## Core Loop (Single Level)

```
[World Map — position 0 = The Tank, positions 1-10 = levels, linear unlock]
    ↓  select level
[Identify Phase] ← THIS IS THE LEVEL CONFIG, NOT A TUTORIAL
    - Full-screen Zooniverse reef image (zoom/pan enabled)
    - Player tags species from full species list (multi-select; min 1)
    - "I'm not sure" = skip the WHOLE phase (not individual species)
    - Tags saved to Supabase (citizen science); offline queue if no connection
    - Level goal = PRE-CURATED composition from starter_levels.json (NOT player's guess)
    - Player's tags stored for future consensus accuracy scoring (see classification-accuracy.md)
    ↓
[Puzzle Phase — Turns]
    - Starting nutrients + fish (coins spent to add more fish eggs)
    - Auto-breeding fires every ~30-45s real time (never paused — not during results, shop, or transitions)
    - Eggs appear as sprites; player TAPS egg to hatch it, then DRAGS it to a reef zone
    - Fish card selection (tap cards; Feed/Net actions appear as overlay icons on reef viewport)
    - Environment dials (salinity/temp — limited, costs COINS not nutrients; see gp03resources.md)
    - Water conditions always visible as HUD indicator on reef viewport
    - Turn ends when: nutrients hit 0 OR player manually presses End Turn
    - "End Turn" → coral grows/dies → Results Panel (blocks all input until Continue)
    ↓  (repeat)
[Win: reef matches target] → Results Panel → Level End Screen
[Fail: turns exhausted without match] → Results Panel → Fail Screen → Restart
    ↓  win
[Level End Screen]
    - Turns taken vs limit
    - Coins earned (base + speed bonus) — HELD until Supabase sync if offline
    - Zooniverse image vs player reef side-by-side (gallery view of all images seen if replaying)
    ↓
[World Map — level node flips to completed state]
```

---

## Currencies

| Resource | Scope | Used For |
|---|---|---|
| Nutrients | Level-local | Coral growth; adjusting environment |
| Coins | Global | Buy fish eggs in levels; future shop |
| Stars / Crystals | Hidden (v0.3+) | TBD |

---

## Tech Stack

- **Godot 4.5** — game engine + PWA export
- **React Native / Next.js** — shell & routing
- **Supabase** — user accounts, progress, offline queue for classifications
- **Click-a-Coral** — source of reef images and species metadata

---

## Release Plan

### v0.1 — First 10 Levels (current sprint)

| # | Task | File |
|---|---|---|
| 1 | Regenerate sprites at 248×248 (+ card art pass) | `task-sp01sprites248.md` |
| 2 | UI ground-up redesign (mobile-first) | `task-ui01redesign.md` |
| 3 | Identify phase as level gateway (redesign) | `task-ui02identifyphase.md` |
| 4 | Fish card selection system | `task-ui03fishcards.md` |
| 5 | World map home screen (geographically themed) | `task-ui04worldmap.md` |
| 6 | Auto-breeding (timed, tap-to-hatch, drag-to-zone) | `task-gp01autobreed.md` |
| 7 | Turn results panel | `task-gp02turnresults.md` |
| 8 | Resource system simplification | `task-gp03resources.md` |
| 9 | Tutorial mission (Level 0) | `task-tutorial-level0.md` |
| 10 | 10-level content design (difficulty curve) | `task-gp04levels.md` |
| 11 | Offline-first + Supabase classification sync | `task-inf01offline.md` |

### Reference docs

| Doc | Purpose |
|---|---|
| `species-interactions.md` | All kill/aid mappings between species and environment |
| `reef-sites-geography.md` | Geographic location research for each level |
| `task-ui02identifyphase.md` | Classification accuracy architecture (GitHub Action, v0.3) |

### v0.2 — Polish & Hub (sprint starting ~2026-03-29)

- Sound effects (sprint starts 2026-03-22 — see `task-sp02sfx.md`)
- Tank / sandbox hub level (`task-v02tank.md` already specced)
- Star Sailors simple integration: save annotations to shared Supabase
- Push notifications (reef events, tank ready)

### v0.3+ — See `future/GEMINI_FUTURE.md`

---

## Key Design Decisions (settled)

- **Identify phase drives level content** — not a dialog, not skippable, this is how the level is configured
- **Identify phase shows ALL species** — chips not filtered by reef site; player sees everything
- **"I'm not sure"** — skips the WHOLE identify phase (not individual chips)
- **Level target = pre-curated data** — player's classification is citizen science, not puzzle input; puzzle uses starter_levels.json
- **Breeding is automatic** — 30-45s per event, NEVER paused; eggs appear in viewport; player taps to hatch, drags to zone
- **Population cap exceeded** → eggs still hatch but fish die from food shortage (not enough nutrients); breeding does NOT stop
- **Fish management = cards** — tap a card to select; Feed/Net actions are overlay icons on reef viewport, not inside card
- **Species at population 0 = EXTINCT** — card goes grey, no revive
- **Net has a use limit/restrictor** — cannot spam-net; spec in ui03fishcards.md
- **Environment controls** — cost COINS (not nutrients); separate pool because in the real world salinity doesn't affect food supply
- **Water conditions always visible** — HUD indicator on reef viewport at all times
- **Turn end triggers** — nutrients hit 0 OR player presses End Turn manually
- **Results panel blocks input** — no early dismiss; shows BEFORE any win/fail screen
- **Fail = restart** — no soft failure, no partial coins
- **Offline coins held** — rewards NOT given until Supabase sync; no offline indicator shown
- **Mobile-first** — all tap targets ≥ 48dp; portrait primary, landscape + desktop supported
- **Sprites: 248×248px** — separate art pass for card strip (72px) and viewport (90px)
- **Directional sprites** — fish face based on direction; use Godot AnimationPlayer, not GDScript mirroring
- **Palette: brighter sci-fi white + deep ocean blue** — #1C3561 base, #F0F8FF white, #00E5FF cyan, #FFB300 amber
- **World map sites are geographically themed** — based on where those species actually live (see reef-sites-geography.md)
- **Replaying a level** — shows gallery of ALL Zooniverse images the player has seen for that level
- **The Tank = position 0 on world map** — always accessible, always unlocked
- **Level unlock is linear** — complete N to unlock N+1
- **Ambient sound switches per phase** — identify phase / puzzle phase / level end each have distinct ambient audio
- **Backing music track** — deferred to v0.2
- **Sound settings** — only accessible from main settings screen (not in-level)

---

## Open Questions (brainstorm pending)

- **Breeding mini-game:** Is it parent selection only, or a light matching/gene mechanic? → defer to design session before v0.2
- **Coral growth stages:** Pixel-by-pixel vs seed→sprout→branch→bloom vs mixture? → mixture, spec in `task-gp01autobreed.md`
- **Consensus classifications:** Require 3 players to agree before Zooniverse submission? → yes, implement in v0.3 (see GEMINI_FUTURE)
- **Environment cost resource:** Confirmed: costs COINS, not nutrients. Exact coin cost per dial notch TBD (suggest 5 coins, same as fish egg — revisit in gp03)
- **Net restrictor mechanic:** Needs specific ruling — how many nets per turn? Per level? Coin cost? Spec in ui03fishcards.md

---

## Star Sailors Ecosystem

Right now: annotations & player progress saved to shared Supabase. That's it.

Later: shared currencies, shared narrative, coral discoveries visible in Star Sailors world. See `future/GEMINI_FUTURE.md` → "Star Sailors Deep Integration".
