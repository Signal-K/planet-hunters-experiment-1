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

## Audit (SSL-782, 2026-11-06)

- Shared scorecard in `signal-k/client` (becoming Garden, `docs/specs/garden-rename-and-ecosystem.md`): the community garden, driven by the `platform_contributions` ledger on the shared backend. One row per player, game, kind and UTC day (unique, so repeats are no-ops). It has no weight field. The monthly goal is `max(60, 8 x P)`, set on the 1st.
- Landnám already reports into it (SSL-763, `pocketbase/ledger_report.go`): batched, off the `game_states` save, last 7 days only, never blocks a save, kinds `classification`, `survey`, `discovery-mission`, `event` and the trader kinds. Landnám's own bar (`research.go`) never reads the ledger.
- `classificationPoints` on `profiles` is the old client's per-profile score (leaderboards, hub top five). Only the client's `PostForm` raises it. Landnám classifications go to shared `subject_classifications`, `asteroid_classifications` and `ss_saturn_storm_classifications` but do not touch it.

## Old classification points move to the ledger (2026-11-06, SSL-783)

- Liam: take the old classification points and migrate them to the new ledger. The ledger is the one scorecard.
- The ledger gains optional `points` (weight, default 1) and `project`. Each old profile becomes one row (game `garden`, kind `legacy-classification-points`, project `legacy`, `points` = old total, sentinel day `2000-01-01` so monthly counts never include it). Old profiles are never changed or deleted.
- Built on branches, not run: tickets-please `ssl-783-ledger-points` (migration 110, ingest route) and client `cycle/ssl-783-classification-points` (dry-run script).

## Open

- Weighting does not exist yet: every ledger row counts 1. If a classification is worth more in one project, the ledger needs a project field and a weight table (per project or game).
- The ledger's `kind` is not a project. A rover classification and a transit classification look the same.
- Hub leaderboard and top five now read the ledger (SSL-784, built on branches, not deployed): score = `SUM(COALESCE(points,1))` over `classification` and `legacy-classification-points` rows, via `GET /api/platform/leaderboard` on the shared backend; falls back to `classificationPoints` if the shared backend is not configured or empty. The ledger holds one classification row per player per day, so new play adds at most 1 point a day.
- The sunspot leaderboard and the player's own points shown elsewhere in the client still use their old sources.
- The Garden spec's feature map is out of date: it sends rover to Landnám and Zoodex to Atlas; rover is now its own game (SSL-777).
