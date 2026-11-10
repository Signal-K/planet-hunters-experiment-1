# agency-building (SSL-785)

`line-drawing.svg` / `line-drawing.png`: first concept, front elevation, line only. Not a sprite yet.

- Wide low civic hall: two glazed wings, a taller central block with a portico, steps, a blue dome and a flag. It reads as admin, not as the Control Station (no dishes or masts).
- Palette follows base-kit: cream walls, blue dome and glass, navy base. No orange.
- Drawn on a 4-unit grid so it carries to pixel art. Next: approve or change the drawing, then paint the sprite sheet under `docs/art/` with slices in the art folders, swap the first-run landmark, and remove the SSL-675 exception from `docs/STYLE.md` rule 4.

## Stages (Liam 2026-11-10: line art, progressively more detail)

- Stage 1: `agency-stage1.svg` / `.png` is the drawing with no background, used as the sprite (`web/public/game/assets/base/v7/structures/agency.png`, site map entry `agency`). Preview: `/game/stage?preset=hub-first-run`.
- Next stages edit the SVG, re-render with Chromium (transparent) and overwrite `agency.png`.
