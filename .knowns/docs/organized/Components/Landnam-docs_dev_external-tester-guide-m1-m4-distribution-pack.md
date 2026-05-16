---
title: External Tester Guide — M1-M3 Distribution Pack
description: 'Step-by-step tester script for first external testers: launch, mine, debrief, next mission, PWA install. Authored arc is M1-M3 only. Includes feedback capture and rollback path.'
createdAt: '2026-04-22T04:01:09.805Z'
updatedAt: '2026-05-13T08:07:43.943Z'
tags:
  - project-landnam
  - doc-kind-component
  - testing
  - distribution
  - tester
  - pwa
  - mvp
  - ui
---

[← Back to Index](../INDEX.md)

# Planet Hunters — External Tester Guide (MVP M1-M4)

**Last updated:** 2026-04-22  
**Build URL:** https://experiment1.starsailors.space  
**Canonical prod deployment:** planet-hunters-experiment-1-km3lprks4-signal-k.vercel.app  

---

## Before You Start

- Use Chrome or Safari on **mobile** (iPhone/Android) or a desktop browser
- Recommended: open on mobile and add to home screen for the full PWA experience
- If the game loads a black screen for >5s, hard-refresh (Cmd+Shift+R / Ctrl+Shift+R)
- You need no account — the game stores progress locally in your browser

---

## Part 1 — Mission 1: First Launch

1. Open https://experiment1.starsailors.space
2. You should see the Earth base hub
3. Tap **Launchpad** in the bottom navigation
4. Confirm a rocket is shown on the pad and a contractor offer is visible
5. Select the asteroid target from the map and confirm a launch destination is shown
6. Tap **Launch** — you should see the transit/travel screen
7. After transit ends, you should arrive at the mining scene automatically

**What to note:** Did each step feel clear? Was anything confusing or hidden?

---

## Part 2 — Mining

1. In the mining scene, use the **FIRE** button (or spacebar on desktop) to shoot the laser
2. Aim at coloured mineral regions in the terrain
3. Watch the Fuel and Heat gauges in the top bar — don't overheat
4. Mine until the mission timer runs out or you tap **Return**
5. You should be taken to the debrief screen

**What to note:** Were the controls obvious? Could you tell what you were mining?

---

## Part 3 — Debrief & Payout

1. Review the payout breakdown on the debrief screen
2. Tap **Resolve** (or equivalent) to collect earnings
3. You should be returned to the Earth base hub with an updated Francs balance
4. A "next mission" prompt or indicator should be visible — confirm it points to Mission 2

**What to note:** Was the payout clear? Did you know what to do next after debrief?

---

## Part 4 — Mission 2 Flow (if time allows)

1. From the Earth base, follow the next-mission guidance
2. Mission 2 should direct you to build/use the **Control Station** before launching
3. Complete a second mining run
4. Confirm the debrief mentions a structured contractor order (not "free operations")

**What to note:** Did the mission 2 guidance feel different from Mission 1? Any dead ends?

---

## Part 5 — PWA Install (mobile only)

1. In Safari (iOS): tap the **Share** button → **Add to Home Screen**
2. In Chrome (Android): tap the browser menu → **Add to Home Screen** or **Install App**
3. Launch the installed icon from your home screen
4. Confirm the game fills the full screen with no browser chrome
5. Confirm the game remembers your progress from the browser session

**What to note:** Did the install prompt appear? Did the installed version look correct?

---

## Feedback Capture

For each issue found, note:
- **Where** you were (which screen/step)
- **What** happened vs what you expected
- **Device** and browser (e.g. iPhone 14, Safari 17)
- A screenshot if possible

Send feedback to: liam@skinetics.tech

---

## Rollback Path

If a bad deploy reaches production:

```bash
# List recent deployments
vercel ls

# Rollback to previous production deployment (replace URL with target deployment)
vercel rollback <previous-deployment-url> --scope signal-k

# Or promote a specific deployment to production
vercel alias set <deployment-url> experiment1.starsailors.space --scope signal-k
```

The previous production deployment URL is always visible in `vercel ls` output.  
A git revert + `npm run deploy` also restores a known-good state from any prior commit.

**Current git SHA at time of writing:** See `git log --oneline -1` in the repo root.

---

## ⚠️ 2026-04-25 Note

This guide was written as "M1-M4" but the authored arc is **M1-M3 only**. There is no M4 tutorial. After M3 the player receives a handoff dialogue and enters Free Operations. Parts 1-3 of this guide (M1-M2) remain valid. No M4 step-by-step guide is needed.
