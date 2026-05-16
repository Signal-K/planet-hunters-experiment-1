---
id: bvf6kw
title: Refactor SyncBridge for Web/PWA Sync
status: done
priority: high
labels:
  - project-landnam
  - godot
  - web
  - pwa
  - sync
createdAt: '2026-05-14T00:32:36.084Z'
updatedAt: '2026-05-14T01:45:14.314Z'
timeSpent: 0
parent: r2shk5
order: 0
---
# Refactor SyncBridge for Web/PWA Sync

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Bridge uses EventBus
- [x] #2 Bridge uses JavaScriptBridge for Next.js communication
- [x] #3 Reliable state reconciliation between Godot Resources and Supabase
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Rewrote SyncBridge.gd: removed shadow _state dict and AppController tree traversal. Now connects to EventBus signals (player_state_changed, franc_balance_changed, experience_changed, counter_changed, pwa_state_received). Uses JavaScriptBridge.create_callback() to register window message listener for inbound Next.js payloads (source: landnam-pwa). Outbound via WebEventBridge.emit(). get_state()/get_value() delegate to PlayerManager — no local state. Supabase reconciliation handled by Next.js layer; Godot receives reconciled snapshots via pwa_state_received and applies to AppController.
<!-- SECTION:NOTES:END -->

