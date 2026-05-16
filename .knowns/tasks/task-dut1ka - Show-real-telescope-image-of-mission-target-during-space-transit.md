---
id: dut1ka
title: Show real telescope image of mission target during space transit
status: done
priority: high
labels:
  - project-landnam
  - citizen-science
  - transit
  - ux
  - experiment1
createdAt: '2026-02-28T09:46:29.753Z'
updatedAt: '2026-02-28T09:54:27.902Z'
timeSpent: 80
---
# Show real telescope image of mission target during space transit

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During the 20-second TRAVEL phase of rocket_transit, show the actual telescope image of the mission target fetched from the starsailors.space API. This is THE citizen science engagement moment — users see real astronomical data related to their target before mining. Works for predefined targets (M1/M2) using known asteroid IDs and for scanner targets (M3+) using the selected anomaly ID stored in RocketsManager preview target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 During TRAVEL phase, a panel fades in showing 'Incoming telescope data' then the target image
- [x] #2 Uses same API pattern as SimpleDetailView (starsailors.space storage endpoint)
- [x] #3 Shows target name, data source (e.g. 'NASA TESS dataset' or 'Active Asteroids')
- [x] #4 Graceful fallback if image fails to load (show target name + placeholder text)
- [x] #5 Panel is dismissible / auto-hides when travel phase ends
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ _build_science_panel(): PanelContainer with header, TextureRect, caption label, built at _ready()
✓ _show_science_panel(): called from _start_travel(), fades in with 1.5s delay
✓ _fetch_science_image(): HTTPRequest to starsailors.space API (same pattern as SimpleDetailView)
✓ _on_science_image_loaded(): decodes PNG/JPG, graceful fallback on error
✓ Dataset label: "NASA TESS dataset" for planets, "Active Asteroids Programme" for asteroids
<!-- SECTION:NOTES:END -->

