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
