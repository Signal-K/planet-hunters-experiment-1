---
id: qjmitn
title: Enforce flat reward for failed candidate confirmation
status: done
priority: high
labels:
  - project-landnam
  - gameplay
  - rewards
  - citizen-science
createdAt: '2026-03-10T06:14:48.396Z'
updatedAt: '2026-03-10T06:37:25.317Z'
timeSpent: 11
assignee: '@me'
---
# Enforce flat reward for failed candidate confirmation

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Keep failed-confirmation reward as flat XP and ensure messaging is shown after result while candidate remains non-visitable until confirmed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Failed-confirmation XP remains flat across contexts
- [x] #2 Candidate visit remains blocked on failed confirmation
- [x] #3 Reward + next-step messaging appears after result
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Verified failed-confirmation classification XP is flat (`add_experience(1, "tess_classification")`).
- Verified failed confirmation marks candidate as blocked for visits and sets launch guidance to pick another target.
- Verified post-result classification feedback message is shown immediately after verdict selection.
<!-- SECTION:NOTES:END -->

