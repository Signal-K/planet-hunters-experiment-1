# Landnam visual style audit — 3 Oct 2026

Read-only capture of the game as it renders today, so a Map restyle can match the live screens instead of a third style. No product code was changed.

Epic: [SSL-423](https://linear.app/kestloome/issue/SSL-423/landnam-one-visual-style) (stories [SSL-424](https://linear.app/kestloome/issue/SSL-424) through [SSL-430](https://linear.app/kestloome/issue/SSL-430)). The locked direction is the light blueprint theme ([SSL-13](https://linear.app/kestloome/issue/SSL-13), [SSL-72](https://linear.app/kestloome/issue/SSL-72)). This audit records what the build actually paints.

## How it was captured

Staging deploys from every non-`main` push whose CI build passes (`.github/workflows/web-ci.yml`, job `deploy-staging`, worker `landnam-web-staging`). That branch is `cycle/3`.

| Build | SHA | Role |
| --- | --- | --- |
| `origin/cycle/3` HEAD | `1a562763` | What was screenshotted. Local `next dev` with in-memory `?preset=` |
| Last green staging deploy | `e10c777a` (30 Sep 2026) | What the staging worker is serving. HEAD is 17 commits ahead; those pushes failed CI, so they are not on the worker. The extra commits are the Flight Plan strip, Hangar title, and contract-layout fixes, so HEAD is the right “latest dev” picture |
| `origin/main` | `7d4e1c9c` | 75 commits behind `cycle/3`. Not what players on the dev branch see |
| Map rebuild | `claude/modest-bardeen-0co8zl` @ `84f510ff` | [SSL-370](https://linear.app/kestloome/issue/SSL-370). Built and captured separately |

Viewports: phone portrait 390×844 and desktop 1280×800. Presets are the DEV in-memory set (`?preset=`), which skips the auth gate. The auth gate itself is `/game` with an empty session. The DEV badge is hidden in the frames so it does not cover the corner; it is a 10px green “DEV” chip at the top left in development and staging. PocketBase was not running, so a “DATA LINK · CONNECTING” banner sits on many frames and Friends / Community show “Failed to fetch”. That banner is environment, not the house style.

Shots: [`visual-style-audit-2026-10/`](./visual-style-audit-2026-10/). Contact sheets: [phone](./visual-style-audit-2026-10/contact-phone.png), [desktop](./visual-style-audit-2026-10/contact-desktop.png).

## House style

The build is three themes at once. The one mission setup uses, and the one SSL-423 says to spread, is blueprint paper with navy ink. Measured in the browser on the live Map step.

### Tokens that the blueprint screens actually resolve

| Token | Hex | Where it shows |
| --- | --- | --- |
| Page paper `--ln-blueprint-bg` | `#eef3f8` | Mission-setup page wash |
| Card `--ln-blueprint-paper` / stage fill | `#ffffff` | The setup stage |
| Ink `--ln-blueprint-ink` | `#0f2436` | Text,  borders, shadow tint |
| Ink dim / mute | `#48596a` / `#7c8ea0` | Secondary copy when the blueprint class is on |
| Primary fill `--ln-ok` | `#5ad07e` | Confirm / accept buttons. Text on them is ink `#0f2436` |
| Blueprint blue `--ln-blueprint-blue` | `#1f78c1` | Links and the map’s reachable orbit |
| Dark-theme cyan `--ln-cyan` | `#70d9ea` | Flight Plan, bottom nav current state, auth glow |
| Amber `--ln-amber` | `#f5a623` | Flagged below. Sun disc, payouts, Helios |
| Warn | `#ffb347` | Status pills, and the sun’s sampled centre reads this orange |
| Charcoal void / panel | `#0a0a0c` / `#1c1c20` | Bottom nav, dark scenes, menu sheets |
| Cream editorial | `#f4f1ea` page, `#faf8f3` surface, text `#1c1a14` | Market, Hangar registry, Academy |

`:root` is still the charcoal command-deck palette. `.theme-blueprint` exists in `web/app/globals.css` and is duplicated there, but almost no screen adds the class. Mission setup hard-codes the blueprint hexes in `MissionSetupRoutes.module.css`. `.theme-light` and `.theme-deep` are still applied per screen.

### Borders, radius, shadow

Measured on the Map step.

| Piece | Phone 390px | Desktop 1280px |
| --- | --- | --- |
| Setup stage | 3px solid `#0f2436`, radius 5px, shadow `0 6px 0` ink at 42% | 4px solid `#0f2436`, radius 8px, shadow `0 10px 0` ink at 42% plus a blur `0 18px 40px` at 24% |
| Header chips (back, title, step) | 3px ink, radius 5px, shadow `0 4px 0` ink at 42%. Phone row is 40px tall; step labels hide and only the numbered circles remain | Same 3px / 5px / 4px offset. Step chips also show the word (CONTRACT, MAP, BLUEPRINT, REVIEW) |
| Primary button | Map confirm: 2px ink, radius 5px, shadow `0 3px 0` ink at 72%, fill `#5ad07e`, type 800 12px. Other primaries drop to 9px at this width | 3px ink, radius 5px, shadow `0 5px 0` at 72%, fill `#5ad07e`, type 800 12px |
| Bottom nav | Bar `#0a0a0c`, 1px top hairline `rgba(255,255,255,0.14)`. Buttons uppercase, radius 8px, no fill. Current page gets a cyan wash | Same bar. The readout “OPS n” appears from 600px up |

Shadows on blueprint cards are hard offsets. The desktop stage is the one place a blur is added under the offset. There is no pure-black stamp.

### Type

Both faces load from `/fonts`: **Oxanium** (display and body) and **Turret Road** (mono labels on the map).

The token scale in `:root` (`--ln-fs-display` 72px down to `--ln-fs-micro` 13px) is not what ships. Live mission-setup type, measured or from the phone media rules:

- Screen title in the header: Oxanium 800, 15–16px phone / 21px desktop, ink
- Contract name: Oxanium 800, `clamp(22px, 4.5vw, 34px)` phone, up to 68px desktop, tracking `-0.025em`
- Step words, kickers, button labels: Oxanium 800, 7–12px, tracking about `0.11–0.14em`, uppercase
- Map body names: Turret Road 700, about 12px, on a small ink rectangle
- Body sentences (contract description, market lede): Oxanium 600, 14px, 1.45 line height

[SSL-430](https://linear.app/kestloome/issue/SSL-430) asks for body and map labels at 14px or more. A lot of live chrome is under that (7–12px).

### Components to copy

- **Primary:** green `#5ad07e`, ink text, ink outline, 5px radius, hard offset shadow, uppercase Oxanium, a 22px stroke icon (2px round cap, unfilled) on the left.
- **Header chip:** white, 3px ink, 5px radius, 4px offset, optional 7px green bar on the left edge of the title.
- **Step rail:** four chips. Current chip fills green. Complete steps fill the number circle green. Phone shows numbers only.
- **Icons:** single-weight 2px strokes. Bottom nav is words only (OPS, HUB, « », MARKET, MENU). No icon tab bar.
- **Bodies on the map:** faceted polygons for asteroids, circles for planets, composition fills (carbon `#3c3a36`, stony `#8a6040`, metal `#8090a0`, ice `#7ec8dc`, Mars `#c1440e`, Earth `#2a6ea4`). Stroke about 1.5px in the body’s own colour, cyan when selected. A cyan ring marks a reachable unselected body. Selection is a cyan reticle (circle plus crosshair). The sun is two amber circles (`#f5a623` and the soft amber) with “SUN” set in the disc.

## Per scene

“Matches” means the scene is the blueprint system above (paper, ink outline, offset shadow, Oxanium, green primary). Partial means the chrome or one card matches and the scene art does not.

| Scene | Shot | Matches | What it actually is |
| --- | --- | --- | --- |
| Auth gate | `01-auth-gate` | N | Dark charcoal sheet over a dusk Earth. Cyan glow `#70d9ea`, “MISSION CONTROL”. Sign-in type is a light form on the dark sheet |
| Intro | `02-intro` | N | Full-bleed Earth photograph, white “BEGIN OPERATIONS”. A Flight Plan strip is already mounted |
| Earth Base, tutorial | `03-earth-base-tutorial` | Partial | Painted sky and ground, sprite launchpad. HUD type sits on the painting. Flight Plan is a dark strip, not a paper card |
| Earth Base, storage lesson | `04-earth-base-storage` | Partial | Same painting. Flight Plan still says “Open client contracts” |
| Earth Base, needs attention | `05-earth-base-needs-attention` | Partial | Free-ops base. Callout copy “Launch a transit telescope” with Open Launchpad / Dismiss. Sky and pad are illustrated; the callout is not a blueprint stage |
| Mission contract | `06-mission-contract` | Y | Blueprint stage. Large uppercase contract name, green accept, client wash on the left (Helios orange tint, sampled about `#fdf4e4`) |
| Mission map | `07-mission-map` | Partial | Blueprint frame and green Confirm. The chart is a flat white field, amber sun, thin faceted bodies, dashed cyan orbits. Filter is a paragraph plus cargo chips, not pills |
| Mission blueprint | `30-mission-blueprint` | Y | White stage, Prospector rooms, green purchase. Phone type in the room list drops to 7–11px |
| Mission review | `08-mission-review`, `23-telescope-fab` | Y | Same frame. The vehicle sits as a dark cutaway inside the white card |
| Hangar registry | `09-hangar-customiser` (closed) | N | Cream editorial `#faf8f3`. “Hangar construction” lede, no ink offset cards |
| Hangar assembly | `10-hangar-assembly` | N | Same cream registry, Prospector shipment copy |
| Ship customiser | `34-ship-customiser` | Partial | Opens over the cream Hangar. Interior is off-white `#f6f8f0` with a dark navy band. Not the blueprint stage |
| Launch sequence | `31-launch-sequence` | N | Short sky-and-charcoal canvas over the review. Flight Plan stays up. No paper card |
| Transit | `11-transit` | N | Near-black field (`#02070e`). Cyan command buttons, “SKIP FLIGHT” |
| Mining guide | `12-mining` | N | Dark field. A guide sheet explains FIRE LASER in sentence case |
| Mining field | `32-mining-field` | N | Grey-green surface, dark HUD, “FIRE” / RETURN. Flight Plan: “Fire the laser on a seam” |
| Field Rover briefing | `13-rover` | N | Dark. “DEPLOY MULE ROVER” |
| Field Rover driving | `33-rover-deployed` | N | Dark terrain, rover parked readout, diorama view |
| Descent | — | — | `LandingScreen` only mounts when the ship has a lander. No in-memory preset sets one, so it was not on screen. Its CSS is the dark panel language (`--ln-panel`, 1px cyan hairline, 6px radius) |
| TESS classify | `14-tess` | N | Dark observatory. Lightcurve uses purple (`#c084ff` family, sampled around `rgb(176,144,208)`) and brown. Actions: confirm transit / maybe noise / skip |
| Debrief | `15-debrief`, `24-transport-debrief` | N | Dark navy. Payout figures use amber |
| Skill tree | `16-skills` | N | Dark “research console” |
| Instrument Hub | `17-instrument-hub` | Partial | Purple-black header (`rgb(23,15,44)`) over a paper-coloured desk `#dfe9f3` |
| Asteroid discovery | `18-asteroid-discovery` | N | Charcoal. Empty of live candidates without the shared backend |
| Academy | `19-academy` | N | Cream `#faf8f3`, cyan `#1c7fbf` accents, no offset ink cards |
| Build, silo | `20-build-silo` | Partial | Painted build scene under the Flight Plan |
| Build, free ops | `21-build-free-ops` | Partial | Same painted yard, more structures |
| Market | `29-market` | N | Cream resource desk `#f4f1ea`. White commodity card. Reached from the nav; `/game/market?preset=` is overwritten by the preset’s hub screen |
| Menu | `26-menu` | N | Dark charcoal settings sheet. Skill tree, training replays |
| Friends | `27-friends` | N | Dark sheet, “Failed to fetch” |
| Community | `28-community` | N | Dark sheet, same fetch failure |
| Subsurface | `35-subsurface` | N | Near-black excavation pitch |
| Flight Plan | on `03`, `12`, `32` | N | In-flow strip between the scene and the nav. Fill is dark grey, kicker and the primary use `#70d9ea`, 1px cyan border, 8px radius. Not a paper card and not a speech balloon |
| Toast | — | N | None fired. `ToastLayer` is dark glass `rgba(6,13,24,0.92)`, 8px radius, blur, and a warn toast uses `#f5a623` |
| Bottom nav | every shot | N | `#0a0a0c` under light and dark scenes alike. Words only |
| Garden | `36-garden-external` | N | Not a Landnam scene. The hub hop opens `https://starsailors.space/game`, which redirects to Star Sailors sign-in (slate panel, Google button, an emoji in the wordmark) |
| SSL-370 map | `map-branch/*/map.png` | Partial | Same blueprint frame, same amber sun, same filter paragraph. Pixel diff against today’s map is small (mean channel delta about 2). It is a layout pass, not a new drawing style |
| SSL-370 contract | `map-branch/*/contract.png` | Y | Same contract stage as current `cycle/3` |

Desktop mission-setup and other boxed screens sit in a centred card over the Earth Base painting (sky corner samples around `rgb(47,82,110)`). Transit, mining, and the Earth Base itself are full-bleed. Academy and Market are full-bleed cream.

## Orange, amber, purple

Liam’s ban is [SSL-425](https://linear.app/kestloome/issue/SSL-425): `#f5a623`, `#ffb347`, `#d97150`, and purple (`#c084ff`, `#fa49ca`) leave the UI. What is still on screen or in the tokens:

| Use | Colour | Verdict |
| --- | --- | --- |
| Map sun | `--ln-amber` `#f5a623`, soft amber halo. Centre pixel on the shot is `#ffb347` | On the Map, in the middle of the chart. Code comment treats a celestial body as exempt. SSL-425 says the sun becomes ice-white with a cyan glow |
| Helios Propulsion | client colour `#f5a623` in `lib/data/clients.ts` | Tints the contract slide (warm left edge on `06-mission-contract`). Older rule allowed a client’s own brand colour. SSL-425 does not |
| Iron mineral | `#d97150` | Cargo chips and mining counts |
| Debrief and market money | `--ln-amber` | Payout figures. The old “amber only for payout” rule covers these. SSL-425 still wants them moved to cyan/teal |
| Mining “sell at market”, refinery meters, hangar cost chip, territory claim, unlock-popup coin | `--ln-amber` / `#ffb347` | Chrome and rewards, not just a payout digit |
| Toast warn | `#f5a623` | Hard-coded, not a token |
| TESS / asteroid chart “amber” tone, lightcurve dots | `#f5a623` and purple `#c084ff` | Instrument screens |
| Status pill `warn` / `amber`, `Chip`, `StatRow` default, `Button` amber variant, `ProgressBar` amber gradient | `#f5a623` / `#ffb347` | Shared UI kit still offers orange as a normal accent |
| `--ln-play` | `#fa49ca` | Token only, still in `:root` |
| Rare mineral | `#c084ff` | Catalog colour |
| DEV group swatches | `#d97150`, `#c084fc`, `#f5d947` | Dev panel only |

## The attached Map mock

The mock is a phone Map: graph-paper page, thick black cards, a speech balloon (“FLIGHT PLAN / Tap a cyan target”), filter pills, a spiked sun, cartoon planets with heavy black outlines and pill labels, “Can reach” cyan pills, a “Too far” balloon, corner brackets on 433 Eros, and a cyan “Confirm target” button over an icon tab bar.

Put next to the live Map (`07-mission-map`):

| | Live Map | Mock |
| --- | --- | --- |
| Page | `#eef3f8` wash, white stage | Graph paper across the whole screen, including inside the map |
| Card outline | Ink `#0f2436`. Phone stage 3px, radius 5px. Desktop stage 4px, radius 8px | Pure black, heavier, and the cards are much rounder (pills and large corner radii) |
| Shadow | Hard offset in translucent ink (`0 6px 0` phone, `0 10px 0` plus a blur on desktop) | Solid black offset, higher contrast, no blur |
| Confirm | `#5ad07e` fill, ink text, 5px radius, 2px outline on the phone | Filled cyan, black outline, large rounded rectangle |
| Headline | Header word “MAP”, Oxanium 800, uppercase, 15–21px. The only huge type in this flow is the contract name | “Choose a destination” in sentence case, as a large headline |
| Hint | Dark Flight Plan strip under the stage, or the filter paragraph inside the card | Comic speech balloon on the chart |
| Filters | “MISSION FILTER”, cargo chips, one uppercase sentence | Cyan check pills (“Platinum 3+”, “In range”) and a “Show all” pill |
| Sun | Amber disc `#f5a623` | Spiked star, pale yellow, label in a white pill |
| Bodies | Faceted flats, ~1.5px stroke in the rock colour, cyan ring if reachable, cyan reticle if selected, Turret Road name on a small rect | Thick black cartoon outlines, crater dots, white pill labels, “Can reach” pills, corner brackets |
| Out of reach | 40% opacity and a dimmer orbit | Speech balloon “Too far: needs more fuel” |
| Nav | Dark `#0a0a0c` bar, words only | White bar, line icons, a filled cyan Ops square |

The mock is closer to the [SSL-426](https://linear.app/kestloome/issue/SSL-426) wishlist (chunky bodies, cyan “in range”, a too-far line) than to any screen that ships. It does not match the blueprint frame around today’s Map, and it does not match the dark ops screens or the cream Market / Hangar / Academy either.

### What a matching Map would change in that mock

1. Keep the live scaffold: back chip, “MAP” title, four-step rail, white stage. Phone: 3px ink, 5px radius, `0 6px 0` shadow. Desktop: 4px ink, 8px radius, `0 10px 0` plus the existing blur.
2. Set type in Oxanium and Turret Road. Labels uppercase and tracked. Do not add a sentence-case headline on the Map step.
3. Confirm stays `#5ad07e`, ink text, 5px radius, 2px / 3px ink outline (phone / desktop) and the matching offset. Not a cyan pill.
4. Leave Flight Plan as the strip under the stage. Do not draw a speech balloon on the chart.
5. Keep the mineral filter block. Do not add Platinum / In range / Show all pills.
6. Draw bodies the way `GalaxyMap.tsx` does now: composition flats, short strokes, cyan ring, cyan reticle, mono names. Do not switch to black-outlined cartoon planets, crater dots, or pill labels.
7. The sun, as shipped, is the amber disc. SSL-425 wants that disc replaced with ice-white and a cyan glow on every sun in the game, including this map. A spiked star matches neither.
8. “Too far: needs more fuel” can be the selected-body line in the bottom rail, in the same uppercase Oxanium as the rest of the rail. Not a second balloon.
9. Keep the shared nav: `#0a0a0c`, OPS / HUB / « » / MARKET / MENU, no icons.
10. Page `#eef3f8`, stage `#ffffff`, ink `#0f2436`. No pure-black borders, and no graph-paper grid inside the map field unless the other setup steps grow the same grid.

## Shots

Phone and desktop pairs live in [`visual-style-audit-2026-10/phone`](./visual-style-audit-2026-10/phone) and [`desktop`](./visual-style-audit-2026-10/desktop). SSL-370 is under [`map-branch`](./visual-style-audit-2026-10/map-branch).

| File | Scene |
| --- | --- |
| `01-auth-gate` | Sign-in sheet |
| `02-intro` | Welcome / begin operations |
| `03-earth-base-tutorial` | Earth Base, first Flight Plan |
| `04-earth-base-storage` | Earth Base, storage lesson |
| `05-earth-base-needs-attention` | Earth Base, telescope callout |
| `06-mission-contract` | Mission setup, contract |
| `07-mission-map` | Mission setup, map |
| `08-mission-review` | Mission setup, launch review |
| `09-hangar-customiser` | Hangar registry before the customiser opens |
| `10-hangar-assembly` | Hangar, Prospector shipment |
| `11-transit` | Transit to Earth orbit |
| `12-mining` | Mining guide |
| `13-rover` | Field Rover briefing |
| `14-tess` | TESS classify |
| `15-debrief` | Debrief |
| `16-skills` | Skill tree |
| `17-instrument-hub` | Instrument Hub |
| `18-asteroid-discovery` | Asteroid discovery |
| `19-academy` | Academy |
| `20-build-silo` | Build, silo lesson |
| `21-build-free-ops` | Build, free ops |
| `22-market` | Preset URL stayed on the hub (see `29-market`) |
| `23-telescope-fab` | Telescope launch review |
| `24-transport-debrief` | Transport debrief |
| `25-launchpad-via-hub` | `/game/launchpad` was overwritten by the hub preset |
| `26-menu` | Menu sheet |
| `27-friends` | Friends sheet |
| `28-community` | Community sheet |
| `29-market` | Market |
| `30-mission-blueprint` | Rocket blueprint |
| `31-launch-sequence` | Launch canvas |
| `32-mining-field` | Mining after the guide, laser control visible |
| `33-rover-deployed` | Rover on the surface |
| `34-ship-customiser` | Hangar customiser open |
| `35-subsurface` | Subsurface |
| `36-garden-external` | Star Sailors sign-in, the Garden hop |
