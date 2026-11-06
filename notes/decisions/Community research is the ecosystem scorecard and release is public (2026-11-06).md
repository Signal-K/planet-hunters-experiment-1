---
type: decision
title: Community research is the ecosystem scorecard and release is public
project: Landnam
status: decided
created: 2026-11-06
---

# Community research is the ecosystem scorecard and release is public (2026-11-06)

Decided by Liam, after the release plan.

## Decision

- The first release is public. Everything is public; there is no invite-only phase.
- Community events and research are the big scorecard (like Pokémon Go or No Man's Sky) and the clearer pathway for players. It already exists and is not new work:
  - **Per game:** each game has its own scorecard. Landnám has had Community research for over a week (`CommunityResearchScreen`, daily stamps, the shared 100-stamp monthly bar in `pocketbase/research.go`, weekly Explorer and Trader paths, the live event week, community votes).
  - **Shared:** `signal-k/client` holds the ecosystem scorecard (leaderboards, `classificationPoints` on profiles, the hub leaderboard, contributions).
- A contribution is a classification. Its weighting depends on the project or game.
- It extends `Community research is the standing event (2026-11-01)`; nothing there changes.

## Consequences

- No new scorecard is built in Landnám. The rover and solar games each get their own scorecard in the same style, and report classifications to the shared one in `signal-k/client`.
- Public launch means the release checklist covers abuse and load: server-light reads (`fields=`, paging, no polling), moderation for anything player-written, and sign-in required.
- Landnám is the front door: from its Community research a player can see which game suits them.

## Open

- The per-project weights for `classificationPoints` (set per project or game).
- How Landnám's stamps and classifications feed the shared `signal-k/client` scorecard today, and what is missing. Not yet audited.
