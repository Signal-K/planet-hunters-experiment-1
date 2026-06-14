# Decision: Contractor Identity Depth for v0 Seed

## Status: Decided

**Decision: Mechanical placeholders first.** All 10 contractor slots include slot name, color, initial, unlock tier, project type, mineral preferences, payout notes, affinity notes, and UI role in `CONTRACTOR_SLOTS` in `web/lib/data.ts`. Authored names/themes are deferred.

## Rationale

1. The current seed handoff prioritizes mechanical balance and reproducible catalogs over authored identity polish.
2. Placeholder slot names keep contractor mechanics visible without creating lore that may need a later rewrite.
3. Required display fields (slot name, color, initial, project type) are static config and can be moved to JSON config at any time.

## Required Placeholder Fields

| Field | Type | Example |
|-------|------|---------|
| id | slug | `contractor-03a` |
| name | string | `Contractor Slot 03A` |
| color | hex | `#a8d8ea` |
| initial | string | `3A` |
| unlockTier | number | `3` |
| projectType | string | `Construction aggregates` |
| mineralPreferences | string[] | `['iron', 'carbon']` |
| payoutNotes | string | `Very low rate, massive volume` |
| affinityNotes | string | `+5 per delivery` |
| uiRole | enum | `'starter' / 'bulk' / 'prospect' / 'command' / 'science'` |

## What Was Deferred

- Authored contractor names and themes
- Per-contractor portrait art (will use initial badges for v0)
- Contractor lore paragraphs (brief project type strings suffice for v0)
- Dynamic affinity thresholds (flat +N per delivery for v0)
