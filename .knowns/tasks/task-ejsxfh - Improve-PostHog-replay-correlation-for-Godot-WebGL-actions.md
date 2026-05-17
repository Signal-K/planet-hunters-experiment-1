---
id: ejsxfh
title: Improve PostHog replay correlation for Godot WebGL actions
status: done
priority: high
labels:
  - project-landnam
  - analytics
  - posthog
  - observability
createdAt: '2026-02-27T06:58:22.648Z'
updatedAt: '2026-02-27T07:19:09.997Z'
timeSpent: 602
assignee: '@me'
---
# Improve PostHog replay correlation for Godot WebGL actions

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Session replay does not render the Godot canvas reliably (WebGL/canvas limitation). Improve observability by enriching Godot bridge analytics with deterministic action sequencing and replay/session identifiers so user actions can be matched to replays.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every Godot bridge event captured in web shell includes monotonic action sequence and client timestamp
- [x] #2 Captured events include PostHog distinct/session identifiers (when available) to correlate with session replay
- [x] #3 Correlation behavior is documented in task notes with validation steps in browser/PostHog
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update web shell analytics capture to append deterministic correlation metadata per event (monotonic sequence + client timestamp) before sending to PostHog.
2. Include PostHog identifiers when available (`distinct_id`, session id) on captured Godot bridge events to link directly to replay sessions.
3. Keep event names/payloads backward compatible while adding a small namespaced metadata block.
4. Add implementation notes with exact PostHog verification steps (event payload fields + replay/session matching).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Added correlation metadata for all Godot bridge events in web/public/app.js: correlation_event_seq (monotonic), correlation_client_ts_ms, correlation_event_name, and correlation_godot_ts_unix when present.

Validation steps: verify correlation_event_seq and correlation_client_ts_ms on gameplay events; verify correlation_posthog_distinct_id and correlation_posthog_session_id when available; align replay timeline with correlation_client_ts_ms.
<!-- SECTION:NOTES:END -->

