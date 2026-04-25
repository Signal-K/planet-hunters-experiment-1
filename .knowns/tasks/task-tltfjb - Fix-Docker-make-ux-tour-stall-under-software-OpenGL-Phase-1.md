---
id: tltfjb
title: Fix Docker make ux-tour stall under software OpenGL (Phase 1)
status: done
priority: medium
labels:
  - ci
  - docker
  - ux-tour
  - infra
createdAt: '2026-04-22T01:58:22.829Z'
updatedAt: '2026-04-22T04:23:36.581Z'
timeSpent: 492
assignee: '@me'
---
# Fix Docker make ux-tour stall under software OpenGL (Phase 1)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
make ux-tour hangs after loading earth_base_1.tscn in the planet-hunters-ux-tour container (software OpenGL). The underlying gameplay/UI fixes from 5ierg4 are in place. This is a pure CI infra issue.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 make ux-tour completes Phase 1 without stalling in Docker
- [x] #2 Stall root cause identified (timeout? OpenGL fallback? headless display?) and fixed or worked around
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Three-part fix:
1. _configure_runtime_timings: added OS.has_environment("GODOT_UX_TOUR") check — Docker/Xvfb is not headless so the old check never triggered, leaving 2.5s settle × many screenshots × slow softpipe frames near or over the 30min timeout.
2. EarthWeatherEngine: skip _process cycle in GODOT_UX_TOUR mode — reduces per-frame rendering cost.
3. entrypoint: --rendering-driver opengl3 skips Vulkan init (Xvfb has no Vulkan), plus MESA_GL_VERSION_OVERRIDE=3.3, MESA_GLSL_VERSION_OVERRIDE=330, MESA_NO_ERROR=1 for faster softpipe.
<!-- SECTION:NOTES:END -->

