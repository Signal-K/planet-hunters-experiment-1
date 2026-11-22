# Space flight is steerable and drawn in 3D by Takeon (2026-11-17)

Liam, 2026-11-17: the space flight scenes should allow limited control and have more of a 3D scene and texture, and
the takeon framework should have space flight and in-orbit scene capabilities.

## Rule

- Every flight between bodies is Takeon's flight scene (`@takeon/engine` `createFlightScene`, rules in takeon
  `go/flight.go`), never a hand-drawn DOM picture. In Landnam it is mounted by `web/components/takeon/TakeOnFlight.tsx`.
- Control is limited. The rocket keeps its course and its arrival time. The player can only nudge it inside a corridor
  (d-pad, arrow keys, WASD, or dragging on the scene) and spend Boost.
- Boost is a charge, not a free button. A flight starts with one. Flying through two blue rings charges another. A
  Boost cuts 22% of the time left, at least 2.5 seconds, as a Boost press always did.
- A rock slows the scene and ends a running Boost. It never costs trip time and a flight cannot be lost.
- The persisted departure and arrival times decide when the trip ends. The scene is told where the clock is.
- On arrival the rocket is shown in orbit over the destination for about two seconds, then the trip hands over as
  before. Arrive skips the wait.
- The destination is a lit globe generated from the body's mining palette; Earth on the way home. The rocket is the
  player's own: fitted parts change its proportions and the livery its paint (`web/lib/flight/looks.ts`).
- Controls are the shared mining setup: Back and the route on top, the nudge pad bottom-left, one round Boost button
  bottom-right with the charge as its ring.

## Open

- Onboarding flights last 4 to 7 seconds, so there is nothing to steer on them yet. Lengthening them is Liam's call.
- iOS still draws the old flat flight. Takeon's Go rules are bindable (`mobile.NewFlight`), but the 3D view has no
  native renderer.

Tickets: SSL-848, KES-527.

## Cycle 10 integration (21 November, SSL-847)

The original SSL-848 commit was marked Done on its own branch but had never reached
cycle/10. The module and launch-in-place change are now integrated with the workshop,
weekly passport and saved mission planner already on the cycle branch.

Recent behavior is preserved: View Base leaves the flight running; return flight
states the Earth/cargo handoff, including the mission planner's forward cache receipt.
The generated Earth and rocket need no remote artwork. Saved workshop hull/trim names
are resolved through the shared CSS palette before painting the flight craft.

`flight-return` / `ui-flight-return` is a timed return fixture for checking every
viewport, saved paint and offline rendering. Keep the return note above touch controls
on narrow phones. The normal launch-review fixture still buys a real vehicle before
launching, and the scene hands over to the normal mining/delivery flow after orbit.

This integration vendors the original 0.2.5 flight API from KES-527. KES-529's breaking
0.3.0 draw-list migration and the native flight painter are a separate follow-up,
SSL-871, under the mobile companion scope (SSL-574). No iOS build was available here.
