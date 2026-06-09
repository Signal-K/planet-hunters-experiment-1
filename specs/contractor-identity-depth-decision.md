# Decision: Contractor Identity Depth for v0 Seed

## Status: Decided

**Decision: Authored identities now.** All 10 contractor slots include full name, color, initial, unlock tier, project type, mineral preferences, payout notes, affinity notes, and UI role — authored in `CONTRACTOR_SLOTS` in `web/lib/data.ts`.

## Rationale

1. The game already has 3 fully authored contractors (Foundry-3, Cryos, Belt Gold) with themed names and visual identity. Adding 7 more with the same depth is consistent and low cost.
2. Mechanical placeholders (e.g. "Contractor #4", "Contractor #5") would clash with the portrait-first operational UI style and require a later rename pass.
3. Required identity fields (name, color, initial, project type) are purely cosmetic/static — no schema changes needed. They live in TypeScript config and can be moved to JSON config at any time.

## Required Identity Fields (all authored now)

| Field | Type | Example |
|-------|------|---------|
| id | slug | `lunarore` |
| name | string | `Lunar ORE Inc` |
| color | hex | `#a8d8ea` |
| initial | string | `LO` |
| unlockTier | number | `2` |
| projectType | string | `Construction aggregates` |
| mineralPreferences | string[] | `['iron', 'carbon']` |
| payoutNotes | string | `Very low rate, massive volume` |
| affinityNotes | string | `+5 per delivery` |
| uiRole | enum | `'starter' / 'bulk' / 'prospect' / 'command' / 'science'` |

## What Was Deferred

- Per-contractor portrait art (will use initial badges for v0)
- Contractor lore paragraphs (brief project type strings suffice for v0)
- Dynamic affinity thresholds (flat +N per delivery for v0)
