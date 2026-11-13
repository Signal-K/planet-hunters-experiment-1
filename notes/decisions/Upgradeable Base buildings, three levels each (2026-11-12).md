# Upgradeable Base buildings: three levels each (2026-11-12)

From Liam (6 Nov, SSL-792): cycle 9 introduces upgradeable buildings with new sprites. Every Base building upgrades through three levels. Each level has its own sprite, and the Base shows the level reached.

## Costs and effects

An upgrade is bought in Build mode: tap the building.

| Building | Level 2 cost | Level 3 cost | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- | --- | --- |
| Launchpad | ₣10M | ₣20M | Explorer and Prospector, service every 10 launches | Heavy Surveyor, builds 25% faster, service every 14 | Bulk hauler, builds 50% faster, service every 20 |
| Hangar | ₣6M | ₣12M | Rockets at list price | Gantry crane: rockets cost 10% less | Beacon tower and solar: rockets cost 20% less |
| Exchange | ₣4M | ₣8M | Exchange prices | Second price board: sales pay 3% more | Trading floor: sales pay 6% more |
| Control station | ₣3M | ₣6M | New probes map a sector every 2 h | Second dish: every 1.5 h | Relay mast: every hour |
| Surface Silo | ₣4M | ₣8M | 40 units | 80 units | 120 units |
| Refinery | ₣8M | ₣16M | Standard time | 25% faster | 50% faster |

## Rules

- Level 2 costs the building's price and level 3 costs double that. Levels only go up, and two saves merge to the higher level.
- A probe's pace is fixed when it is launched. Upgrading the control station speeds up new probes, not ones already in orbit.
- The level sprites are drawn over the level-1 art (`docs/art/building-levels/`) and listed under `levels` in `shared/layout/base-site.json`.

The rules live in `web/lib/data/building-levels.ts`, and the native fixture `building-levels.json` mirrors them. Swift parity is deferred.
