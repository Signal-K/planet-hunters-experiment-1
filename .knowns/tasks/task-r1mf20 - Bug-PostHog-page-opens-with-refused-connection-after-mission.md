---
id: r1mf20
title: 'Bug: PostHog page opens with refused connection after mission'
status: done
priority: high
labels:
  - bug
  - posthog
  - ux
createdAt: '2026-03-16T03:50:24.453Z'
updatedAt: '2026-03-16T06:49:17.237Z'
timeSpent: 0
---
# Bug: PostHog page opens with refused connection after mission

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a mission completes, a PostHog page opens in the browser but shows a refused connection error. Should not redirect to PostHog or any external URL mid-session.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PostHog events fire silently without opening a new tab or page
- [ ] #2 No refused connection error is visible to the player after mission
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed by activating the PostHog survey via API (start_date set to 2026-03-16). Survey 019c9df8-db7f-0000-072f-73b3347a4d6c was unpublished (no start_date), causing the external_surveys iframe to return 404.
<!-- SECTION:NOTES:END -->

