---
id: l3w402
title: Increase screen size for game window on mobile in React-pwa
status: done
priority: high
labels:
  - project-landnam
  - styling
  - layout
  - mobile
createdAt: '2026-02-28T14:17:47.000Z'
updatedAt: '2026-02-28T06:58:34.264Z'
timeSpent: 0
---
# Increase screen size for game window on mobile in React-pwa

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented responsive layout in react-shell.js: on mobile (<768px) game height now uses min(calc(100svh - 80px), 860px) vs min(75vh, 860px) on desktop. Padding reduced from 20px to 8px on mobile. Added resize listener to update dynamically.
<!-- SECTION:NOTES:END -->

