# Planet Hunters Experiment 1 — UX Tour AI Review Context

## What is this game?

Planet Hunters Experiment 1 is a citizen science mobile game where players:
- Build and launch rockets to mine asteroids and visit exoplanet candidates
- Complete a 4-mission tutorial that teaches all core mechanics
- Annotate real TESS space telescope data (drawing on planet candidate images)
- After the tutorial, enter Free Operations (sandbox) to run missions freely

## Mission Flow — what 'going through all levels' means

| Stage | Name | Key mechanics introduced |
|-------|------|--------------------------|
| M1    | First Mining Trip | Control Station, Launchpad, basic mining, debrief |
| M2    | Contractor Missions | Contractor bonus system, better rockets |
| M3    | TESS Planet Candidates | Real exoplanet data as targets, annotation view |
| M4    | Scanner + Drones | Scanner Station build objective, drone mining mode |
| Sandbox | Free Operations | All mechanics unlocked, user-directed play |

## What 'annotation' means

In Missions 3+, users visit TESS planet candidates (real NASA/ESA exoplanet data).
The Candidate Detail View (asteroid_detail_view.tscn) lets users draw on these
images to mark transit dips or notable surface features. This is the citizen
science contribution — annotations feed into real research pipelines.

## Screenshot groups and what to look for

### Level coverage (question 1)
Look at screenshots prefixed: stage2_*, stage3_*, stage4_*, stage5_*
These show earth base and launchpad at each mission stage with injected state.
The tutorial coach overlay text changes at each stage — check that it reflects
the correct mission objective for that level.

### UI overlaps and off-screen elements (question 2)
The ux_report.md lists all detected OFF-SCREEN and UI OVERLAP issues.
For each screenshot, also visually check:
- Is any text box appearing over a button (label occluding an interactive element)?
- Is any UI element clipped or hanging off the screen edges?
- Is any important button hidden behind another element?

### Flow and tutorial clarity (question 3)
For each screenshot, consider as a first-time user:
- Would you know what to do next without reading a manual?
- Is the tutorial instruction (coach overlay) clear and actionable?
- Does the UI use game jargon a new user wouldn't understand?
- Is the path from 'I just arrived at this screen' to 'I did the thing' obvious?

## CI limitations (expected gaps)

- **Empty target lists**: New Mission Panel and Satellite Station Panel show no
  targets in CI because there is no live Supabase connection. This is expected.
- **Payout data**: Mission Debrief shows empty payout — expected in CI.
- **Tutorial state injection**: Stage progression screenshots inject state via
  config file — full scene reactivity may vary.

## How to use tour_manifest.json

Each entry in `screenshots[]` has:
  - filename: the PNG filename
  - phase: human-readable phase name
  - mission_stage: 0=pre-tutorial, 1=M1, 2=M2, 3=M3, 4=M4, 5=sandbox, -1=panel/overlay
  - description: what this screen represents
  - what_to_check: specific questions to answer for this screenshot

