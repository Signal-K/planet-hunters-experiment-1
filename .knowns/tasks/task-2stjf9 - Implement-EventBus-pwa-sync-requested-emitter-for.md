---
id: 2stjf9
title: Implement EventBus.pwa_sync_requested emitter for offline-to-online reconnect
status: todo
priority: medium
labels:
  - project-landnam,godot,sync,pwa
createdAt: '2026-05-14T10:30:12.452Z'
updatedAt: '2026-05-14T10:30:12.452Z'
timeSpent: 0
---
# Implement EventBus.pwa_sync_requested emitter for offline-to-online reconnect

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
EventBus.gd:18 defines the pwa_sync_requested signal which is wired in SyncBridge but never emitted anywhere in the codebase.

Fix: emit pwa_sync_requested from SyncBridge when reconnecting after an offline period, or remove the signal entirely if not needed.

Ref: landnam/audit/megadoc-2026-05-14 HIGH-05
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pwa_sync_requested is emitted when SyncBridge detects reconnection after offline
- [ ] #2 OR: signal is removed and SyncBridge comment updated to reflect removal
<!-- AC:END -->

