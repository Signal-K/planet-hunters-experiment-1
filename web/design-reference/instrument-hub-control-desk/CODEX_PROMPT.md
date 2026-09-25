# Codex prompt — Instrument Hub control desk (SSL-329)

Copy everything below the line into Codex. Branch in repo: `cursor/instrument-hub-control-desk-72c4`. PR: https://github.com/Signal-K/planet-hunters-experiment-1/pull/78

---

You are working in the Landnam Next.js game (`web/`). Ticket SSL-329. The previous agent’s Instrument Hub “control desk” is rejected. It does not look good. Redo the visual so it matches the **composition** of the Grok inspiration, while staying on Landnam’s command-deck tokens.

## Open these files first

Inspiration (committed):

- `web/design-reference/instrument-hub-control-desk/00-current-instrument-hub.png` — what players have today: dusk Earth Base **strip** + classify stack. Wrong camera (establishing hub shot). The classify rail (GAIN / ZOOM / SCRUB / ARM / INSPECT) is the right *kind* of instrument, not the layout.
- `web/design-reference/instrument-hub-control-desk/01-grok-control-desk-inspiration.png` — **target composition**. You are *inside* the agency. Thick window bezel. Viewport looks out at a **handful** of buildings (hangar, mast, dish, mountains behind). Console is one object under the window: waveform + physical-feeling controls. No letterbox skyline. No empty navy void between window and instruments.
- `web/design-reference/instrument-hub-control-desk/02-rejected-preview-day.webp`
- `web/design-reference/instrument-hub-control-desk/03-rejected-preview-dusk.webp`
- `web/design-reference/instrument-hub-control-desk/04-rejected-instrument-hub.webp` — **do not ship anything that still looks like these.** Thin panoramic strip, tiny far-kit bricks, ladder-as-hangar, giant empty deck, notes/cards floating in dead space.

Failed code to replace, not polish:

- `web/components/game/screens/ControlRoomBackdrop.tsx` + `.module.css`
- `web/lib/scene/compositions.ts` (`EARTH_BASE_COURTYARD`)
- `web/components/game/screens/InstrumentHubScreen.tsx` + `.module.css`
- Preview: `web/app/game/control-room-preview/`

## What “good” means

1. **Interior, not a banner.** The player sits at a desk. The world is a window, maybe 40–55% of height, with a real sill and bezel. The rest is console. Flush: window → sill → instruments. Zero empty band.
2. **Courtyard camera.** A few buildings, closer, slightly 3/4 or head-on like the Grok still — not the wide Earth Base establishing shot (`earth-base-wide`). Reuse the Blender terrain kit / hangar sprites if they read at this scale; if `far_*` bricks stay postage-stamp, stop using them as the hero and compose a tighter scene (scale, crop, or a dedicated CSS/SVG interior+courtyard). Do not paste the launchpad ladder and call it a hangar.
3. **Control panel AND a game.** Classify workspace is the deck: lightcurve is the scope, GAIN/ZOOM/SCRUB/ARM/INSPECT are real-feeling instruments (Landnam buttons/sliders, UPPERCASE labels). Interactive enough to demo. Preview route may use dummy TOI data. Production Instrument Hub should use the same shell.
4. **Landnam chrome, not a second game.** `.theme-deep`, tokens in `web/app/globals.css` (`--ln-void`, `--ln-panel`, `--ln-cyan`, `--ln-hairline`, Oxanium). 8pt spacing only (4/8/12/16/24/32). No emoji. No raw hex except existing tokens. Amber only for genuine payout chips — not panel chrome. You may use a light *window frame* (cream/steel mix via tokens) like the Grok bezel if it still sits in a dark command room. Do **not** restyle the whole game as analog beige knobs.
5. **Parent UI matches the game.** Keep `TopBar` (glass) + existing Instrument Hub copy (ORBITAL OBSERVATORY / DATA LINK). Landscape/desktop first; still usable at compact landscape.
6. **Tutorials later, but leave a hook.** One local coach beat is OK (“you are at the downlink desk; the window is campus; classify on the deck”). Do not wire crew into citizen science. Do not invent analog toy knobs that do nothing.

## Verify

- `cd web && npx vitest run` on tests you touch (`ControlRoomBackdrop`, `HubWorldBackground`).
- Open `/game/control-room-preview` and `/game?preset=ui-instrument-hub` and screenshot. If it still looks like `02-`/`04-rejected-*`, you are not done.
- Commit from repo root with Landnam subject form: `🚀🐺 ↝ [SSL-329]: …` (two different non-flag, non-face emoji; exact arrow). Do not `--no-verify`. Push the same branch.

Canonical design language: `web/app/globals.css` `:root` comments, AGENTS.md scene-first gate, `npm run verify:scene-surfaces`.
