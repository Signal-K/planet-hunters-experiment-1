# Claude Code Prompt — Early-Game Onboarding & Tutorial (Godot)

> Paste the block below into Claude Code from the root of the
> `planet-hunters-experiment-1` Godot project. It implements the **M1–M4
> tutorial/onboarding flow** — the Mission Coach overlay, spotlight hints, the
> coached M1 walkthrough, the build gate, and the deferred unlock popups — to
> match the portrait prototype in this design system (`ui_kits/landnam-portrait/`).
>
> Visual reference: open `ui_kits/landnam-portrait/index.html` and read
> `tutorial.jsx` (TutorialCoach, UnlockPopup, BuildGatePrompt, M1_STEPS) plus
> `app.jsx` (how the coach is screen-driven). All colors/sizes come from `DS.gd`.

---

## PROMPT

```
You are in the Planet Hunters / Star Sailors Godot 4.5 project (GL Compatibility,
mobile-first portrait, 1080×1920 design res). Implement the early-game tutorial
and onboarding flow. Wire it into the EXISTING systems — do not fork game state.

READ FIRST (source of truth — do not hardcode values that exist here)
- res://Scripts/UI/DS.gd                       (all color / font-size / radius / spacing tokens)
- res://Scripts/Systems/AppController.gd        (game state, mission progress, save flags, scene routing)
- res://Scenes/UI/TutorialCoachOverlay.tscn + its script  (existing coach — EXTEND this, don't replace)
- res://Scenes/UI/MechanicIntroOverlay.tscn     (existing intro-overlay pattern to match styling)
- res://Scenes/UI/StarterRocket2UnlockOverlay.tscn
- res://Scenes/UI/FreeOpsUnlockOverlay.tscn
- res://Scenes/UI/EmergencyLoanOfferDialog.tscn
- res://Scenes/UI/EarthBaseBuildFlowOverlay.tscn (Control Station build gate)
- res://Scenes/Earth/earth_base_1.tscn           (where the coach is pinned)
- res://Scenes/UI/LaunchWizard.tscn, ControlStationPanel.tscn, SidescrollMining.tscn,
  SpaceMap/space_map.tscn  (the screens the coach narrates)

ARCHITECTURE — SCREEN-DRIVEN COACH (critical)
The coach must NOT be a linear "next/next" wizard that fights the real buttons.
It reacts to WHERE the player is. Implement a TutorialController (autoload or a
node under AppController) that:
  - Holds an ordered list of coached STEPS (see M1_STEPS below). Each step binds
    to a SCREEN id and a target Control (by node path or a group name) to spotlight.
  - Exposes current_step() = first step whose `screen` == AppController.current_screen
    AND not in completed_steps.
  - When the player performs the real action for a step (signal from the actual
    control — e.g. LaunchWizard.proceeded, MiningScene.order_filled), mark that
    step complete and let the next step surface naturally on whatever screen the
    player lands on.
  - The coach's own CTA button is a SHORTCUT that performs the same action as the
    real control (so tapping either advances identically). Never let them desync.
  - Persist completed_steps + tutorial_active in the save (one coached run per save).

COMPONENTS TO BUILD

1) MissionCoachOverlay  (extend TutorialCoachOverlay.tscn)
   A CanvasLayer above gameplay. Children:
   - Dimmer: full-rect ColorRect at rgba(3,6,12,0.78). Use a SPOTLIGHT shader (or a
     second ColorRect mask) that punches a rounded-rect hole over the current step's
     target rect, with a 2px DS.PRIMARY/amber pulsing border around the hole.
   - CoachCard: a PanelContainer (DS panel style, radius DS.R_CARD) anchored near the
     spotlight (above if step.anchor=="bottom", below if "top", centered if null).
     Contents: CoachAvatar (44px helmeted-operator bust, glowing visor), label
     "MISSION COACH" (DS.F_LABEL, DS.PRIMARY, tracked uppercase), step counter
     "{n} / {total}" (mono), Title (DS.F_HEADLINE bold), Body (DS.F_BODY, DS.TEXT_MUTED),
     a row of progress dots (done=DS.STATUS_OK, current=amber, todo=ghost), a "SKIP"
     text button, and a primary CTA button labelled with step.cta.
   - A small triangle pointer from the card toward the spotlight.
   Animate: avatar bob (±2px, 1.2s), spotlight border glow pulse (1.6s), card slide+fade
   in on step change (DS ease-out, ~220ms).

2) M1_STEPS data (mirror the prototype exactly)
   1 Welcome           screen=earth_base   target=RadialNav "New Mission"   cta="New Mission"
   2 Lock a Contract   screen=control/missions target=contract list         cta="Choose a buyer"
   3 Choose Destination screen=space_map   target=asteroid markers          cta="Tap a target"
   4 Assemble Rocket   screen=launch_wizard target=Proceed button           cta="Proceed"
   5 Launch            screen=launch_wizard target=Launch button            cta="Confirm Launch"
   6 Arrival           screen=mining       target=null (whole scene)        cta="Tap ore"
   7 Fill the Order    screen=mining       target=Order panel               cta="Fill the order"
   8 Return Home       screen=mining       target=Return button             cta="Return"
   9 Debrief           screen=debrief      target=Sell/Collect button       cta="Collect"
   Body copy: use the exact lines from tutorial.jsx M1_STEPS.

3) ProgressionCard (on earth_base, below the title — see the home-scene prompt)
   Contextual single card; during the tutorial it mirrors the coach's current
   objective. Conditions/priority already specified in the home-scene brief.

4) BuildGate  (reuse EarthBaseBuildFlowOverlay)
   Fires after M1 completes: a bottom sheet "Control Station / Build Required",
   cost ▲500,000,000, balance check, CTA "Build · Place on Earth Base". The
   Missions tab/radial button stays DISABLED until controlBuilt == true.

5) Deferred popups (reuse existing overlay scenes; trigger via AppController flags,
   show ONCE per save)
   - StarterRocket2Unlock  → after M1 complete. Stats: RANGE +60%, CARGO ×1.5, SPEED +40%.
   - FreeOpsUnlock         → after all 4 authored missions (is_free_operations_unlocked()).
                             Unlocks Market room in soil section, lifts mission cap,
                             ends coaching.
   - EmergencyLoanOffer    → when loan conditions met. ADVANCE 5,000 F, TERM 2 runs, RATE 8%.
   - ClassificationConsensusNotification → when new TESS consensus arrives.
   Style each like UnlockPopup in tutorial.jsx: ray-burst backdrop, big art, 3 stat
   chips, one primary CTA. Colors from DS.

FLOW GATES (must match exactly)
  0 missions        → SR1 only, M1 forced path, Missions list locked to the coached contract
  M1 complete       → SR2 popup, ProgressionCard "Build Control Station"
  M1 + CS built     → M2 path, Missions tab re-enabled
  M2 complete       → M3 path (introduces TESS lightcurve classify step)
  M3 complete       → M4 path (free target selection; coach says "You're in command now")
  M4 complete       → FreeOpsUnlock popup, Market room unlocks, coaching ends, no cap

M2–M4 COACHED BEATS (lighter than M1)
  M2: single coached step = build Control Station, then a free repeat of the M1 loop
      with SR2 available and slightly farther targets.
  M3: contractor lock as usual, then ONE new coached step — "Classify a TESS
      lightcurve": show a transit-dip plot, player taps PLANET or NOT PLANET, answer
      is written to the science DB; the classified candidate becomes the target.
      (Build this as a new ClassifyLightcurveScreen — it is the only genuinely new
      screen. Match DS styling; plot = Line2D over a graphed grid with a labelled dip.)
  M4: coach one-liner "You're in command now"; player picks any reachable asteroid or
      confirmed candidate. No further steps.

STYLE RULES
  - Every color/size/radius/spacing from DS.gd. Oxanium display/UI, Turret Road mono.
  - Uppercase tracked labels for instrument text & CTAs; Title Case headlines;
    sentence case body. No emoji (shape + color for status).
  - Buttons flat-panel with subtle top highlight; pressed = dim + slight shrink.
  - Min on-device font 14px.

DELIVERABLES
  1. TutorialController (state + step list + signal wiring), persisted in save.
  2. Extended MissionCoachOverlay.tscn/.gd with spotlight shader + coach card.
  3. ClassifyLightcurveScreen.tscn/.gd (new, M3).
  4. Trigger wiring for the 4 deferred popups + the build gate, using existing scenes.
  5. Run headless/in-editor; confirm no parse errors; summarize changes + list TODOs.

Match the prototype's layout, copy and interaction timing. Where a value isn't
specified, choose the nearest DS token. Ask only if a referenced node/scene is missing.
```

---

### Notes for whoever runs this
- The exact coach copy, step anchors, spotlight regions, popup stat chips and the
  build-gate numbers all live in `ui_kits/landnam-portrait/tutorial.jsx`. Lift them
  verbatim.
- The screen-driven controller pattern (so the coach and the real buttons never
  desync) is implemented in `ui_kits/landnam-portrait/app.jsx` — read `coachAdvance`
  and the `stepsHere`/`coach` derivation before writing the Godot version.
- `DS.gd` ↔ `colors_and_type.css` are 1:1; use `DS.gd` in-engine.
