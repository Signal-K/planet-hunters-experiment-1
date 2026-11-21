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
