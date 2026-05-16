---
id: t26xvc
title: Stabilize non-main Godot export npm install in CI
status: done
priority: high
labels:
  - project-landnam
  - ci
  - github-actions
  - electron
createdAt: '2026-03-04T04:26:20.793Z'
updatedAt: '2026-03-06T03:54:51.235Z'
timeSpent: 237
assignee: '@me'
---
# Stabilize non-main Godot export npm install in CI

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent flaky Electron binary download during non-main Godot web export workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Non-main Export Godot Assets job no longer fails due to Electron binary download during npm ci
- [x] #2 Workflow still installs dependencies required for godot:export:desktop
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect workflow steps around Export Godot Assets (non-main) and confirm why npm ci triggers electron download.
2. Patch workflow install step to avoid downloading Electron binaries in this non-packaging job while keeping dependency install intact.
3. Validate workflow syntax and verify affected scripts still have required deps.
4. Record notes, then mark AC complete after verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Root cause: `npm ci` in non-main Godot export job attempted Electron binary download via `electron` postinstall.
- Fix: Added `ELECTRON_SKIP_BINARY_DOWNLOAD=1` to `Export Godot Assets (non-main)` install step only.
- Validation: Workflow YAML parses successfully (`YAML OK`).

## Impact
- Non-main Godot export preview no longer depends on Electron binary network download during dependency install.
- No change to main release packaging steps that require Electron binaries.
<!-- SECTION:NOTES:END -->

