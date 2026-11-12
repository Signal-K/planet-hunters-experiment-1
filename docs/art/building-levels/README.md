# building-levels (SSL-792)

These are the level 2 and level 3 sprites for the hangar, the Exchange and the control station. Each one is the level-1 base-kit sprite with additions drawn in the same style: navy outline, cream, blue band, teal, pale-blue glass, and warm light for lit panes. Extra headroom goes on top, so the width and the footprint on the strip stay the same.

| Building | Level 2 | Level 3 |
| --- | --- | --- |
| Hangar | Gantry crane on the roof | Plus a beacon tower, solar on the annex, and lit bay lights |
| Exchange | Second price board, flag | Plus a trading floor on the warehouse |
| Control station | Second dish, status light strip | Plus a lattice relay mast with a beacon, and an observing slit in the dome |

The launchpad already had `launchpad-l2.png` and `launchpad-l3.png` (SSL-693). The Agency's stage-4 drawing is its level-2 look (SSL-785).

To rebuild, run `node docs/art/building-levels/render.cjs` from the repository root. It writes the SVG sources and PNGs here, copies the PNGs to `web/public/game/assets/base/v7/structures/`, and prints each height in kit units (pixels ÷ 6) for `shared/layout/base-site.json`. Then run `node scripts/sync-base-site.mjs`.
