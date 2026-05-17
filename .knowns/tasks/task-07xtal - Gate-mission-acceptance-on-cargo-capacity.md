---
id: 07xtal
title: Gate mission acceptance on cargo capacity
status: done
priority: medium
labels:
  - project-landnam
  - gameplay
  - missions
  - rockets
createdAt: '2026-03-16T17:51:56.479Z'
updatedAt: '2026-03-16T21:23:31.467Z'
timeSpent: 0
assignee: '@me'
---
# Gate mission acceptance on cargo capacity

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rocket and room doc specifies: if a mission requires more cargo than the rocket can carry, the player is shown why they cannot accept the mission. Entry point: LaunchpadSelectorPanel.gd contractor/mission selection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Missions requiring more cargo than current rocket capacity are shown as unavailable
- [x] #2 Disabled missions show tooltip: 'Cargo capacity insufficient — upgrade your Cargo Bay'
- [x] #3 Cargo capacity from RocketSpecs is used for comparison (not a hardcoded value)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
LaunchpadSelectorPanel.gd: _render_trip_contract_brief now accepts rocket_id param (passed from awaiting_rocket_id). Computes required_kg from requested_minerals, max_haul_kg from cargo_multiplier * 2000 * 0.5. If required > max, shows amber warning label with specific numbers and upgrade hint.
<!-- SECTION:NOTES:END -->

