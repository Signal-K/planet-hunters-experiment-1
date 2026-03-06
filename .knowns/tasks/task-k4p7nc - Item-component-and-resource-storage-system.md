---
id: k4p7nc
title: Item component and resource storage system
status: done
priority: medium
labels:
  - items
  - resources
  - storage
  - components
  - experiment1
createdAt: '2026-02-28T00:00:00.000Z'
updatedAt: '2026-03-06T04:37:40.682Z'
timeSpent: 967
assignee: '@me'
---
# Item component and resource storage system

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Notes from physical notebook page 120 (28.02.26). Design of the item/component taxonomy, storage system, and resource model for early-game play.

**Transcribed notes (page 120, 28.02.26):**

General framing:
> Anyway, (flight components of the game, mainly can be added and the... principles, items), BUT:
> A lot of these items/components are consumable — added in the game, potentially for other games, like Resources.
> Then [some] zero possibilities for other games, theme-like... becomes...

Item taxonomy:
> To compare — keep simple, let's look at what the store/shop should look like.
>
> Items → Consumable → Recharge, [???] items
>       → Component → Consumable
>
> - Storage
> - Mining
> - Armor [Hull / plating]
> - Parachute → [Consumable?]
>
> First: look → consider Backbone [Backpack?]

Components section:
> Crumble →

Storage / fuel interaction (pressing E):
> Pressing E (only required) → shows STORAGE and ratios/ratings of storage
>
> At the orbit (only required) → loader calculates fuel storage to reach target, fuel course back to fuel storage.
> This provides or [calculates] that. The user will not be able to top up this fuel resource
> [considering their ability to reform their... resources].
>
> → fill the early jar.

Resources:
> Resources would have:
> - Wheel treads
> - Mining disc/low... [for another day]

Reactor / weapons section:
> - Reactor / Pulsar pool
> - Cannon [else]
>
> → early game: users have [items] on the target — the planets are highlighted.
> Fill that [order], highlighted. Fill it that tags / fuel supply [in/out].
> → (it [stages] / fuel demand resource... gathering spec resource)

> Storage...
> New tools: ...
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Items are categorised as Consumable (rechargeable) or Component (craftable/upgradeable).
- [x] #2 Core component types defined: Storage, Mining, Armor/Hull, Parachute, Backbone/Backpack.
- [x] #3 Pressing E during play opens a STORAGE panel showing current ratios/quantities.
- [x] #4 At orbit, the game calculates required fuel vs. available fuel — player cannot top up mid-flight.
- [x] #5 Early-game resource list scaffolded: wheel treads, mining disc, reactor/pulsar, cannon.
- [x] #6 Planet targets are highlighted and drive a resource-gathering/supply loop in early game.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
$## Summary
- New ItemCatalog.gd: Consumable/Component enum, 10 named items (fuel cell, parachute, backbone pack, cargo storage, mining drill, mining disc, hull plating, reactor core, pulsar pool, wheel treads, cannon), EARLY_GAME_ITEMS list
- SidescrollMining _update_inventory_display(): panel renamed STORAGE, now shows Fuel/Heat/Beam ratios before mineral list
- RocketSpecs: added BASE_RANGE_AU const + get_max_range_au() helper
- LaunchpadSelectorPanel target cards: planet/tess targets get distinct blue border + [PLANET] label prefix + sky-blue name color; all cards show fuel range check (in range / out of range with max AU)
- 23/23 GDScript tests pass
<!-- SECTION:NOTES:END -->

