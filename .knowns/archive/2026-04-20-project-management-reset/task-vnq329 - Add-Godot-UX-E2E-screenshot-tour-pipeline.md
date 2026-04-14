---
id: vnq329
title: Add Godot UX E2E screenshot tour pipeline
status: done
priority: high
labels:
  - ci,github-actions,ux,e2e,godot
createdAt: '2026-03-20T00:42:57.803Z'
updatedAt: '2026-03-20T00:51:38.532Z'
timeSpent: 512
assignee: '@me'
---
# Add Godot UX E2E screenshot tour pipeline

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New CI workflow (godot-ux-e2e.yml) runs on every push, spins up Xvfb, downloads Godot 4.5-stable, imports the project, then executes UXTour.tscn which drives 18 phases of gameplay (earth base, tutorial, mining minigame ~30 s beam run, annotation UI, rocket transit/ascent/return, all major panels) and takes 24 screenshots. Report written to ux_report.md; CI fails only on CRITICAL UX issues.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 godot-ux-e2e.yml workflow exists and triggers on push
- [x] #2 Artifact name is valid (no slashes from branch names)
- [x] #3 Mining minigame phase actually drives gameplay for ~30 s
- [x] #4 All 18 phases covered: earth base, tutorial overlay, control station, satellite station, launchpad, subcontractors, new mission, rocket selector, ascent, transit, return, mining practice, mining minigame, asteroid annotation, debrief
- [x] #5 CI passes on ubuntu-latest (no libasound2 install failure)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- godot-ux-e2e.yml created: triggers on every push, Xvfb + Godot 4.5-stable
- 18 phases, 24 screenshots including 30 s live mining session with beam simulation
- Artifact name sanitised (tr "/" "-" on branch name)
- CI timeout 600 s
- Verified locally: 0 issues, 0 CRITICAL, exit 0
- Knowns ticket vnq329 created
<!-- SECTION:NOTES:END -->

