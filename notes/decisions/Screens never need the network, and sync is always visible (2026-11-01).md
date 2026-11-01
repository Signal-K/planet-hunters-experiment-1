---
type: decision
title: Screens never need the network, and sync is always visible
project: Landnam
status: decided
created: 2026-11-01
---

# Screens never need the network, and sync is always visible (2026-11-01)

Decided by Liam (Freeform board "Landnam 31/10/2026", SSL-729): offline support was not working
well (a tap first failed to load, then Back reached the screen), and he had no confidence his
changes would sync. "We should add a sync tray to the UI if it's required."

## Decision

- Moving between game screens never asks the server for anything. The URL is written with
  `history.pushState` (`lib/offline/offlineNav.ts`); Back and Forward are replayed from the path.
  Do not reintroduce `router.push` for screen changes.
- The service worker keeps every `/game/<screen>` shell, and an unvisited screen falls back to
  a cached game shell offline rather than the offline page.
- The sync chip is always shown to a signed-in player (SYNCED when clean). A tap opens the
  sync tray: where progress is (this device or the account), each waiting change in plain
  words, the last upload, and Upload now. It is not a modal.
- Web: `components/game/SyncTray.tsx`, `lib/offline/syncTray.ts`. iOS: `SyncTrayView`,
  `SyncTray` in LandnamCore.
