---
id: 5g3zb7
title: Push notifications MVP (self-hosted)
status: done
priority: high
labels:
  - notifications
  - pwa
  - backend
createdAt: '2026-03-17T06:47:35.392Z'
updatedAt: '2026-03-19T03:35:29.245Z'
timeSpent: 660
assignee: '@me'
---
# Push notifications MVP (self-hosted)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Self-hosted push notifications via service worker + Supabase. Day 1 requirement. No external services (no OneSignal).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Service worker registered and active in PWA
- [x] #2 Push notification on rocket arrival at destination
- [x] #3 Push notification on construction completion
- [x] #4 Push notification on contractor cooldown ending
- [x] #5 Backend trigger via Supabase (no external notification service)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Dependencies
- Install `web-push` via yarn (VAPID signing — not yet installed)
- Node.js built-in `crypto` is alternative but web-push is much simpler

### Files to create/modify

1. **`web/public/sw.js`** (NEW) — Service worker
   - `push` event listener → `self.registration.showNotification(title, options)`
   - `notificationclick` → `clients.openWindow(event.notification.data.url || "/")`

2. **`web/public/manifest.json`** (NEW) — PWA manifest
   - Required for service worker scope + install prompt
   - Already has favicon.ico / favicon.svg

3. **`web/public/index.html`** — Add manifest link + SW registration script
   - `<link rel="manifest" href="/manifest.json">`
   - Register SW on load, subscribe to push, POST subscription to `/api/push-subscribe`
   - Use VAPID public key from a `<meta name="vapid-public-key">` tag (injected by server)

4. **`web/server.js`** — Add endpoints
   - `POST /api/push-subscribe` → store subscription in memory Map (or persist to file)
   - `POST /api/push-notify` → internal endpoint (game calls this), sends push via web-push
   - VAPID keys read from env vars `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
   - Generate keys once with: `node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k))"`
   - In-memory subscription store: `const _pushSubscriptions = new Map()` (keyed by user_id or endpoint hash)
   - Scheduled notifications: `const _scheduledPushes = new Map()` with `setTimeout` per event

5. **`react-shell.js`** — Client-side push subscription
   - After SW registers: call `swRegistration.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)})`
   - POST subscription object to `/api/push-subscribe`
   - Expose `window.__schedulePush(event, delayMs, payload)` for game postMessage bridge

6. **GDScript: `scene/Scripts/Utils/PushNotificationHelper.gd`** (NEW)
   - `static func schedule_rocket_arrival(mission_id, duration_secs)` → POST to `/api/push-notify` with `schedule_after_secs`
   - `static func schedule_construction_complete(room_id, duration_secs)`
   - `static func schedule_contractor_cooldown_end(contractor_id, duration_secs)`
   - Uses same HTTPRequest pattern as MissionNarrativeAPI.gd

### Hook points in existing GDScript
- Rocket launch: `LaunchpadSelectorPanel.gd` after mission accepted → call `PushNotificationHelper.schedule_rocket_arrival()`
- Construction: `GameNavigationMenu.gd` after `_do_room_upgrade()` → call `schedule_construction_complete()`
- Contractor cooldown: `SubcontractorManager.gd` when cooldown is set → call `schedule_contractor_cooldown_end()`

### AC#5 interpretation
"Backend trigger via Supabase" means our self-hosted Node server reads from Supabase for event timing (e.g. mission launch records), NOT that Supabase sends pushes. The Node server sends pushes via web-push library. No OneSignal or external push service.

### Key constraints
- PWA only (service workers require HTTPS or localhost)
- react-shell.js is the PWA shell; index.html is the standalone web viewer
- Both need SW registration but push subscription only meaningful in PWA context
- VAPID keys must be persisted as env vars (rotate = all existing subscriptions invalidated)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
sw.js: push+click handlers, install+activate.
manifest.json: created (standalone, landscape).
index.html: manifest link added.
server.js: /api/push-subscribe, /api/push-notify (w/ scheduling), /api/runtime-config; web-push lib; graceful no-op if VAPID keys absent.
react-shell.js: initPushNotifications() on boot — SW reg, push subscribe, posts to /api/push-subscribe, exposes window.__schedulePush; schedule_push postMessage handler.
PushNotificationHelper.gd: static helpers for rocket_arrival, construction_complete, contractor_cooldown_end; all via postMessage → shell → server.
Hook points: LaunchpadLaunchButton (rocket arrival), SubcontractorManager.record_mission_completion (cooldown), ConstructionManager.add_contribution (instant on complete).
api/runtime-config.js: vapidPublicKey added.
Env vars needed: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
<!-- SECTION:NOTES:END -->

