---
id: gm3udy
title: Add posthog session replays
status: done
priority: medium
labels:
  - posthog
  - analytics
  - feedback
createdAt: '2026-02-26T09:07:08.000Z'
updatedAt: '2026-02-27T05:56:40.171Z'
timeSpent: 906
assignee: '@me'
---
# Add posthog session replays

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Here's some info on posthog analytics using http requests: https://www.reddit.com/r/godot/comments/1jwe1yy/dont_forget_to_add_analytics_to_your_games/. There should be a simple survey/popup at all times for if users get stuck, at any point. Additionally, I want to track if users are favouring planets/asteroids, as well as determining how easy the mining minigame is (e.g. how many times do they have to "repeat" the scene [flying over the target] to collect the minerals, how many minerals (as a percentage) are they gathering, etc etc. Codex/AI - you have full reign over how this is done. It just needs to be set up so we can get accurate insights as to how our early users are playing this game and identifying what mechanics work and what doesn't - this way we're not 100% reliant on user surveys
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Make guide targeting use circular terrain distance so slowdown/"Press D" triggers at the nearest actual subsurface deposit (including around loop boundary).
2. Prefer nearest relevant uncollected deposit for guide slowdown and drone target selection so prompt matches visible dark deposits.
3. Auto-complete mining with fuel-depleted reason when fuel reaches zero so gameplay returns to Earth immediately.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a Godot-first analytics flow for web builds. Added a persistent in-game feedback beacon that emits feedback requests through the web bridge, a GameplayAnalytics helper that enriches events with mission/session context, and broader telemetry for scanner mode changes, target selection, launch start, preview open, mission returns, mining starts, repeated mining loops, stuck signals, collection progress, and debrief outcomes.

Web shell now bootstraps PostHog with the provided project token, forwards bridge events into PostHog captures, enables session recording config, preserves the existing first-mission survey flow, and adds a structured always-available feedback popup that logs rich context into PostHog instead of depending solely on an external survey.

Validation: targeted ESLint passed for react-shell.js and web/public/app.js. Full yarn lint remains red due unrelated pre-existing repo issues in generated Godot web output and other files.

Reopened to fix Godot parse blockers: corrected SidescrollMining loop indentation, replaced Logger aliases with AppLogger in affected GDScript files for Godot 4.5 compatibility, and changed Earth environment resize notifications away from NOTIFICATION_RESIZED.

Added direct test harness scenes for web-shell analytics and surveys: scene/Scenes/Test/AnalyticsHarness.tscn emits feedback/survey/selection/launch events from buttons, and scene/Scenes/Test/MiningAnalyticsHarness.tscn boots SidescrollMining directly with easy/hard presets plus direct survey/feedback triggers. Both attach the floating FeedbackBeacon so popup testing works without the full game flow.
<!-- SECTION:NOTES:END -->

