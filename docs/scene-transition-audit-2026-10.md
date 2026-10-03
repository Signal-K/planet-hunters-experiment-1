# Scene transition audit — 3 Oct 2026

Playtest note: scene changes were hard cuts. `GameScreenRouter` swapped `game.screen` in one React render, so the outgoing scene unmounted on the same frame the next one mounted. The launch cinematic faded to black internally and then cut to transit.

This pass wraps every routed screen in `SceneTransition` (`web/components/game/SceneTransition.tsx`, kinds in `web/lib/scene-transition.ts`). The swap happens while a void veil is fully opaque. Total motion is 180ms cover + 200ms reveal = 380ms. `prefers-reduced-motion: reduce` skips the hold and swaps immediately.

Frames from the local preset pass are saved beside this file when the verification run captures them:

- `docs/scene-transition-audit/mining-before-overlap.png` — staging playtest frame (coach and help panel over the field)
- `docs/scene-transition-audit/mining-after-phone.png` — mining after the overlap fix, 390×844
- `docs/scene-transition-audit/mining-after-desktop.png` — mining after the overlap fix, ~1280×800
- `docs/scene-transition-audit/transition-fade.png` — shared void veil mid-fade
- `docs/scene-transition-audit/transition-climb.png` — launch → transit climb
- `docs/scene-transition-audit/transition-arrival.png` — transit → mining arrival
- `docs/scene-transition-audit/transition-debrief.png` — return → debrief descent

## Shared system

| Kind | When | What the player sees |
| --- | --- | --- |
| `fade` | Every other routed hop | Void veil covers the outgoing scene, the next scene mounts, the veil lifts. No craft. |
| `climb` | Virtual `launch` key → `transit` | Same veil, plus a cyan stack that climbs out of the top of the frame. |
| `arrival` | `transit` → mining, rover, landing, or delivery; `landing` → mining or rover | Same veil, plus a horizon line and a body disc that grow in. |
| `debrief` | `transit` or `landing` → `debrief` | Same veil, plus the stack descending through the frame. |

`launch` is not a `Screen`. While `launchPending` is set and the screen is still `fab`, the scene key is `launch`, so preflight → cinematic fades, and cinematic → transit climbs. Resuming a flight from the hub (`hub` → `transit`) stays a fade.

The hub campus slide (`.earth-base-campus-transition`, 520ms) is inside the hub route. It is unchanged. Market is not a scene: `/game/market` redirects to hub and opens the market sheet.

## Every hop

Before this change, every row was a hard cut unless the Notes column says otherwise. After is the kind above.

| From | To | After | Notes |
| --- | --- | --- | --- |
| intro | build | fade | New game from the landing flow. |
| intro | hub | fade | Continue an existing save. |
| build | hub | fade | Base placement finished. |
| hub | launchpad | fade | Pad building. |
| hub | missions | fade | Jobs. |
| hub | hangar | fade | Hangar building. |
| hub | academy | fade | Academy building, and the academy intro mission. |
| hub | skills | fade | Skills building. |
| hub | build | fade | Construction, including the tutorial-complete “build silo” path. |
| hub | refinery | fade | Refinery building. Locked players are bounced back to hub (still a fade). |
| hub | asteroid-discovery | fade | Deep-space telescope. |
| hub | instrument-hub | fade | Instrument console. TESS classification lives here and on `galaxy`, not on the flight Transit screen. |
| hub | galaxy | fade | Star map / TESS entry. |
| hub | surface-ops | fade | Surface operations. |
| hub | mission-history | fade | Mission log. |
| hub | narrative-ledger | fade | Ledger. |
| hub | fab | fade | Resume a pending launch. |
| hub | transit | fade | Resume an in-flight mission. Not the climb. |
| hub (surface) | hub (subsurface) | existing 520ms campus slide | Same route. Not wrapped again. |
| launchpad | missions | fade | Contract list from the pad. |
| missions | targets | fade | Map. Step change inside mission setup. |
| targets | rocket-buy | fade | Rocket purchase. |
| rocket-buy | fab | fade | Preflight / hangar assembly. |
| fab | launch | fade | `launchPending` raises the cinematic without changing `game.screen`. |
| launch (internal) | launch | none | The 15s cinematic already moves: ignition 2.6s, liftoff 3.5s, booster sep 6.4s, stage sep 8.2s, fade to black 14.2s, done 15.0s. |
| launch | transit | climb | `onLaunch()` sets the screen to transit as the cinematic completes. |
| transit | mining | arrival | Standard mine arrival. |
| transit | rover-mining | arrival | Rover mission, and the M3 tutorial delivery arrival. |
| transit | landing | arrival | Lander installed. |
| transit | delivery | arrival | `headingToDelivery`. |
| transit | debrief | debrief | Earth return, or a satellite / deep-space survey / exoplanet arrival. |
| landing | mining | arrival | Touchdown (`onLandingTouchdown`). |
| landing | rover-mining | arrival | Tutorial delivery touchdown. |
| landing | transit | fade | Ascent redock (`onRedockComplete`) starts the return or delivery leg. |
| mining | transit | fade | Order filled. Return burn or delivery leg. |
| mining | landing | fade | Lander installed; surface work ends into the ascent. |
| mining | hub | fade | Back, cargo kept in progress. |
| rover-mining | transit | fade | Rover cargo secured. |
| delivery | transit | fade | Unload complete, Earth-return leg. |
| debrief | hub | fade | Recovery acknowledged. |
| any | market | not a scene cut | Route forces hub and opens the market sheet. |
| shell sheets (menu, market popup) | — | existing sheet | Not a routed scene. |

Main loop with no remaining hard cut: missions → targets → rocket-buy → fab → launch → transit → (landing) → mining or rover → transit → debrief → hub. Delivery inserts transit → delivery → transit before debrief.
