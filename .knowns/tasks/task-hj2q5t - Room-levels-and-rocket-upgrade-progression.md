---
id: hj2q5t
title: Room levels and rocket upgrade progression
status: todo
priority: medium
labels:
  - rooms
  - upgrades
  - progression
  - rockets
  - experiment1
createdAt: '2026-02-28T00:00:00.000Z'
updatedAt: '2026-02-28T00:00:00.000Z'
timeSpent: 0
assignee: '@me'
---
# Room levels and rocket upgrade progression

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Notes from physical notebook page 121 (28.02.26). Room-based upgrade system — rooms have levels tied to consumable rockets, and the overall rocket level is determined by the rooms installed.

**Transcribed notes (page 121, 28.02.26):**

> Continual (room) levels will be different to P65 because the continuities (e.g. rockets) are consumable — [each] level upgrade for the rockets [counts / results] in room upgrades.
>
> e.g. level 1 → starter shop

Early game:
> In the early game, room / rocket component crafts [are] individually upgradeable — they're just used to identify upgrades and user capacity.

Later game:
> Later on, rooms and parts will become upgradeable.
> ↓ branches → rockets

Arc annotation (key design rule):
> Users must upgrade halls to "fit" the upgrade threshold.
> New upgrades [standard / threshold].
> This eventually determines the overall level of the rocket.

---

## Room System Design

### Core principle

Rooms are modules installed into a rocket's hull. The **hall/bay dimensions** constrain which modules can fit. Larger or higher-tier modules require the bay to be expanded first — you can't install a Level 3 engine in a Level 1 bay. The rocket's overall level is the aggregate of its installed rooms, not a separate stat.

This is distinct from P65's building system: rooms are **not persistent structures** attached to a home base. They're part of the rocket itself, which is consumable. Players configure rooms per-rocket, and a rocket lost on a mission takes its room loadout with it.

---

### Room categories for Planet Hunters

Informed by Pixel Starships (Savy Soda), FTL, Cosmoteer, and Space Haven — adapted to Planet Hunters' mining/exploration context:

#### 1. Propulsion
> Controls speed, fuel efficiency, and range.

- **Basic Thruster** — starter engine, short range
- **Fusion Drive** — mid-tier, improved efficiency
- **Ion Drive** — high-tier, max range, slow acceleration
- Upgrade path: speed / fuel burn rate / range radius unlocks

#### 2. Fuel / Power
> Determines how far the rocket can travel and how much power is available for other rooms.

- **Fuel Tank** (small / medium / large) — increases fuel capacity
- **Reactor Core** — generates power for active rooms; higher tier = more power slots
- **Power Capacitor** — stores burst power for high-draw events (mining drill activation, etc.)
- Key mechanic: fuel is calculated at orbit and cannot be replenished mid-flight (see task-k4p7nc)

#### 3. Storage / Cargo
> Determines how much ore/resource can be brought back.

- **Cargo Bay** (basic / reinforced / pressurised) — ore capacity
- **Resource Vault** — stores refined/processed resources separately from raw ore
- **Cold Storage** — for biological/perishable specimens (later-game missions)
- Upgrade: capacity, ejection slots (can ditch cargo mid-mission to save fuel), auto-sort

#### 4. Mining / Extraction
> Tools deployed at the target to extract resources.

- **Mining Drill** — surface extraction; powered from reactor
- **Subsurface Probe** — deploys into ground to find subsurface deposits (unlocks drone layer)
- **Mining Drone Bay** — holds and deploys mining drones (see task-lmky3l / task-bz4bzo)
- **Conveyor / Intake System** — speed of transfer from extraction point to cargo bay
- Upgrade: drill speed, depth rating, drone count

#### 5. Navigation / Scanner
> Target selection, anomaly detection, mission planning.

- **Basic Nav Module** — shows known planets; limited range
- **Scanner Array** — detects anomalies on/around targets (required for anomaly selection, see task-7z1z11)
- **Spectral Analyser** — reveals composition of targets before landing (reduces mission risk)
- **Deep-Space Relay** — extends communication range for longer missions
- Upgrade: scan radius, scan accuracy, anomaly confidence score

#### 6. Hull / Armour
> Structural integrity; determines survivability of atmospheric entry, asteroid impact, etc.

- **Basic Hull Plating** — starter; low HP
- **Reinforced Shell** — mid-tier; resists minor collisions
- **Ablative Armour** — high-tier; self-repairing over time
- **Parachute Module** — consumable; enables safe landing on high-gravity bodies
- Hall/bay expansion: hull upgrades also increase internal bay dimensions, which gates other room upgrades

#### 7. Crew / Life Support
> (Later game / higher rocket tiers) — if crew are introduced.

- **Life Support Core** — basic O2 + pressure
- **Crew Quarters** — rest/morale system
- **Med Bay** — repairs crew after hazardous missions

#### 8. Science / Lab
> Citizen science and mission value multipliers.

- **Sample Lab** — processes specimens during transit, increases mission payout
- **Telescope Module** — passive observation during transit; generates citizen-science data
- **Atmospheric Sensor** — records atmospheric data at target; bonus XP

#### 9. Communication
> Connects back to Earth during missions.

- **Comms Relay** — maintains uplink; required for live mission updates/debrief data
- **Broadcast Array** — high-quality data transfer; increases science score per mission

---

### Hall / Bay size and upgrade gating (Pixel Starships model)

Rooms have a **tile footprint** (e.g. 1×1, 1×2, 2×2). Bays have a fixed number of tile slots. To install a larger or higher-tier room:

1. Player must first **upgrade the bay** to increase its tile capacity
2. Each bay upgrade costs resources and increases overall rocket mass (affects fuel burn)
3. T2 bay areas (expansion zones) may only accept utility rooms (storage, fuel, nav) — not weapons or extraction hardware in restricted zones

This creates a meaningful decision tree: expand a bay for a bigger engine and pay more fuel cost, or keep a lean rocket and accept range limits.

**Stage-based upgrade progression** (informed by Pixel Starships "complete Stage 1 for all rooms, then Stage 2"):
- Rooms have upgrade tiers (Stage 1, 2, 3...)
- A room being upgraded is non-functional during the upgrade
- Upgrading all rooms to the same stage before pushing any to Stage 2 is a viable meta-strategy
- Cancelling an upgrade mid-way should refund a portion of the spent resources

---

### Reference: how Pixel Starships does it

Pixel Starships uses an H×V grid coordinate system. Key learnings applicable here:

- **Crew routing matters**: rooms need accessible pathways; if lifts/corridors block access, crew bottleneck. In Planet Hunters this could map to: drone/supply routing between extraction and cargo requires a path — a blocked conveyor means slower ore transfer.
- **T2 expansion zones**: expanded hull areas only accept resource/storage rooms, not weapons. Forces strategic placement.
- **Module slots per room** (1–3 modules based on tier): rooms can have defensive sub-modules added (like a fuel tank with an auto-seal module that prevents leaks on impact). This could be a nice depth layer.
- **Non-functional during upgrade**: matches the Planet Hunters rocket-is-consumable model — upgrading a room mid-mission doesn't happen; upgrades happen at the launchpad/garage between missions.

Other references:
- **Cosmoteer**: fully free-form grid, individual module destruction — good inspiration for visual damage states on rooms
- **FTL**: power-slot system as an alternative if grid becomes too complex — might work for Planet Hunters' simpler early game
- **Space Haven**: efficiency-focused layout (compact bays, no wasted corridors) — good inspiration for the "efficient rocket" meta-game

---

### Room taxonomy summary table

| Category | Starter Room | Mid-tier | High-tier | Notes |
|---|---|---|---|---|
| Propulsion | Basic Thruster | Fusion Drive | Ion Drive | Affects range + fuel burn |
| Power | Small Reactor | Fusion Reactor | Backup Capacitor | Powers active rooms |
| Fuel | Small Tank | Medium Tank | Large Tank | Calculated at launch |
| Storage | Cargo Bay | Reinforced Bay | Pressurised Vault | Ore capacity |
| Mining | Mining Drill | Subsurface Probe | Drone Bay | Extraction tools |
| Navigation | Basic Nav | Scanner Array | Spectral Analyser | Anomaly targeting |
| Hull | Basic Plating | Reinforced Shell | Ablative Armour | HP + bay expansion |
| Parachute | Basic Chute | — | — | Consumable per use |
| Science | Sample Lab | Telescope | Atmo Sensor | Bonus XP / payout |
| Comms | Comms Relay | Broadcast Array | — | Debrief data quality |

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rooms have levels distinct from P65 — tied to consumable rockets, not a persistent base.
- [ ] #2 Level 1 rocket includes a starter shop / basic loadout: Basic Thruster, Small Reactor, Small Tank, Cargo Bay, Mining Drill, Basic Nav, Basic Plating.
- [ ] #3 Hall/bay tile capacity gates room installation — larger rooms require bay upgrades first.
- [ ] #4 Each room category (propulsion, fuel, storage, mining, nav, hull, science) has at least 2 upgrade tiers defined.
- [ ] #5 A room being upgraded is non-functional (offline) during that upgrade process.
- [ ] #6 The rocket's overall level is derived from its installed rooms, not a separate XP stat.
- [ ] #7 T2 bay expansion zones restrict which room types can be installed (utility-only in expanded areas).
- [ ] #8 Parachute is a consumable room slot — it depletes on use and must be restocked.
- [ ] #9 Science rooms (Sample Lab, Telescope) increase mission payout/XP — trackable in debrief.
- [ ] #10 Later-game progression unlocks crew quarters / life support room category.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Source: handwritten notebook page 121, photos IMG_1830.jpeg in the Rooms & Upgrades Obsidian note.

Key distinction from P65: rooms are not permanent structures — they're tied to consumable rockets. Each launch carries its own room configuration.

The "halls must fit upgrades" rule is the central gating mechanic. It should be surfaced clearly in the UI when a player tries to install a room that doesn't fit: "Upgrade your bay first."

Related tickets:
- `task-k4p7nc` — item/component/resource system (fuel-at-orbit, storage ratios)
- `task-r8mxvw` — transit animation (ship data dashboard visible during travel, which will show room stats)
- `task-lmky3l` — mining drone deployment (drone bay room)
- `task-bz4bzo` — drone targeting logic (subsurface probe room)
- `task-7z1z11` — scanner anomaly selection (scanner array room)

Reference:
- Pixel Starships: https://pixelstarships.fandom.com/wiki/Rooms
- Pixel Starships advanced layout: https://pixelstarships.fandom.com/wiki/Advanced_Layout_Guide
<!-- SECTION:NOTES:END -->
