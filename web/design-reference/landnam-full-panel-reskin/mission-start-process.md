# Landnam — starting a mission (process reference)

Grounded from `MissionBoardScreen.tsx`, `MiningScreen.tsx`, and `useGameLoop.ts`
in the linked Landnam codebase. This governs interaction/state logic for the
Mission Board, Rocket Construction, and Mining Run mockups — the visual
references (Ref A/B) describe how it should look; this describes how it works.

## Where it starts

Every mission begins on the Mission Board. What's listed depends on onboarding
vs. Free Ops:
- **Onboarding**: missions gated by a fixed sequence, one mission type unlocked
  at a time.
- **Free Ops** (post-onboarding): a rotating daily pool of client requests, plus
  hand-authored logistics ("mine then deliver") jobs, and self-directed mining.

## The two mission types

### Client missions ("client requests")
Issued by a named client (Helios Propulsion Depot, Atlas Aggregate, Kepler
Materials, etc.). Each has:
- **Required cargo** — which mineral(s) and how much.
- **A payout premium** — changes the credits paid out, **not** how much gets
  mined. Real point of past player confusion; now an explicit on-card line.
- **An affinity reward** — completing jobs for the same client raises a
  per-client affinity bonus that increases future payouts with them, up to a
  cap.
- In Free Ops, a limited number of missions is offered per client slot; once
  accepted, that slot won't refresh until the next day (**cooldown**).
- Some are two-leg "mine then deliver" jobs — mine at one target, then relay
  to a second target before returning. The player must see this before
  committing, not discover it mid-mission.

### Freeform / self-directed mining
No client, no daily limit, no cooldown. The player picks any reachable target,
mines whatever looks valuable, and sells the haul at market price on return —
no premium, no affinity. In Free Ops this is a **standing, always-available
option** — its own panel on the Mission Board, not a card in the contract
list — launched directly rather than picked from a list.

## The pick-through flow

1. **Mission Board** — pick a contract card (client mission) or the
   "Launch Self-Directed Run" panel (freeform). Locked / cooldown /
   completed-today jobs are shown disabled, not hidden.
2. **Target** — if the mission already has a fixed target (most two-leg
   client jobs), this step is skipped entirely and the player goes
   straight to Rocket. Otherwise the player picks from reachable targets,
   filtered by the mission's cargo/orbit/drill requirements — this is where
   freeform mining's target choice happens.
3. **Rocket** — the player's build progress/tier is shown; a two-leg job's
   delivery leg is surfaced here too, not just at Target.
4. **Relay** — pre-flight compatibility check before commit; confirms the
   assembled rocket meets the mission's requirements. This is where the
   player hits "Confirm Launch."
5. **Transit → Mining → (delivery leg, if two-leg) → Debrief** — outside the
   pick-a-mission flow above: the flight, the mining minigame itself, and the
   payout/collection moment.

## Rules that must not be misrepresented

- A client's payout premium changes credits only — it never increases
  how much of a mineral gets mined. Kept as an explicit on-card mechanics
  line in Mission Board; don't obscure it.
- "Client," never "client," in any player-facing copy.
- Freeform/self-directed mining has no premium and no affinity — don't give
  it a payout-bonus readout, that's client-only.
- Two-leg jobs must be shown before the player commits (Target and Rocket
  steps), not discovered mid-mission.

## Real Mining Run mechanics (grounded from `MiningScreen.tsx`)

There is no Fuel/Oxygen/Hull resource system in Landnam — that was Ref A/B's
own game, not Landnam's. The actual mining loop runs on:
- **Laser charges** — a depleting shot counter (not fuel/oxygen/hull). Firing
  costs one charge; running out without filling the order fails the run.
- **Order progress** — per-mineral collected/required counts plus a combined
  total, shown as a single progress bar.
- **Scroll track** — a draggable speed control (drag left = slow, right =
  fast-forward), separate from firing.
- **Fire Laser** / **Fill Order to Deliver-or-Return** — the two primary
  actions; the second is disabled until the order is filled or charges run
  out.
- **Mission Coach** callout and a **Guide ("?")** overlay documenting the
  above controls.

## Scope decision — Mining Run re-skin (documented per 2026-07-23 correction)

The Mining Run mockup originally invented Fuel/Oxygen/Hull HUD meters lifted
literally from Ref A/Ref B's own game. That mechanic doesn't exist in
Landnam and made the panel diverge from production gameplay, not just its
chrome. **Correct scope: HUD-only reskin.** Keep the real mechanics above
(laser charges, order progress, scroll track, guide) and apply Out There:
Omega Edition's *icon language only* — bordered white-line badge tiles and
segmented bars — to the charge meter and mineral chips. Do not redesign the
underlying scene or invent new resource systems for future passes on this
screen.
