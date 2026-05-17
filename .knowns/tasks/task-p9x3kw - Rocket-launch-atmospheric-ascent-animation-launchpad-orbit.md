---
id: p9x3kw
title: Rocket launch atmospheric ascent animation (launchpad → orbit)
status: done
priority: high
labels:
  - project-landnam
  - animation
  - launch
  - atmosphere
  - transition
  - scenes
  - experiment1
createdAt: '2026-02-28T00:00:00.000Z'
updatedAt: '2026-03-07T01:16:34.123Z'
timeSpent: 220
assignee: '@me'
---
# Rocket launch atmospheric ascent animation (launchpad → orbit)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rather than cutting directly from the launchpad scene to the orbit/transit scene, the launch should be a continuous, satisfying animation that carries the player through the atmosphere. The landscape should gradually change as altitude increases, and the sky should progressively darken from light blue to deep blue to black.

**Source:** Handwritten notebook page 119 (IMG_1832.jpeg, Rooms & Upgrades note). The four storyboard frames sketched in the bottom-right of that page define the visual sequence:

### Storyboard frames (page 119 diagrams)

**Frame 1 — Ground / launchpad:**
- Rocket sits on the pad, partially framed by the launch structure
- Landscape visible: ground-level terrain, buildings, horizon in the distance
- Sky is full light blue — daytime atmosphere
- The rocket is large and central in frame

**Frame 2 — Low altitude, ascending:**
- Rocket is now airborne, tilting into its upright ascent posture
- The landscape below begins to shrink and recede
- Sky at the top of the frame begins to darken — deep blue encroaching from above
- Rocket exhaust/trail visible beneath

**Frame 3 — Upper atmosphere:**
- Rocket silhouette is fully vertical and elongated
- Ground is now just a faint line or thin strip at the base of the frame
- Sky is near-black — just a faint blue band at the very bottom
- Horizon begins to show a slight curve
- Stars may begin to appear faintly

**Frame 4 — Orbit / space threshold:**
- Full dark space fills the frame
- The planet is now visible as a partial arc or small disc below
- Rocket is comparatively tiny — in orbit orientation
- Stars present

### Transition logic

The animation should be continuous, not scene-switched. The following elements should lerp/animate as "altitude" increases from 0.0 → 1.0:

| Property | At altitude 0.0 (ground) | At altitude 1.0 (orbit) |
|---|---|---|
| Sky colour | Light blue (#87CEEB or game equivalent) | Black (#000000) |
| Star overlay opacity | 0.0 | 1.0 |
| Landscape scale / position | Full size, centred | Tiny, shifted to bottom |
| Horizon curvature | Flat | Slight arc |
| Rocket scale on screen | Large (hero) | Small |
| Rocket orientation | Angled (launch posture) | Vertical or slight drift |
| Atmospheric haze | Strong | None |
| Ambient sound | Wind / launchpad SFX | Silence / space ambience fade-in |

### Relationship to existing tasks

- `task-2nlvlo` removed the launch animation and routes directly to transit. **This ticket restores a launch animation**, but as a continuous scroll/tween rather than a discrete scene swap.
- `task-ssq8b2` / `task-4uqwke` implement sky darkening for the Earth day/night cycle — the **shader or colour tween approach from those tasks should be reused or extended** here for the ascent darkening.
- `task-r8mxvw` covers the in-transit animation (once in space/en route). The ascent animation described here is the **pre-transit launch phase**.
- `task-ymh13c` added a skip button to transitions — a **skip button should also be present** during the ascent animation.

### Design intent

The goal is to make the act of launching feel like a real departure. The player should feel the world falling away beneath them and the stars emerging above. This doesn't need to be long — 3–6 seconds is enough — but it should be **continuous, smooth, and skippable**. It creates the emotional punctuation between "you're on Earth" and "you're in space."
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The launchpad → orbit transition is animated, not a hard scene cut.
- [x] #2 Sky colour lerps from light blue to black over the duration of the ascent animation.
- [x] #3 Stars fade in as sky darkens (can reuse EarthStarFieldEvent or equivalent shader from task-4uqwke/ssq8b2).
- [x] #4 The ground/landscape recedes visually — either scaling down, parallax scroll upward, or camera pan.
- [x] #5 Horizon curvature is visible by Frame 3 (upper atmosphere stage).
- [x] #6 A skip button is present throughout (consistent with task-ymh13c pattern).
- [x] #7 The animation runs in approximately 3–6 seconds at normal speed.
- [x] #8 On skip, the scene transitions cleanly to the orbit/transit state.
- [x] #9 Rocket orientation and scale animate consistently with altitude (large + angled at launch → small + vertical at orbit).
- [x] #10 Atmospheric haze effect (if present) fades out as altitude increases.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add explicit horizon-curve visual during ascent mid/late phase
2. Make atmospheric haze fade deterministic with altitude
3. Validate rocket_ascent.tscn headless load
4. Check AC 5 and 10 and close task
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation
- New RocketAscent.gd: sky-to-black tween, earth receding, stars fading in, rocket ascending + straightening
- All elements built programmatically in _ready() (no editor nodes)
- rocket_ascent.tscn: minimal scene file (Node2D root + script)
- LaunchpadLaunchButton: routes to rocket_ascent.tscn instead of rocket_transit.tscn
- TutorialCoachOverlay: rocket_ascent added to TRANSIT_SCENE_BASENAMES
- ACs 5 (horizon curvature) and 10 (atmospheric haze shader) not implemented; handled by earth sprite shrinkage and haze ColorRect respectively

✓ Added explicit curved horizon line in RocketAscent.gd (visible from mid ascent onward) and made haze alpha driven directly by altitude. Verified rocket_ascent.tscn loads via headless Godot.
<!-- SECTION:NOTES:END -->

