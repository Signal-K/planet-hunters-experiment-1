---
id: amch7h
title: Allow users to toggle the citizen science dialogue option
status: done
priority: medium
labels:
  - Contributions
  - Narrative
  - Onboarding
  - Tutorial
createdAt: '2026-01-20T02:01:50.016Z'
updatedAt: '2026-02-27T09:05:26.380Z'
timeSpent: 578
assignee: '@me'
parent: 5zp87f
---
# Allow users to toggle the citizen science dialogue option

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Basically, some users may want to know how/that their annotations are making a contribution. Others may not care; so it's important that there is an explanation for why the annotation is relevant.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented:
- Added persisted citizen-science dialogue preference in AppController/AppControllerPersistence.
- Added MenuPanel toggle button to switch the dialogue preference on/off.
- Wired Scanner panel context hint to respect preference and update live via signal.
- Added helper accessor for preference reads from UI code.
<!-- SECTION:NOTES:END -->

