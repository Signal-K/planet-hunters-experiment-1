---
type: decision
title: Steps and sheets are sized to their content
project: Landnam
status: decided
created: 2026-11-04
---

# Steps and sheets are sized to their content (2026-11-04)

Decided by Liam while reviewing the SSL-757 vote steps.

## Decision

- A step, sheet or dialog is as tall as what it holds. No full-height screen with three small items and a void under them.
- If a step has little to say, add a visual (a small illustration, icon or bar) or make everything smaller. Do not pad it out with text.
- Break long copy into steps, but keep each step short enough to read at a glance. One idea per step.
- Check this at 390x844, 926x428 and 1440x900 before committing.

## Where

First applied in `web/components/game/screens/CommunityBallots.tsx` (a centred card over a dimmed backdrop, with a small illustration per option).
