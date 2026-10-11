# Native / web Earth Base parity (SSL-499)

Side-by-side: `side-by-side-{phone,landscape,desktop}.png` (native left, web right). Viewports: 402x874, 874x402, 1000x680. Web captured with Playwright (`/game/stage?preset=m1-hub`, installed Chrome); native from the `hub-phone`, `hub-phone-landscape`, `hub-desktop` catalog scenes.

Matched: the four base structure sprites are byte-identical to `web/public/game/assets/base/*_flat.png`; the terrain is the web kit (`EARTH_BASE_WIDE`, same bricks, x, scale, lift, flip, band baselines), the same 28 terrain PNGs, haze `min(.92, (1-depth)^2 * .95)` over each sprite's silhouette, web z-order (bands up to the treeline behind the ground plane, ground-detail and foreground on it), web palette tokens, ground lip and nearer soil band, road bed, and the outlined planet.

Differences I could not match:
- Brick sizes scale with the viewport (`BaseLayout.k`, same as the structures); web uses fixed CSS px. At 402 wide they are identical, wider windows differ.
- There is no parallax. `TerrainScene.tsx` has none either (depth only drives haze and z-order); the ambient motes and ridge drift in `AmbientMotes` are not ported.
- Structure positions and sizes follow PR #158's `BaseLayout` and HUD zones, not the web's `plotX` layout, so buildings sit elsewhere and web-only structures show differently (as asked).
- Web road bottom edge sits on the baseline; native centres it there so the road clears the dock.
- Foreground and ground-detail rocks are dropped where they would sit behind structures or the dock (outcrop exclusion), so the foreground is sparser than web.
- The web HUD (title, nav bar, toasts) is not part of this comparison; the web screenshots include it.
- Other biomes (desert, tundra, coast) are unused; no picker.
