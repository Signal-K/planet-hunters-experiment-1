---
type: decision
title: Missions are contracts, your own program, probe feeds and event forks
project: Landnam
status: decided
created: 2026-11-21
---

# Missions are contracts, your own program, probe feeds and event forks (2026-11-21)

Liam, SSL-870, correcting a flat list of mission types.

## Decision

- **Contracts** are client work, and a client pays a fee. There are four kinds:
  - mining;
  - delivery and transport relay;
  - construction;
  - exploration.
- **Program** is the player building their own base and space programme. Nobody pays a fee. It covers:
  - launching satellites and probes;
  - scanning and exploring;
  - free mining;
  - construction at the base;
  - sending vehicles such as rovers.
- **Classification scenes come from probes.** They are the data the player's probes and satellites send home. They never appear on the mission board as missions.
- **Limited-time missions are forks.** A meteor shower run, for example, forks one of the templates above. It inherits that template's beats and changes or adds only what the event brings, such as catching fireballs.

## Mining methods (added 2026-11-21)

Liam asked about the scenes where you mine from space or orbit. Under `Mining missions follow one scene flow (2026-10-29).md`, mining has two methods, picked before launch, and the ship's laser from orbit is the default.

- The mining templates list `methods = ["orbit-laser", "rover"]`: contract-mining, program-free-mining, and event-meteor-run through its fork. A beat with `method` plays only for that method.
- Orbit laser: Survey (geoscan), then Laser on the `orbit` view. The ship flies a low pass with the ground below, the stick slides it, and the laser cuts only scanned ore.
- Rover: Survey, Site, Land, Mine on the `field` view, Lift off.
- Both views are TakeOn's 3D field (KES-543). Its camera never turns: it sits behind the vehicle looking north, so up on the stick is always north.
- `beatsFor(template, method)` on web and `beats(for:)` on iOS give the beats played for a method.

## How it is built

- Each type is a template in `shared/authoring/templates/*.toml`. A template has:
  - a family (`contract`, `program`, `feed` or `event`);
  - beats, each with a view, a goal and controls;
  - an outcome;
  - match rules.
- The template schema is `shared/authoring/schema/template.schema.json`. `node scripts/authoring.mjs compile` resolves forks and writes the templates to:
  - `shared/missions/mission-templates.json`;
  - `web/lib/data/mission-templates.json`;
  - `MissionTemplates.generated.swift`.
- Every authored mission names its template in its required `template` field.
- Runtime missions resolve with `templateForMission` on web and `MissionTemplateCatalog` on iOS. An exact id beats the longest id prefix, which beats the board tag.
- Beats that play on terrain use the `field` view, which is TakeOn's top-down field model (KES-541).
