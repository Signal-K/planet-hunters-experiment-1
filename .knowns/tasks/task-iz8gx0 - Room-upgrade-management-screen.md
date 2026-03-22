---
id: iz8gx0
title: Room upgrade management screen
status: done
priority: high
labels:
  - rooms
  - progression
  - ui
  - upgrades
createdAt: '2026-03-16T21:57:41.204Z'
updatedAt: '2026-03-16T22:04:50.166Z'
timeSpent: 311
assignee: '@me'
---
# Room upgrade management screen

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
RoomCatalog data model exists with full tier/upgrade rules, but there is no UI for players to install or upgrade rooms between missions. This screen should unlock at Level 5. It gates laser level progression, cargo upgrades, and scanner upgrades. Entry point: Earth base screen, or a dedicated button in GameNavigationMenu.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Room management screen accessible from Earth base after Level 5
- [x] #2 Shows currently installed rooms per rocket with current tier and upgrade cost
- [x] #3 Player can tap a room to see next-tier stats and pay Francs to upgrade
- [x] #4 Room upgrade changes the relevant stat (laser_level, cargo_multiplier, etc) in RocketsManager
- [x] #5 Locked rooms show unlock conditions (level requirement, prerequisites)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
RoomCatalog: UPGRADE_COSTS, UPGRADE_CHAINS, get_room_at_tier, get_max_tier, get_upgrade_cost, get_upgradeable_rooms added. RocketsManager: get_type_room_upgrades + set_type_room_tier added (syncs laser_level for mining category). GameNavigationMenu: ROOM_UPGRADES section added (locked at L<5; shows per-category upgrade rows with cost buttons; close+reopen on purchase). MECH24-29 pass.
<!-- SECTION:NOTES:END -->

