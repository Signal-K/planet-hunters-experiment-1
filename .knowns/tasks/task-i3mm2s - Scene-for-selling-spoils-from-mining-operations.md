---
id: i3mm2s
title: Scene for selling spoils from mining operations
status: done
priority: medium
labels:
  - Scenes
  - Mining
  - Items
  - Inventory
  - Sales
  - Missions
  - Subcontractors
createdAt: '2026-02-02T10:23:18.024Z'
updatedAt: '2026-02-02T10:36:25.658Z'
timeSpent: 347
assignee: '@me'
---
# Scene for selling spoils from mining operations

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a user has filled their ship and returned "home" to earth (so they're orbiting Earth), they can sell or keep some of the resources. Users will need to pay a fee to a subcontractor to bring the minerals to Earth's surface. Later, they can research and build the facilities so they can do this in-house. If the users bring the minerals to Earth, this will provide them with a higher sell price for the minerals. users can do construction on earth as well, but this is for later (keep it in the knowledge base/pool, though). After seling, users can scrap, salvage or leave their ship [in orbit] and they will then get a mission badge (based on the name of the ship and other parameters) and mission log added to their stats. This should be added to a new json file. This also should add experience to the user's total. Scrapping a ship will return a variable percentage of the original cost to the user's [franc] balance, but for now it will be a flat 20%.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a mission debrief scene for post-return cargo review and sales actions.
2. Implement mission log storage + sale/scrap logic that updates franc balance + XP.
3. Wire return-home flow to debrief scene and add tests for mission log persistence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added mission debrief scene for post-return cargo review, sales, and ship closeout actions.
- Added MissionLogManager + mission log JSON, and sale/scrap logic updating Franc balance + XP.
- Wired return-home flow to new debrief scene and added mission log test + CI job.
<!-- SECTION:NOTES:END -->

