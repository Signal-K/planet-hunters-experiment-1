# Earth Base layout standard — feasibility and gap audit

**Date:** 25 Sep 2026. **Scope:** investigation only. **Code read:** `main` at `f272de76` (PRs #84–#89 plus the #96 sprint merge, including SSL-75).

Locked standard (Liam, 24–25 Sep; [SSL-340](https://linear.app/kestloome/issue/SSL-340)): top meta + time + Hub; full-bleed Base that never moves or scales; sky craft and space infra that need a tap; tap buildings; bottom bar is « » + Market + Menu (Garden opens from Menu; Market is a pop-up). Old always-on chrome is gone. Phone type and icons get larger. Trays open over a scrim. After the tutorial, access is limited by money. Mission state stays in `game_states` JSON.

## Verdict

Home on a phone already has the locked bar. Market already opens over that landscape. Everything else still replaces the Base, and desktop is the same phone chrome stretched full-bleed. Rolling the standard out is feasible on the existing `ScreenFrame` (`web/lib/screen-layouts.ts`, `web/components/layout/frame/`). The hard work is lifting chrome out of `HubScreen` and turning Base-resident tools into scrim trays. SSL-75 already opened structures and vehicles after the tutorial; that is not remaining layout work.

Rough remaining effort: **two L, three M**. No PocketBase migration.

## What #86–#89 already shipped

| Standard | Shipped | Where |
|---|---|---|
| Top: OPS + balance, time, Hub. No "Base" title | Yes, on Home | `HomeChrome.tsx` `HomeTopBar` |
| Sky rockets that need a tap | Partial. Text chips for mining / arrived / on-pad. Idle sky is empty | `HomeSkyRockets`, `lib/mission-runs.ts` |
| Space infra in the sky | Separate orbital widget, only after a telescope is launched or the deep-space telescope is built. Deep-space telescope is also a ground building | `OrbitalInstrumentNetwork` in `HubScreen.tsx` |
| Tap buildings | Yes | `onFocusBuilding` in `GameScreenRouter.tsx` |
| Bottom « » + Market + Menu. Garden off the bar | Yes, on Home. Garden is a Menu row (external suite hop) | `HomeBottomBar`, `MenuSheet.tsx` |
| Market pop-up over Base. `/game/market` retires | Yes, when `freeOperations` is true | `MarketPopup.tsx`, router effect |
| 4-tab dock, corner Feedback / Friends / Community, "Base" h1 | Removed from the Home tree | PR #86 |
| Menu holds Build, Subsurface, Mission Log, Sites, Garden, Friends, Community, Feedback, Sign out | Yes | `MenuSheet.tsx` |
| Eight layout shells | Yes. Chrome mode is per surface, filled by each screen | `SCREEN_SURFACES` |
| Mission JSON (`missionPhase`, `arrivalAt`, `pausedMissionRuns[]`) | Already the save shape | `lib/game-types.ts` |
| Orbit « » when two or more runs exist | Yes, and only there besides Home | `MissionSwitch.tsx` |
| After the tutorial, structures and vehicles are limited by cost | Yes, as of SSL-75 in #96. `structureUnlocked` returns true in Free Ops. `missionsRequirementMet` treats `missionsDone >= 3` as enough. Rockets and parts with `locked: true` stay unavailable (unfinished content, not a progress ladder) | `web/lib/data/structures.ts`, `web/lib/data/tutorial-gates.ts` |
| Sites survives a reload once Free Ops is on | Yes. `repairStateRoute` only sends `surface-ops` back to Home when Free Ops is off. `/game/hub-subsurface` now redirects to `/game/hub`; the slide is UI state | `web/lib/game-state.ts`, `web/next.config.ts` |

## Delta still open

| Gap | Evidence |
|---|---|
| Chrome is Home-only. Transit, mining, Instrument Hub, debrief, and setup have their own headers and no Market / Menu / Hub | Live shots below. Probe: those screens have `home-market-button` and `settings-button` absent |
| Menu, Friends, Feedback, and Community cover the Base with an opaque full-page surface (`background: var(--ln-void)`). Market is the only scrim tray | `PageSurface` + `.ln-page-surface`; `.shell-instrument-layer` |
| Subsurface slides the campus 100% upward. Entering Hub/Launchpad also scales the world from 1.16 (off at ≤640px) | `HubScreen.tsx` `earth-base-campus-transition`; `globals.css` `earth-base-approach` |
| Progression card still floats on the landscape after tutorial ("Launch a transit telescope" on the free-ops hub preset) | `ProgressionCard` render in `HubScreen.tsx`; `phone-home-idle.png` |
| Phone labels are 8–11px. Desktop only adds padding at 1024px | `HomeChrome.module.css` |
| Market, Sites, and Instrument Hub routes stay behind Free Ops | That flag is the tutorial boundary (`missionsDone >= 3`), which matches "after the tutorial". It is not a second ladder | `GameScreenRouter.tsx` `showMarket` |
| A deep-space telescope story mission is still injected from satellite level and client affinity | The building itself is buyable in Free Ops. The story on-ramp remains | `web/lib/runtimeCatalog.ts` |
| No player keyboard for the bar. Mining still uses Space / F | `MiningScreen.tsx` |
| Dead CSS still describes a desktop side rail and a bottom tab bar | `.hub-desktop-nav`, `.bottom-tab-bar` in `globals.css` |

## Feasibility

Keep the eight surfaces. Add one chrome policy on top of them.

| Layer | Change | Size | Why it is hard |
|---|---|---|---|
| Shared chrome | Render top bar + « » + Market + Menu from `GameChrome` for every non-dev surface. `HubScreen` stops owning the slots | L | Each screen already paints its own `TopBar`, step footer, or command dock. Floating chrome will cover Mining's fire control and Debrief's collect button unless those docks shrink |
| Base trays | Menu, Build, Subsurface, Mission Log, Friends, Feedback, Community use the Market overlay slot (scrim, landscape stays mounted and untransformed) | L | Subsurface is a second half of a 200%-tall slider inside `HubScreen`, not a sibling sheet. Community is a second `ScreenFrame` |
| Sky | One sky slot: attention craft (mining / arrived / waiting) and owned telescopes, tappable, clear of the ground line | M | Two implementations today (chips vs `OrbitalInstrumentNetwork`). No preset or e2e drives an arrived chip |
| Phone type + desktop geometry | Larger bar type/icons. Desktop stays full-bleed, trays centered (Market already is). Arrow keys switch runs, Esc closes a tray. Delete dead nav CSS | M | 8pt spacing rhythm still applies; type can grow, padding cannot invent new steps |
| Test migration | Cypress still clicks `bottom-tab-missions` and asserts a Base `h1`. #96 did not retire those specs | M | The selectors are gone from the app, so the suite is already red against current Home |

Departure scenes (launch, orbit, mining, takeon, instrument consoles) keep their own playfield. They share the chrome. They do not render the Earth Base behind a mining canvas.

### Desktop

Same chrome model as the phone. A side rail would fight the 24 Sep sketch and the comment already in `globals.css` ("Desktop has NO persistent global navigation").

| | Phone (~390×844) | Desktop (~1440×900) today | Desktop target |
|---|---|---|---|
| Playfield | Full-bleed Home | Full-bleed via `.portrait-canvas--full-page` (the 1320px card rule does not apply) | Same full-bleed. Empty side margins stay empty |
| Top / bottom | Floating over the world | Same components, 16/32px padding | Same. Do not dock them into a sidebar |
| Trays | Market is a bottom sheet. Menu is an opaque page | Market is a centered ~880px card. Menu is still an opaque page | Every Base tray uses the Market pattern |
| Keyboard | None for nav | None for nav | Left/Right = « », Esc = close tray, M = Market |
| Progression card | Full-width stack over the ground | Right stack, `min(340px, 30vw)` | Removed. Prompts move to sky or Menu |

## Break points

Where something is reached today, where the standard puts it, and what fails if the old chrome is simply deleted (most of it already is).

| Feature | Reached today | Lives under the standard | Risk |
|---|---|---|---|
| Market | Home bottom bar, or `/game/market` → Home + pop-up. Hidden until Free Ops (end of tutorial) | Pop-up over Base. Visible once the tutorial is done; buying still costs money | Low for the gate. High for reachability: the button exists only on Home |
| Menu / settings / sign out | Home bottom bar only. PR #89 removed the corner pill on other screens | Same button on every live screen. Account stays inside Menu | High. A player in transit, mining, or Instrument Hub cannot open Menu |
| Garden | Menu → external suite hop (`lib/suite-hops.ts`) | Menu. The 24 Sep mock still draws it on the bar; the 25 Sep Linear lock wins | Low |
| Hub / classify / TESS | Home "HUB" leaves the landscape for `instrument-hub`. Legacy `galaxy` is the inspect handoff | Hub button stays. Console is a departure scene that should keep the shared chrome | Medium. The console is reachable; the return path is that screen's own back control |
| Deep-space telescope | Ground building → `asteroid-discovery`, and a sky widget once built | Sky infra tap, building tap can stay as the same destination | Medium. Two affordances, easy to miss which one is the standard |
| Transit telescope | Not a plot. Sky widget after `transitSatelliteLaunchedAt`. Progression card nags until then | Sky, once owned. The nag card goes away | Medium. Idle free-ops hub shows the card and an empty sky (`phone-home-idle.png`) |
| Launchpad / contracts | Building tap → `launchpad` → mission setup. Tutorial coach targets `building-launchpad` | Building tap. Setup is a departure scene | Low for the tutorial. Medium once setup has no shared Menu |
| Hangar, Academy, Refinery, Skills | Building tap or progression card → full instrument screen | Building tap. Skills prompt moves off the playfield into the building or Menu | Medium. Skills has no building in the sprite set (`EarthBaseModules` art is launchpad, silo, hangar only) |
| Build / place | Menu → `build`, which replaces Home | Scrim over the still landscape | Medium. Route repair already refuses to resume a free-ops player onto Build |
| Subsurface | Menu calls `setSubsurfaceView(true)`. The campus slides. `/game/hub-subsurface` redirects to `/game/hub` and does not open the slide | Scrim tray. Landscape transform stays identity | High. The slide is the feature's only presentation, and the old URL no longer opens it |
| Mission Log | Menu → `mission-history` | Menu tray or instrument page with shared chrome | Low |
| Sites | Menu row once Free Ops is on → `surface-ops`. Reload keeps the screen. The route comment still says "Hub dock" | Departure scene or tray, with the shared chrome | Medium. The reload trap is gone. The screen still abandons the Base, and Menu is the only door |
| Feedback | Menu → opaque sheet | Menu, over a scrim | Low |
| Friends / Community | Menu → opaque sheet / second instrument frame | Menu trays | Low |
| Resume / mission switch | Home sky chip + bottom run chip. Orbit switch only when `runs.length >= 2`. Progression "Resume Mission" card is skipped while a run is active | Sky for "needs a tap". « » on every live screen, including a single run's chip | Medium. One in-flight run shows no switch on Orbit |
| Tutorial | M1–M3 coach. Market hidden. Steps point at the Launchpad | Unchanged until the tutorial ends. Then the money-only rule applies | Medium if chrome moves and `coachId`s are not re-aimed |
| Auth / profile | Signed-out visitors get `LandingFlow`. Menu shows email + Sign out. No profile screen | Landing stays its own surface. Profile stays in Menu | Low |
| Deep links | `GAME_ROUTES` maps every `/game/*` path. `market` redirects into the pop-up. `landing` URL is `/game/descent` | Keep the table. Overlays still need a URL (`/game/market` already does) | Medium for any new tray that forgets a path |
| Push opt-in | Desktop-oriented slot on Home during free ops | Stays off the playfield, inside Menu or a dismissible sky chip | Low |

## Evidence

### Live shots (25 Sep 2026)

Dev server, `?preset=` (skips the auth gate). Chrome at 390×844 and 1440×900. Presets: `telescope-hub` (free ops, tutorial done), `m1-hub`, `telescope-transit`, `m3-mining`, `ui-instrument-hub`. `HomeChrome.tsx` and `HubScreen.tsx` are unchanged between that server and `f272de76`, so the shots match current Home chrome. #96 only removed the M1 "browse contracts" card, which these free-ops shots do not show.

No preset puts an arrived or mining craft in the Home sky, so that frame of the v2 mock was not captured. `home-sky-rocket` count on every Home shot was 0.

| Shot | What it shows |
|---|---|
| [phone-home-idle.png](layout-audit-screenshots/phone-home-idle.png) | OPS 3, balance, clock, HUB, Market, Menu. Progression card over the pad. Empty sky |
| [phone-home-market.png](layout-audit-screenshots/phone-home-market.png) | Market sheet over a dimmed Base. `data-layout` stays `home` |
| [phone-home-menu.png](layout-audit-screenshots/phone-home-menu.png) | Menu replaces the view (Build, Subsurface, Mission Log, Sites, Garden, Friends, Community, Feedback) |
| [phone-home-tutorial.png](layout-audit-screenshots/phone-home-tutorial.png) | M1 coach on the Launchpad. Market button absent |
| [phone-transit.png](layout-audit-screenshots/phone-transit.png) | Orbit header "Earth Orbit". No Home bar |
| [phone-mining.png](layout-audit-screenshots/phone-mining.png) | Mining layout. No Home bar |
| [phone-instrument.png](layout-audit-screenshots/phone-instrument.png) | Instrument Hub as its own page |
| [desktop-home-idle.png](layout-audit-screenshots/desktop-home-idle.png) | Same chrome, wider padding, card on the right |
| [desktop-home-market.png](layout-audit-screenshots/desktop-home-market.png) | Centered Market card, Base still behind it |
| [desktop-home-menu.png](layout-audit-screenshots/desktop-home-menu.png) | Opaque Menu on a wide viewport |
| [desktop-transit.png](layout-audit-screenshots/desktop-transit.png) | Flight screen, no shared bar |
| [desktop-mining.png](layout-audit-screenshots/desktop-mining.png) | Mining, no shared bar |
| [desktop-instrument.png](layout-audit-screenshots/desktop-instrument.png) | Instrument Hub, no shared bar |

Older 375×812 references from the SSL-35 PRs: `web/design-reference/ssl-35-layouts/pr3-home-375x812.png` through `pr6-shells-b-375x812.png`.

### Tests that will break or need a rewrite

Playwright is not set up. E2E is Cypress (`web/cypress/e2e`, 53 specs). Unit entry is `npm run test:unit` (scene-surface verify + Vitest, 118 files at the SSL-35 merge).

These still look for the retired dock, the "Base" heading, or the desktop missions button:

| File | Asserts | Risk |
|---|---|---|
| `cypress/e2e/journeys/tutorial-m1.cy.ts` | `bottom-tab-*`, `hub-desktop-missions-btn`, Base heading | High |
| `cypress/e2e/responsive/critical-screens-matrix.cy.ts` | 3-tab dock vs desktop missions button; Hub → Market as a page | High |
| `cypress/e2e/features/ui-zones.cy.ts` | `bottom-nav` visibility by breakpoint | High |
| `cypress/e2e/features/orientation-guard.cy.ts` | `.bottom-tab-bar` + settings on phone landscape | High |
| `cypress/e2e/features/tutorial-rail.cy.ts` | Missions tab visibility; ProgressionCard vs coach | High |
| `cypress/e2e/regression/hub-progression-cards.cy.ts` | Card clicks route to skills / missions / launchpad | High |
| `cypress/e2e/visual/hub-launchpad-layout.cy.ts` | `h1` is Base or Subsurface | High |
| `cypress/e2e/visual/sprint-11-hotfix.cy.ts` | Base heading, `hub-subsurface-btn`, desktop missions button | High |
| `cypress/e2e/visual/full-release-matrix.cy.ts` | Tab helpers and Base heading | High |
| `cypress/e2e/visual/earth-base-redesign.cy.ts` | Subsurface from a hub button, not Menu | High |
| `cypress/e2e/regression/returning-player-entry.cy.ts` | Base heading on `/game/hub` | High |
| `cypress/e2e/regression/bug-hunt.cy.ts` | Back from transit expects `bottom-tab-missions` | High |
| `cypress/e2e/journeys/c1-c4-viewport-matrix.cy.ts` | `/game/market` as a full screen | High |
| `cypress/e2e/features/m3-territory.cy.ts` | `bottom-tab-missions` after M3 | High |
| `cypress/e2e/visual/visual-qa.cy.ts` | `home-top-bar` (this one matches the new chrome) plus a full M1 loop | Medium |
| `cypress/e2e/visual/market-layout.cy.ts` | Deep link `/game/market`, "Commodity Exchange" header | Medium |
| `components/game/TutorialCoach.test.tsx` | Coach ring suppression for `bottom-tab-missions` | High |
| `components/game/MissionSetupRoutes.test.ts` | Home frame slots and « » relay in source | Medium |
| `lib/screen-layouts.test.ts` | Every screen maps to one surface | Low, unless trays stop being routes |

### Flows with no spec

| Flow | Coverage |
|---|---|
| Sky craft tap (`home-sky-rocket`) | None. No preset builds an attention run on Home |
| Home « » (`home-mission-prev` / `home-mission-next`) | None. Orbit switch is source-only |
| Market button (`home-market-button`) and Menu → Build (`menu-build`) | None. Market e2e still opens the old page URL |
| Subsurface from Menu | None. Older specs click a hub button that is gone |
| Building tap → hangar, academy, telescope | Partial (launchpad / silo / refinery only) |
| Desktop 1440 Home chrome contract | None. 1440 shots exist for Market and rockets, not for the bar |
| Keyboard nav | None |
| Garden row | Unit test of the hop URL only (`lib/suite-hops.test.ts`) |

## Proposed tickets

Parent: [SSL-35](https://linear.app/kestloome/issue/SSL-35) is Done. File the epic under the Landnam team, R1 milestone, and link this audit.

### Epic — Earth Base chrome on every live screen

**Size:** container for two L tickets and three M tickets. **Depends on:** nothing else in this list.

**Scope**

- One floating chrome model on phone and desktop for every non-dev surface.
- Base tools open over a scrim. The landscape does not slide or scale.
- SSL-75 already made post-tutorial structures and vehicles cost-limited. This epic does not reopen that.

**Not in scope**

- New buildings, new mission types, Market economy.
- A desktop sidebar.

**Done when**

- A stranger can switch runs, open Market, and open Menu from Home, transit, and mining without hunting.
- `docs/layout-standard-audit.md` break-point rows for those three are closed.

### 1. Shared floating chrome on every live surface

**Size:** L. **Depends on:** epic.

**Scope**

- Move `HomeTopBar` and `HomeBottomBar` from `HubScreen` into `GameChrome`, driven by `surfaceForScreen`.
- Show « » on orbit, mining, takeon, instrument, setup, and debrief. One run still shows its chip.
- Shrink per-screen headers that repeat title, back, and balance so the floating bar does not cover the primary control.
- Menu and Market toggle from that bar on every live surface.

**Not in scope**

- New sky art. Unlock rewrite.

**Done when**

- At 390×844 and 1440×900, transit and mining show OPS, Hub, « », Market, and Menu.
- Esc is not required for this ticket. A unit test lists which surfaces mount the shared bar.

### 2. Base trays over a still landscape

**Size:** L. **Depends on:** 1 (shared overlay slot).

**Scope**

- Menu, Build, Subsurface, Mission Log, Friends, Feedback, and Community use the Market scrim pattern. Landscape stays mounted.
- Remove the 200% subsurface slide and the `earth-base-approach` scale.
- Give each tray a stable URL or confirm the existing one (`/game/market` is the model).

**Not in scope**

- New subsurface rooms. Moving Sites off its own screen.

**Done when**

- Opening Subsurface and Menu does not change the landscape transform.
- Closing the tray returns to the same Base frame. Shots at 390×844 and 1440×900.

### 3. Sky craft and telescopes; remove the progression card

**Size:** M. **Depends on:** 1 for the sky slot. Can start on Home alone.

**Scope**

- Delete `ProgressionCard` from Home. Skill and telescope prompts move to the building, the sky, or Menu.
- Sky shows mining / arrived / waiting craft and owned telescopes (transit and deep-space), each tappable.
- Keep building taps as they are.

**Not in scope**

- New building sprites. Illustrated ships beyond the existing glyph, unless a chip fails the "needs a tap" test.

**Done when**

- Free-ops idle hub has no `progression-card-*` node.
- A fixture with an arrived run shows one sky control, and activating it resumes that run.
- A built telescope is tappable in the sky and opens Instrument Hub or asteroid discovery.

### 4. Phone type scale, desktop trays, keyboard

**Size:** M. **Depends on:** 1 and 2 for the final geometry. Type scale on Home can land first.

**Scope**

- Raise Home/bar label size into the readable range (current eyebrows are 8–11px) on a 390px width, still on the 8pt spacing scale.
- Desktop: full-bleed playfield, centered trays, no side rail.
- Left/Right switch the selected run. Esc closes the open tray. M toggles Market.
- Delete unused `.hub-desktop-nav` and `.bottom-tab-bar` rules.

**Not in scope**

- A desktop-only information architecture.

**Done when**

- Bottom labels are at least 12px at 390×844.
- At 1440×900, Market and Menu are centered cards over the Base.
- Esc closes Market. A unit or Cypress test covers that key.

### 5. Point Cypress and unit tests at the new chrome

**Size:** M. **Depends on:** 1–3 for the assertions. Can land file-by-file beside them.

**Scope**

- Rewrite the high-risk specs in the table above off `bottom-tab-*`, `hub-desktop-missions-btn`, and the Base `h1`.
- Add coverage for sky tap, « », Menu → Subsurface, `/game/market` pop-up, and one 1440×900 Home bar check.

**Not in scope**

- A new Playwright suite.

**Done when**

- `npm run test:unit` passes.
- The visual and tutorial-rail Cypress profiles pass against the shared bar.
