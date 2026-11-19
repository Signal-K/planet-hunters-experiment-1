---
type: decision
title: Landnam Minimal is a separate game at playlandnam.space/minimal
project: Landnam
status: decided
created: 2026-11-19
---

# Landnam Minimal is a separate game at playlandnam.space/minimal (2026-11-19)

Decided by Liam, SSL-864. It started from a tester (Hugo) saying Haphazard Martians works because
anyone can jump into it, it is fast, and it is clear what to do.

## Decision

- "Anyone can play" means **no context needed**: a player who knows nothing about Landnam,
  the agency or the sky knows what to do on every screen. It does **not** mean playing without an
  account. Sign-in is still required.
- The simple version is a **separate project for now**, kept in this repository as its own
  module, `minimal/` (its own app, build and entry point; not a new repository or a submodule),
  built statically and served at **playlandnam.space/minimal**.
- It is a **standalone game with the same mechanics, research, narrative and missions** as
  Landnam. It reuses Landnam's data and rules; it does not invent its own economy or story.
- It shares Landnam's sign-in and backend, so research made there counts the same as in Landnam.
- From the player's Landnam save it shares exactly two things: **their francs**, and **whether
  they have finished Landnam's onboarding**. A player who finished onboarding in Landnam starts
  Minimal with chapter 1 done. Chapter progress is Minimal's own.
- **Web only for now.** No iOS build of Minimal.
- **Every Landnam mission type can be played in Minimal** (Liam, later the same day): client
  contract, self-directed mining, delivery, satellite launch, survey probe, meteor shower run,
  materials haul, construction and survey flight. Each is one chapter, and each mission is
  built by Landnam's own code. Mining is Landnam's own mining scene, unchanged.
- **Scenery is TakeOn**, in one consistent perspective: Minimal's scenes use a near-isometric
  camera (40°) and a rover in proportion to tiles and buildings, not the survey field's 60°
  top-down ground under three-quarter sprites, which read as 2D and 3D at once.

## Consequences

- Landnam itself is not simplified by this decision; the simple experience lives in Minimal.
- Missions, research projects and narrative come from Landnam's shared sources (`shared/`,
  and the UI-free logic in `web/lib/`). A change to a mission or rule is made once, in Landnam.
- It is served like Haphazard Martians on /martians/: a static build in `web/public/minimal/`,
  cached by Landnam's service worker for offline play, sharing Landnam's sign-in.

## Open

- Writing back: francs earned in Minimal, and chapter 1 counting as Landnam's onboarding, go
  through Landnam's save sync and offline outbox. Until then Minimal keeps its earnings and
  stored materials per pilot on the device and shows Landnam's balance plus its own earnings.
