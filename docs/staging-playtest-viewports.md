# Staging playtest — viewports + early loop

**Origin:** [https://landnam-test.vercel.app](https://landnam-test.vercel.app) (`/` → `/game`)  
**When:** 2026-09-19  
**Ticket:** [SSL-324](https://linear.app/kestloome/issue/SSL-324/staging-playtest-landnam-testvercelapp-viewport-early-loop-read)  
**Method:** cold Chrome sessions (incognito + device emulation where noted). Fresh email accounts via **Continue with Email** / Sign Up.  
**How far:** M1 setup → launch → mining on phone portrait and desktop. Debrief / payout / Free Ops / Transit Telescope were **not** reached. Compact landscape (mobile UA) never left the orientation gate.

Shots live in [`docs/staging-playtest/shots/`](./staging-playtest/shots/). Captures include the Chrome device toolbar so the viewport size is visible in-frame.

---

## Executive read

Staging’s **early send loop works** on phone portrait and desktop: auth (when it appears), place a Launchpad, lock Helios’ Platinum starter order, pick 433 Eros, launch Explorer, fire the laser. The **command-deck chrome is consistent** (uppercase labels, cyan CTAs, Oxanium, coach rail).

It still **fights the TSP / cherished-base target** in the same places Liam has already been pointing at:

- Earth Base after one tower is a **huge empty field** (underfilled scene).
- Transit and mining are **sparse instrument diagrams**, not a place you care about.
- A **PostHog “QUICK QUESTION” sheet** covers the hub the moment you come back from the first run.
- **`NOT SYNCED`** sits on every desktop/tablet frame we kept.
- **Compact landscape on a phone UA is a hard wall** (`ROTATE TO PORTRAIT`). That is the current staged policy (repo Cypress `orientation-guard.cy.ts` expects it). It also means [SSL-27](https://linear.app/kestloome/issue/SSL-27) / [SSL-299](https://linear.app/kestloome/issue/SSL-299) cannot be re-verified on a real-phone landscape UA until that gate is lifted or bypassed.
- Tablet (768×1024, device emulation) rendered as a **402px phone card in a black void**, not a tablet layout.

Citizen-science toys were **not** the SSL-10 “Live Feed Unavailable” screen. Atlas showed the **Free Operations Required** lock because M1 never debriefed.

---

## Viewport matrix

| Viewport | How | Auth | Playable? | Furthest screen | Headline |
| --- | --- | --- | --- | --- | --- |
| **390×844** phone portrait | Device emulation | Yes — `ssl324-playtest-390@example.com` | Yes | Mining + hub “RETURNING” + Atlas lock | Full early path; no clipped CTAs; survey covers hub |
| **844×390** compact landscape | Device emulation (mobile UA) | Never reached | **No** | Orientation gate | `ROTATE TO PORTRAIT` hard block |
| **926×428** compact landscape alt | Device emulation (mobile UA) | Never reached | **No** | Orientation gate | Same gate, same copy |
| **768×1024** tablet-ish | Device emulation @ 75% zoom | Yes — `ssl324-playtest-768@example.com` | Auth + intro only | Welcome / BEGIN OPERATIONS | Phone-card-in-a-void; Landnam auth **500** after signup |
| **~1440×900** desktop | Normal desktop UA, no emulation | **No auth gate** — went straight to intro | Yes | Mining + hub survey | Best visual of the loop; still sparse base; survey again |
| **~1200×277** short landscape | Desktop UA, DevTools docked bottom | Skipped (already in-game) | Yes | Hub (returning) | Gate is **mobile-UA**, not raw short-landscape |

---

## 1. Phone portrait — 390×844

Cold load → `/game/intro` auth sheet. **Continue with Email** created a session immediately (no OTP). Then: Welcome Commander → Build Launchpad → Hub → Mission Board → 433 Eros → Explorer → Confirm Launch → transit → mining.

**Layout:** every primary control was on-canvas. Auth scrolled. Bottom nav (`BASE / MISSIONS / ATLAS / BUILD / MARKET`) stayed reachable. Coach cards did not hide the confirm CTAs.

**What it looks like**

| Screen | Shot | Note |
| --- | --- | --- |
| Auth / Sign In | ![](./staging-playtest/shots/390-01-auth-signin.png) | Planet + “MISSION CONTROL / FLIGHT SYSTEMS READY”. Phone card, full-bleed in the 390 frame. |
| Auth / Sign Up | ![](./staging-playtest/shots/390-02-auth-signup.png) | Email + password + Create Account + Continue with Email all reachable. |
| Build | ![](./staging-playtest/shots/390-03-build-launchpad.png) | Cel hills, one highlighted pad, structure dock. Sparse but readable. |
| Hub | ![](./staging-playtest/shots/390-04-hub-earth-base.png) | One tower, a lot of sky. Coach: “OPEN A MISSION / Tap MISSIONS”. |
| Mission Board | ![](./staging-playtest/shots/390-05-mission-board.png) | Helios Platinum starter, ₣17M, `4 TARGETS`. Card list + step rail. |
| Target | ![](./staging-playtest/shots/390-06-pick-target.png) | Dark map, 433 Eros selected. Map is almost empty. |
| Rocket | ![](./staging-playtest/shots/390-07-select-rocket.png) | Explorer schematic (payload / fuel / engine). |
| Preflight | ![](./staging-playtest/shots/390-08-preflight.png) | Flight cleared checklist. Strong “ops console”, weak “place”. |
| Transit | ![](./staging-playtest/shots/390-09-transit.png) | Stick rocket on a night horizon. |
| Mining | ![](./staging-playtest/shots/390-10-mining.png) | FIRE LASER / FILL ORDER TO RETURN. Tiny ship, brown strip. |
| Hub + survey | ![](./staging-playtest/shots/390-11-hub-survey.png) | PostHog “QUICK QUESTION” covers the base. |
| Returning | ![](./staging-playtest/shots/390-12-hub-returning.png) | Mission card still **IN PROGRESS / Platinum starter → 433 Eros**. |
| Atlas | ![](./staging-playtest/shots/390-13-atlas-locked.png) | **Free Operations Required** — TESS unlocks after the starter contract. Not SSL-10 copy. |
| Build menu | ![](./staging-playtest/shots/390-14-hub-build-menu.png) | NEW STRUCTURE / HANGAR / UPGRADE LAUNCHPAD. |

**Breakage**

- **High — survey covers gameplay.** After mining, a “QUICK QUESTION / How satisfying was placing or upgrading a structure in Earth Base?” sheet sits on the hub. Skip works. This is the standing “surveys must not block gameplay” rule ([SSL-186](https://linear.app/kestloome/issue/SSL-186) was Market; same pattern on Hub).
- **Medium — M1 did not close.** Resume Mission put us back on the asteroid with the order looking filled; **FILL ORDER TO RETURN** spun; hub stayed **RETURNING**. Credits stayed **₣80**. Debrief never appeared. Could be a stuck return *or* an unskippable return transit we left — treat as **needs a second timed sit** before filing as a hard loop-break.
- **Low — Hangar tab** from the hub dock did nothing useful in this session (Launchpad’s own Hangar pill is the real entry).
- **Low — WebGL** `ReadPixels` / SwiftShader warnings in the console while scenes ran.

No clipped primary CTAs at this size.

---

## 2. Phone landscape / compact — 844×390

Device emulation, fresh incognito, mobile UA.

![](./staging-playtest/shots/844-01-rotate-to-portrait.png)

**Exact copy**

> LANDNAM OPERATIONS  
> ROTATE TO PORTRAIT  
> Landnam is currently designed for portrait play on mobile.  
> Turn your device upright to continue.

No auth, no hub, no SSL-299 signup clip to re-measure. Spinner sits above the title. This is what Chrome device-mode (and a real phone landscape UA) gets.

Repo already encodes the policy: `web/cypress/e2e/features/orientation-guard.cy.ts` asserts this overlay at 844×390 and asserts it is **hidden** at 1280×800.

---

## 3. Compact landscape alt — 926×428

Same gate, same copy.

![](./staging-playtest/shots/926-01-rotate-to-portrait.png)

---

## 4. Tablet-ish — 768×1024

Device emulation, 768×1024, DevTools zoom 75%. Fresh account `ssl324-playtest-768@example.com`.

**Layout (the important finding):** the game drew a **rounded phone mockup** (~402×874 card) centered on a large dark field. That is the default `.portrait-canvas` “phone in a frame” treatment. On a 768-wide tablet you want the `max-width: 1023px` full-bleed rule; what we got on staging was the card-in-a-void.

| Screen | Shot | Note |
| --- | --- | --- |
| First paint | ![](./staging-playtest/shots/768-01-intro-phone-card.png) | Mission Control planet + the auth column **clipped off the right** of the phone card. |
| Sign In | ![](./staging-playtest/shots/768-02-auth-signin.png) | Stacked form fits. Native “Please fill out this field.” on empty submit. |
| Sign Up | ![](./staging-playtest/shots/768-03-auth-signup.png) | Email, password, Create Account, Continue — all visible. **No confirm-password field.** SSL-299 does **not** reproduce here. |
| Welcome | ![](./staging-playtest/shots/768-04-welcome-commander.png) | Scenic intro inside the phone card. Dead margin everywhere. |
| After signup | ![](./staging-playtest/shots/768-05-auth-exchange-500.png) | Console: `POST …/api/landnam-auth/exchange` **500**. Session sat on intro. |

**Breakage**

- **High — tablet composition.** Phone card + black void. First auth paint clips the form. Fights “every screen must work at desktop/tablet, not just phone portrait.”
- **High — auth exchange 500.** Signup appeared to succeed, then Landnam token exchange failed. Progression stopped at Welcome / BEGIN OPERATIONS. Need Liam if this is a known staging PocketBase flake vs a new regression.

We did **not** get a tablet Hub/Missions pass because of the 500.

---

## 5. Desktop — ~1440×900 (and a short-landscape resize)

Normal desktop UA, incognito. **No auth gate** — cold load went to the scenic intro and we played as an unsigned / `NOT SYNCED` session. That is in tension with [SSL-273](https://linear.app/kestloome/issue/SSL-273) (no play without an account). Worth a product check: is desktop guest-on-intro intentional, or did the gate lose the race?

### Desktop early path

| Screen | Shot | Note |
| --- | --- | --- |
| Intro | ![](./staging-playtest/shots/desk-01-intro.png) | Best frame in the session. Misty range, wireframe shuttle, “Welcome, Commander.” This *is* the TSP / agency beat. |
| Build | ![](./staging-playtest/shots/desk-02-build.png) | Full-bleed hills, four pads, truncated structure labels (`Satellite Ma…`, `Deep Space …`). |
| Pad selected | ![](./staging-playtest/shots/desk-03-build-selected.png) | Giant cyan confirm bar. Clear. |
| Hub | ![](./staging-playtest/shots/desk-04-hub.png) | One tower in a prairie. No bottom tab bar (desktop policy). Coach: click the Launchpad. |
| Launchpad | ![](./staging-playtest/shots/desk-05-launchpad.png) | Tower + hangar shed, CONTRACTS CTA. Scene-first, good. |
| Mission Board | ![](./staging-playtest/shots/desk-06-mission-board.png) | Dark list + **light editorial detail column**. Helios Platinum / Palladium / Ferrous bulk. ₣17M. |
| Target | ![](./staging-playtest/shots/desk-07-pick-target.png) | Wide empty map + 433 Eros rail. |
| Rocket | ![](./staging-playtest/shots/desk-08-select-rocket.png) | Blueprint Explorer. Dashboard, not a vehicle in a hangar. |
| Preflight | ![](./staging-playtest/shots/desk-09-preflight.png) | Same checklist, more air. |
| Transit | ![](./staging-playtest/shots/desk-10-transit.png) | Same stick rocket, now on a huge black field. |
| Mining start | ![](./staging-playtest/shots/desk-11-mining-start.png) | FIRE LASER live; return disabled. |
| Mining later | ![](./staging-playtest/shots/desk-12-mining-progress.png) | Laser works; return stayed “FILL ORDER TO RETURN”. |
| Hub + survey | ![](./staging-playtest/shots/desk-13-hub-survey.png) | Same PostHog sheet as portrait. Mission still IN PROGRESS. |

**Launchpad hitbox:** first clicks on the Hub tower missed; opening `/game/launchpad` via the scene eventually worked. Medium — scene-first only works if the tower is an easy hit.

**Settings / Friends / Market** were not found as obvious desktop chrome in the time we had (no bottom dock). Settings is a small gear in source; we did not land on it in this pass.

### Short landscape, desktop UA

DevTools docked to the bottom (~1200×277 content). **No rotate gate.** Hub laid out in a thin strip: tower, returning-mission card, EDIT · BUILD / SUBSURFACE.

![](./staging-playtest/shots/desk-14-short-landscape-no-gate.png)

So: **phone landscape UA = blocked; desktop UA short window = playable (cramped).** SSL-299 still cannot be tested without a mobile UA, which trips the gate first.

---

## Style / feel vs the bar

**Bar:** citizen-science hub in space; sci-fi dashboard × space agency × Tiny Space Program (cherished base, send/return payoffs, not survey forms).

| Beat | Matches | Fights |
| --- | --- | --- |
| First impression | Desktop intro (commander, range, shuttle) and mobile Mission Control planet are the right fantasy. | Tablet first paint is a clipped phone toy on a void. |
| Earth Base | Launchpad placement + tower appearing is a real “I built this” tick. Launchpad scene (tower + hangar + Contracts) is the closest to TSP. | After one structure the hub is empty sky. No people, clutter, or cherished junk. |
| Send / return | Contract → target → Explorer → launch is legible. Helios / ₣17M / 433 Eros feel like a job. | Payoff never landed (no debrief, credits unchanged). Transit/mining are diagrams. |
| Citizen science | Atlas lock copy is honest: TESS after the starter contract. | We never got a live feed, so SSL-10 is **unconfirmed** on this build. |
| Dashboard chrome | Uppercase labels, cyan commands, coach rail, step footer. Amber not used as generic chrome. | PostHog survey is a generic product form on top of the base. `NOT SYNCED` is always on. |
| Survey-not-forms | Mining is a verb (fire laser). | The first emotional beat after the run is a 1–5 rating sheet. |

---

## Bug list

Do **not** treat this as a “mark Done” list. Existing tickets stay where they are.

| # | Sev | Summary | Repro | Related |
| --- | --- | --- | --- | --- |
| B1 | Blocker (phone landscape) | `ROTATE TO PORTRAIT` hard-stops 844×390 and 926×428 under mobile UA | Incognito + device emulation + those sizes → `/game/intro` | Policy in `orientation-guard.cy.ts`. Blocks re-test of SSL-27 / SSL-299. |
| B2 | High | PostHog “QUICK QUESTION” covers Earth Base after first structure/mission moment | Complete build + first mining return on 390 or desktop | SSL-186 pattern; standing survey rule |
| B3 | High | Tablet 768×1024 = phone card in a void; first auth paint clips the form | Device emulation 768×1024, cold `/game` | SSL-141 / SSL-21 family (composition) |
| B4 | High | `POST /api/landnam-auth/exchange` **500** after tablet signup | `ssl324-playtest-768@example.com` Sign Up | Auth reliability (SSL-168 is Done) |
| B5 | Medium | Desktop cold load skipped the auth gate (`NOT SYNCED` guest play) | Incognito desktop UA → intro → build | SSL-273 |
| B6 | Medium | M1 debrief / payout not observed; hub stays RETURNING | 390 + desktop after mining | Confirm with a long sit on transit before new ticket |
| B7 | Medium | Desktop Hub launchpad hitbox easy to miss; no bottom Missions tab | Click the tower vs empty grass | Scene-first risk |
| B8 | Low | Persistent `NOT SYNCED` on desktop/tablet | Every frame after intro | SSL-9 family / sync |
| B9 | Low | Structure dock labels truncate on desktop Build (`Satellite Ma…`) | `/game/build` wide | Copy / dock width |
| B10 | Info | Atlas = **Free Operations Required**, not **Live Feed Unavailable** | Open ATLAS before M1 debrief | SSL-10 **not reproduced** (PR #72 still relevant for when the feed is reached) |

---

## What Liam would need to reply (only if we continue this account)

We did **not** need a shared password for the 390 Continue-with-Email path. If you want a returning-player or production-account pass:

- a staging email/password you are happy for this agent to use, **or**
- confirm guest desktop play is allowed.

Tablet 500: if that exchange URL (`…-landnam-flv.dev/api/landnam-auth/exchange`) is a known sick backend, say so and we will not file it.

---

## SSL-10 / citizen science

Not the SSL-10 symptom. Staging Atlas, pre-Free-Ops:

> Free Operations Required  
> TESS candidate downloads unlock after the first contract…

No Transit Telescope console, no “The shared TESS subject feed could not be reached.” Re-test SSL-10 after an M1 that actually debriefs (or a seeded Free Ops save).

---

## Session notes

- Accounts used: `ssl324-playtest-390@example.com` (email-only), `ssl324-playtest-768@example.com` (password signup), desktop guest.
- First contract: Helios Propulsion Depot — Platinum starter — ₣17M — 433 Eros — Explorer.
- Console on 390: missing `id`/`name` on a form field; WebGL ReadPixels / SwiftShader.
- Manifest still declares `"orientation": "portrait"`.
- Local `GameApp.tsx` on this checkout does **not** contain the overlay string; staging and `orientation-guard.cy.ts` do. Staging and this snapshot may be slightly apart — the live gate is real either way.
