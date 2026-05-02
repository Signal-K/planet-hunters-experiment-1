---
id: 9zc5kc
title: Submit TESS classifications to Supabase
status: done
priority: high
labels:
  - citizen-science
  - supabase
  - tess
createdAt: '2026-03-09T08:44:18.685Z'
updatedAt: '2026-03-09T08:57:01.236Z'
timeSpent: 13
assignee: '@me'
---
# Submit TESS classifications to Supabase

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a player classifies a TESS planet candidate, the verdict and any lightcurve annotations should be posted to the existing 'classifications' table in Supabase (classificationtype='tess-lightcurve') so real citizen science data is collected. No new table is needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SupabaseClient gains a post_json method (POST to REST /rest/v1/tic_annotations)
- [x] #2 Classification (verdict + annotation stroke count) is submitted on button press
- [x] #3 Submission failure is silent to the player (retry not required) but logged
- [ ] #4 SupabaseClient gains a post_json(table, row, callback) method (POST to /rest/v1/:table)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- SupabaseClient.post_json(table, row, callback): native HTTPRequest for non-web, JS fetch bridge for web
- classificationtype="tess-lightcurve" with verdict+annotation_count in classificationConfiguration
- Fire-and-forget (callback optional); failures logged but not surfaced to player
<!-- SECTION:NOTES:END -->

