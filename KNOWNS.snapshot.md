# Landnam Knowns Snapshot

> Generated from the parent Navigation `.knowns` project. This file is read-only context for agents that can only see this repository.

Generated: 2026-07-12T11:37:01.491Z

## Canonical Source

- Live Knowns root: `../.knowns`
- Live Knowns repo: `..`
- Bridge config: `.knowns-bridge.json`
- Writable outbox: `.knowns-outbox/`
- Refresh from the parent repo with `make knowns-sync`.

Do not edit this snapshot to update tasks or docs. When the parent repo is accessible, use the canonical Knowns tools against `../.knowns`.

If the parent repo is not accessible, write proposed task/doc/context updates into `.knowns-outbox/` and mention them in your final response. Parent-capable agents collect them with `make knowns-outbox-collect` and apply accepted updates to canonical Knowns.

## PM Vault Worklog

For Star Sailors project work, update the relevant ticket in the parent repo PM vault before your final response.

When the parent repo is accessible, use `python3 ../scripts/pm.py update <ticket-id> --status <status> --comment "<evidence>"` from a child repo, or `python3 scripts/pm.py update <ticket-id> --status <status> --comment "<evidence>"` from the parent repo.

The comment should state what changed, what validation ran, and any remaining risk. Ticket IDs are local PM-vault IDs such as `LN-001`, `SA-001`, `BE-001`, or `CL-001`.

If the parent repo is not accessible, write the proposed worklog record into `.knowns-outbox/` and mention it in your final response so a parent-capable agent can collect it.

## Active Or Recent Tasks

- @task-dj6os2 Require return-to-Earth ship destruction before payout [in-review priority=high labels=project-landnam,sprint-2026-07-11,sprint-active,feature]
- @task-nv06ay Contractor chain missions: mine at one target and deliver to another [todo priority=high labels=project-landnam,sprint-2026-07-11,sprint-active,feature]
- @task-nn7cc2 Contractor logistics missions: transport items between targets [todo priority=high labels=project-landnam,sprint-2026-07-11,sprint-active,feature]
- @task-muladw Research tree unlocks all current mechanics [todo priority=high labels=project-landnam,sprint-2026-07-11,sprint-active,feature]
- @task-hjili0 Evaluate tablet orientation UX for desktop layout [todo priority=medium labels=project-landnam,sprint-2026-07-11,sprint-active,small,ux,tablet]
- @task-tve1ci Failed classification fallback — pick another target [todo priority=medium labels=project-landnam,sprint-2026-07-11,sprint-active,bug,small,classification]
- @task-r19h9m Idea - add scrolling support for base visibility to mobile [todo priority=medium labels=project-landnam,sprint-2026-07-11,sprint-active,small,ux,mobile]
- @task-toaozt Launch sequence scene: fix rendering artifacts and pixelation on mobile [in-review priority=medium labels=project-landnam,sprint-2026-07-11,sprint-active,bug,small,mobile,pixijs]
- @task-csu5ka Mission board: add 1-2 intro coach steps explaining contractors and missions before contract selection [in-review priority=medium labels=project-landnam,sprint-2026-07-11,sprint-active,small,ux,mission-board]
- @task-74084r Coach pointer: replace floating arrow with element highlight ring on mobile [in-review priority=high labels=project-landnam,sprint-2026-07-11,sprint-active,bug,small,ux,mobile]
- @task-9qs985 Mission board: too many confirm steps in M1 mission setup flow [in-review priority=high labels=project-landnam,sprint-2026-07-11,sprint-active,bug,small,ux,mission-board]
- @task-mscqon Build PocketBase and PostHog mobile dashboard PWA [in-progress priority=high labels=project-landnam,project-star-sailors,sprint-2026-07-04,pocketbase,posthog,pwa]
- @task-va979g Citizen science: E2E Cypress coverage for TESS flow (SMS -> story mission -> telescope live -> classify -> target appears) [todo priority=medium labels=project-landnam,sprint-2026-07-05,citizen-science,testing,cypress,e2e]
- @task-3jcu5z Citizen science: exoplanet visit / follow-up mission loop design & implementation [todo priority=medium labels=project-landnam,sprint-2026-07-05,citizen-science,exoplanet,mission-design]
- @task-tdgihi Citizen science: asteroid generation inside explored exoplanet systems [todo priority=medium labels=project-landnam,sprint-2026-07-05,citizen-science,exoplanet,asteroids]
- @task-24b84t Citizen science: wire classified target stars to appear on galaxy map immediately after telescope downlink/selection [todo priority=medium labels=project-landnam,sprint-2026-07-05,citizen-science,galaxy-map,frontend]
- @task-xq727f Citizen science: galaxy map full interactive experience (zoom/pan, star targeting, system selection) [todo priority=medium labels=project-landnam,sprint-2026-07-05,citizen-science,galaxy-map,frontend]
- @task-kkhyll Citizen science: ClassifyScreen — lightcurve classification UI (portrait + desktop) [todo priority=medium labels=project-landnam,sprint-2026-07-04,frontend,classification]
- @task-q2tm7y Design advantage of on-world mining versus orbital mining [on-hold priority=medium labels=project-landnam,future-sprint,game-design,mining,rovers]
- @task-gdivqt On-ship immediate processing/refining option [on-hold priority=low labels=project-landnam,future-sprint,refinery,ship-customizer,economy]
- @task-urxlq9 Modular rover research and upgrade system [on-hold priority=medium labels=project-landnam,future-sprint,rovers,upgrades,research]
- @task-21r02s Conveyor/rover landing animation for on-world mining [on-hold priority=low labels=project-landnam,future-sprint,rovers,mining,animation]
- @task-5w52xv Citizen science data feed through scanning station [on-hold priority=medium labels=project-landnam,future-sprint,citizen-science,scanning,data-feed]
- @task-uu6qod Scanning station upgrade path [on-hold priority=medium labels=project-landnam,future-sprint,scanning,upgrades,earth-base]
- @task-6g8eh6 Satellite complete-scan mission system [on-hold priority=medium labels=project-landnam,future-sprint,scanning,satellite,missions]
- @task-h7k86q Real travel time + push notification on rocket arrival (post-tutorial) [blocked priority=high labels=project-landnam,sprint-5,travel-time,push-notifications]
- @task-olakwt **Classification notifications status**: In-game notifications when "your classification w [on-hold priority=low labels=project-landnam,classification,scribe-fallback,deferred,not-sprint-5]
- @task-cyf14o Leaderboard integration for researchAnnotations [on-hold priority=low labels=project-landnam,classification,leaderboard,deferred,not-sprint-5]
- @task-qdofms Wire response_time_ms through classifyCandidate [on-hold priority=low labels=project-landnam,classification,implementation,deferred,not-sprint-5]
- @task-xelks5 Accuracy scoring for calibration subjects [on-hold priority=low labels=project-landnam,classification,scoring,deferred,not-sprint-5]
- @task-h4tswb Earth per-season weather profiles + transient events [backlog priority=low labels=project-landnam,earth,weather,visuals]
- @task-uav5m1 Climate/storm system spec — per-planet storm states gating mining conditions [backlog priority=medium labels=project-landnam,spec,citizen-science]
- @task-vqmg64 Earth base visual evolution: implement visible base growth through progression [todo priority=medium labels=project-landnam,retention,visual,earth-base]
- @task-a0b2ar Earth base starter structure placement pass [todo priority=medium labels=project-landnam,earth-base,visual]
- @task-03jqbt Room builder UI design for non-starter rockets [todo priority=medium labels=project-landnam,ux,design,spec]
- @task-ka1512 Asteroid/planet discovery cross-pollination across ecosystem [backlog priority=low labels=project-landnam,deferred,social]
- @task-4ctsr9 Long-term data transmission to research institutions [backlog priority=low labels=project-landnam,deferred,citizen-science]
- @task-kelb3t Real-time discovery sharing and community progress [backlog priority=low labels=project-landnam,deferred,social]
- @task-ggfkz5 Discovery confirmation flow back to players [backlog priority=low labels=project-landnam,deferred,citizen-science]
- @task-yyk6k8 Community annotations with consensus factor [backlog priority=low labels=project-landnam,deferred,citizen-science]

## Recently Completed Tasks

- @task-dsk-03 Redesign ClassifyLightcurveScreen for desktop (two-column layout) [done priority=medium labels=project-landnam,frontend,classification,desktop,deferred,not-sprint-5]
- @task-sdl5zt Sprint 5 end-state playthrough verification (June 27) [done priority=high labels=project-landnam,sprint-5,verification,e2e,playthrough]
- @task-46cass Routine: Galaxy map design QA and mobile visual pass [done priority=medium labels=project-landnam,sprint-5,routine,galaxy-map,ui,qa]
- @task-v0wpiu Routine: Sprint 5 galaxy map regression and playthrough gate [done priority=high labels=project-landnam,sprint-5,routine,galaxy-map,verification,e2e]
- @task-l7jyv3 Add mining scene juice: particle/feedback effects on existing mining scene [done priority=high labels=project-landnam,sprint-5,gameplay,mining,retention]
- @task-w6ikij Verify PocketBase missions_catalog drives M1-M3 at runtime (not static fallback) [done priority=high labels=project-landnam,sprint-5,missions,pocketbase,data,qa]
- @task-flrdzf Asset pipeline triage pass: review _generated/, deduplicate earth-* assets, decide ships/ores dirs [done priority=high labels=project-landnam,sprint-5,asset-pipeline,cleanup]
- @task-49fa0o M1 and M2 tutorial coach step audit — verify correct fire order and no duplicates [done priority=medium labels=project-landnam,sprint-5,onboarding,tutorial,qa]
- @task-2oa8kl Research in-game time compression ratio for contractor cooldowns [done priority=medium labels=project-landnam,sprint-5,cooldowns,time-compression,research]
- @task-zed2zu Reconcile construction-and-settlements doc with Sprint 5 model [done priority=medium labels=project-landnam,sprint-5,docs,cleanup]
- @task-vumzth Define refined mineral value multipliers per mineral type [done priority=medium labels=project-landnam,sprint-5,economy,minerals,refinement,design,docs]
- @task-p776h4 Decompose game-context.tsx into domain-specific contexts [done priority=medium labels=project-landnam,refactoring,tech-debt]
- @task-08yud8 Routine: TargetPicker galaxy map implementation batch [done priority=high labels=project-landnam,sprint-5,routine,galaxy-map,target-picker,implementation]
- @task-e0nd74 Procedural celestial body rendering for TargetPickerScreen [done priority=high labels=project-landnam,sprint-5,target-picker,procedural-gen,visuals]
- @task-jo7mi0 Migrate TargetPickerScreen solar map to PixiJS canvas [done priority=high labels=project-landnam,sprint-5,target-picker,pixi,engine]
- @task-h20xtc Expand TargetPickerScreen map to fill available vertical space [done priority=medium labels=project-landnam,sprint-5,target-picker,ui,layout]
- @task-oufjuk PixiJS full-scene-swap for ship customizer (category focus + zoom) [done priority=medium labels=project-landnam,sprint-2026-06-27,pixi,ship-customizer]
- @task-4tva5p PixiJS target interaction scene for construction placement [done priority=high labels=project-landnam,sprint-2026-06-27,pixijs,construction,game-engine]
- @task-dz5ojj Operationalize Rocket Room Systems — Sprint Spec (21 June 2026) [done priority=medium labels=project-landnam,sprint-2026-06-27,scribe-fallback,triage,ship-customizer]
- @task-7z0ycw Daily quest framework for scan and landing jobs [done priority=medium labels=project-landnam,sprint-2026-06-27,daily-quests,scanning,missions]

## Project Docs

- No project docs found.
