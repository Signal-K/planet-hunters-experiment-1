# Landscape + perspective audit (SSL-326)

**When:** 2026-09-19  
**Branch:** `cursor/landscape-playable-2a53` / [PR #75](https://github.com/Signal-K/planet-hunters-experiment-1/pull/75)  
**Method:** Headless Chrome Cypress at true CSS viewports (phone UA on compact sizes) plus a headed DevTools pass. Local `next dev` at `http://localhost:3001`.  
**Tickets:** [SSL-326](https://linear.app/kestloome/issue/SSL-326) (this change), [SSL-324](https://linear.app/kestloome/issue/SSL-324) / [PR #74](https://github.com/Signal-K/planet-hunters-experiment-1/pull/74) (staging playtest that found the wall), [SSL-299](https://linear.app/kestloome/issue/SSL-299), [SSL-66](https://linear.app/kestloome/issue/SSL-66), [SSL-27](https://linear.app/kestloome/issue/SSL-27).

Shots: [`docs/landscape-perspective-audit/shots/`](./landscape-perspective-audit/shots/).

## Policy change

Compact landscape is a **real play path**. There is no `ROTATE TO PORTRAIT` overlay on `main` after Sprint 14; this PR stops CI from requiring that wall, unlocks PWA `orientation: any`, and keeps auth / hub / target chrome usable at 844×390 and 926×428.

Portrait remains first-class.

## Viewport matrix

| Viewport | UA | Rotate wall? | Playable? | Shot | Headline |
| --- | --- | --- | --- | --- | --- |
| **390×844** portrait control | iPhone | No | Yes | [390x844-hub](./landscape-perspective-audit/shots/390x844-hub.png) | Earth Base, Friends/Menu, coach, bottom nav. Scene has room. |
| **844×390** compact landscape | iPhone | **No** | Yes | [hub](./landscape-perspective-audit/shots/844x390-hub.png), [auth](./landscape-perspective-audit/shots/844x390-auth.png), [missions](./landscape-perspective-audit/shots/844x390-missions.png), [targets](./landscape-perspective-audit/shots/844x390-target-picker.png) | Hub + account + orbital map all reachable. Coach and launchpad rail are tight. |
| **926×428** compact landscape | iPhone | **No** | Yes | [926x428-hub](./landscape-perspective-audit/shots/926x428-hub.png) | Same hub composition, a little more sky. |
| **1280×800** desktop landscape | desktop | No | Yes | [1280x800-hub](./landscape-perspective-audit/shots/1280x800-hub.png) | Full-bleed command-deck base, **not** a 402px phone card in a void. Sparse prairie remains. |

`orientation-guard.cy.ts` encodes this matrix (6 examples, all passing on this revision).

## Perspectives / cameras

| Surface | 844×390 | Notes |
| --- | --- | --- |
| Earth Base hub | Playable | Night mountain plate, launchpad on the horizon, dock + tab bar. Coach is a full-width band; `LAUNCHPAD R…` truncates. |
| Auth / Mission Control | Playable | Two-column command-deck card. Sign In / Sign Up / Continue with Email all on-canvas after the stretch+pin fix. |
| Mission Dispatch | Reachable | Cypress caught the “Restoring your mission data…” splash (no local PB). Headed pass showed the Heavy Haul relay + hangar once catalog loaded. No rotate wall either way. |
| Target picker (orbital map) | Playable | Sun + belt, **433 Eros** inspector, **Continue · Build** on-canvas. This is the camera/perspective that matters for M1. |
| Mining / telescope | Not re-run here | Out of the early-loop timebox. SSL-27 already owns compact-landscape reachability for TESS / rover; do not treat as verified on this PR. |

## Visual bar

- **Matches:** Cyan command chrome, uppercase labels, night Earth Base plate, Mission Control planet card, orbital target map. 1280×800 is a place, not a boxed phone toy.
- **Fights:** Compact-landscape hub still spends a large sky band on the coach; the launchpad status label clips. Desktop hub is still an underfilled field (SSL-324). DevTools device-mode *framing* can make 844×390 look like a card on a white page — the Cypress 844×390 buffers are the true full-bleed canvas.

## Remaining gaps (not closed here)

1. **Hub coach + truncated launchpad rail at 844×390 / 926×428** — playable, but the band covers cherished-base sky and `LAUNCHPAD READY` becomes `LAUNCHPAD R…`. Follow-up: [SSL-327](https://linear.app/kestloome/issue/SSL-327).
2. **SSL-299 signup clip** — Continue with Email is pinned/visible on this branch at 844×390. Do **not** mark SSL-299 Done from this PR; that ticket still owns the full signup-field audit (confirm-password, overflow-hidden history).
3. **Tablet 768×1024 phone-card-in-a-void (SSL-324 B3)** — current `main` already full-bleeds below 1024px. Not re-measured in this Cypress matrix. Staging may still show the old 402px card.
4. **PWA offline landscape (SSL-66)** — this PR only unlocks `orientation: any` + metadata. Offline production acceptance stays on SSL-66.
5. **Mining / TESS / rover cameras** — not walked in this pass.

## Evidence commands

```bash
cd web
PORT=3001 npm run dev
CYPRESS_PROFILE=features npx cypress run --browser chrome --headless \
  --spec cypress/e2e/features/orientation-guard.cy.ts
```
