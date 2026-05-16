---
id: c20nu2
title: Contractor mission generation system
status: done
priority: medium
labels:
  - project-landnam
  - contractors
  - ai
  - claude-api
createdAt: '2026-03-17T06:48:09.324Z'
updatedAt: '2026-03-18T14:38:34.913Z'
timeSpent: 826
assignee: '@me'
---
# Contractor mission generation system

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hybrid procedural + AI mission generation from reusable templates. Claude API (Haiku) for narrative text. Location always from TESS/asteroid feed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Template structure defined: mission_type, mineral, quantity, location (variable), narrative_tone, payout_tier
- [x] #2 Procedural assembly: location injected from live TESS/asteroid feed at generation time
- [x] #3 AI text generation: Claude Haiku generates mission title + description + contractor quote from scaffold
- [x] #4 Generated text cached per mission instance
- [x] #5 Variety target: no text repeat within 5 consecutive missions per contractor
- [x] #6 Contractor project phases advance and are reflected in dialogue
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
Server: POST /api/generate-mission in web/server.js — calls Claude Haiku (claude-haiku-4-5) via Node https, returns {title, description, contractor_quote}. In-memory cache keyed on contractor+mission params. Variety tracking: last-5 contractor_quotes per contractor_id to avoid repeats. Affinity level → phase label in prompt (initial→strategic partnership). Graceful procedural fallback if API key not set or call fails.
GDScript: MissionNarrativeAPI.gd — static HTTPRequest helper that mirrors server cache locally. LaunchpadSelectorPanel renders blue mission briefing card in trip contract brief when a contractor is selected.
<!-- SECTION:NOTES:END -->

