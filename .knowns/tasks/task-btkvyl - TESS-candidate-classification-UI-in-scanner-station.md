---
id: btkvyl
title: TESS candidate classification UI in scanner station
status: done
priority: high
labels:
  - citizen-science
  - scanner-station
  - tess
createdAt: '2026-03-09T08:44:08.146Z'
updatedAt: '2026-03-09T08:56:28.351Z'
timeSpent: 16
assignee: '@me'
---
# TESS candidate classification UI in scanner station

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a player views a TESS Planet Candidate (disposition=PC) in the scanner station, they should be able to classify it as 'Planet' or 'Not a Planet'. This unlocks a bonus reward on mission completion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Planet Candidate targets show 'Classify: Planet' and 'Classify: Not a Planet' buttons in AsteroidDetailView
- [x] #2 Confirmed planets (KP/CP) and asteroids do NOT show classification buttons
- [x] #3 Submitting a classification saves verdict to RocketsManager state keyed by tic_id
- [x] #4 Player sees confirmation text after classifying (e.g. 'Classification submitted — bonus reward unlocked')
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- AsteroidDetailModel.is_candidate(): true for telescope-tess with no confirmed disposition
- AsteroidDetailView._build_classification_row(): adds Planet/Not-a-Planet buttons dynamically
- _on_classify(): stores verdict in RocketsManager + submits to Supabase classifications table
- Buttons show prior verdict if already classified; confirmation text appears on submit
<!-- SECTION:NOTES:END -->

