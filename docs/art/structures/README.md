# Structure upgrade drawings (SSL-792, SSL-693)

First-pass line art for upgrade levels, same language as the Agency building (`docs/art/agency-building/`): navy outline, cream walls, blue accents, teal and warm crate colours. Each folder holds `<kind>-l1/l2/l3.svg` plus `.png` renders and a `sheet.png` contact sheet. SVGs are sources; nothing here is wired into the game yet.

| Structure | L1 (matches in-game) | L2 | L3 |
| --- | --- | --- | --- |
| Launchpad | 3 service arms, one hut | Taller tower, 5 arms, longer deck, flame trench, water tank | Catch arms over the pad, landing legs and ring, recovery loop, light tower (reuse of vehicles, per SSL-693) |
| Exchange | Sign, one conveyor, one hall | Second conveyor, bigger hall, ticker screen, more crates | Gantry crane and container stack, glass trading floor, dish |
| Hangar | One bay, annex | Two bays, taller, tool shed | High bay with overhead crane and a vehicle on the stand |

Control station / Agency: stages 1 to 4 in `docs/art/agency-building/`. Stage 4 is the level-2 look and is the live sprite.

Open before wiring: levels per building, what each level unlocks, costs (Liam's call, SSL-792). Sprite frames (width/height in `base-site.json`) are not set; each drawing uses its own viewBox. To use one: render transparent with Chromium, add a `base-site.json` entry per level, then sync with `node scripts/sync-base-site.mjs`.
