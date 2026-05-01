---
id: 3nc516
title: 'Rename Experiment 1 from ''Planet Hunters'' to ''Distant Signals'''
status: done
priority: high
labels:
  - branding,rename,landing-page
createdAt: '2026-05-03T11:41:09.491Z'
updatedAt: '2026-05-03T11:41:09.491Z'
timeSpent: 0
assignee: '@Liam'
---
# Rename Experiment 1 from 'Planet Hunters' to 'Distant Signals'

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first experiment was called 'Planet Hunters' which is too literal and similar to real NASA programme names. Renamed to 'Distant Signals' — evocative of the TESS light-curve signals from far stars and the asteroid mining comms theme. Name inspired by the Gizmonauts soundtrack style (2-word poetic space phrases). Changes applied: react-shell.js (landing page title, tagline, login text, desktop subtitle), screens/LoadingScreen.tsx, screens/LoginScreen.tsx, screens/MenuScreen.tsx, App.tsx comment. Storage cookie/localStorage keys left as planet_hunters_* to avoid invalidating existing sessions. Tagline updated from NASA citizen science framing to 'Mine asteroids. Build settlements. Discover real planets.'
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Landing page shows 'Distant Signals' as the game title
- [x] #2 Tagline: 'Mine asteroids. Build settlements. Discover real planets.'
- [x] #3 All React Native screens updated
- [x] #4 Storage key names unchanged to preserve existing sessions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified the primary React Native screens already used Distant Signals, then cleaned up remaining visible rename leftovers on 2026-05-06 in the web service worker notification title, scanner-station toggle copy, and release/playthrough labels.
<!-- SECTION:NOTES:END -->
