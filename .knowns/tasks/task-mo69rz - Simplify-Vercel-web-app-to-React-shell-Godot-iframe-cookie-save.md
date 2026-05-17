---
id: mo69rz
title: Simplify Vercel web app to React shell + Godot iframe + cookie save
status: done
priority: high
labels:
  - project-landnam
  - web
  - vercel
  - godot
createdAt: '2026-02-13T09:21:16.367Z'
updatedAt: '2026-02-13T09:56:20.705Z'
timeSpent: 312
assignee: '@me'
---
# Simplify Vercel web app to React shell + Godot iframe + cookie save

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace mixed server/static deployment with a single static React web shell that embeds Godot export and persists progress via cookies. Remove fragile Vercel rewrite dependency on Node server behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Vercel serves a single web entrypoint without Node server rewrites
- [x] #2 Godot export is embedded from a stable static path
- [x] #3 User progress marker is persisted and restored via browser cookies
- [x] #4 Deployment no longer fails due to missing code path mismatches
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace deploy entry with a single React shell page served statically.
2. Keep Godot build under /electron-dist/godot-web and mount it at /game/*.
3. Implement cookie-based progress persistence in the shell UI.
4. Simplify vercel.json rewrites/headers to match the static layout.
5. Validate paths locally and summarize deployment root cause + fix.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Switched Godot hosting to real /game static directory (no Vercel rewrites)

- Hotfix: iframe source now /electron-dist/godot-web/index.html to avoid /game 404s

- Added offline anomaly fallback in SatelliteStationPanel when Supabase fetch errors, so scan always returns selectable targets

- Removed full-row anomaly click overlay; added explicit View button so Select Target reliably triggers selection and navigation
<!-- SECTION:NOTES:END -->

