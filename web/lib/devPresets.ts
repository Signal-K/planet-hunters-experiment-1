import { STARTER_BASE_PLACED, STARTER_BASE_PLOTS } from '@/lib/data/starter-base'
import { completeChainRadio, getShowerChain } from '@/lib/orionids/chain'
import { VISUAL_TESS_CANDIDATE } from '@/lib/visual-fixtures'
import { rocketConfigForModel } from '@/lib/data/rockets'
import { weekKey } from '@/lib/research/paths'
import { ROCKET_PRICES, STARTING_FRANCS } from '@/lib/data/economy'
import type { GameState, Player } from '@/game-context'
import { MISSIONS, ROCKET_IDS, TARGETS } from '@/lib/data'
import { sectorDeposits, sectorIds } from '@/lib/probes/survey-probe'
import { ORIONIDS_NIGHT_RUN_ID, RESOURCE_FOCUS_MISSION_ID, SELF_DIRECTED_MINING_MISSION_ID, showerRunMission } from '@/lib/data/missions'
import { isSandboxName, resolveSandbox } from '@/lib/sandbox'
import { missionFromPlan, type MissionPlan } from '@/lib/mission-planner'
import { MINERAL_META } from '@/lib/data/minerals'

const FIRST_MISSION = MISSIONS.find(m => m.sequence === 1) ?? MISSIONS[0]
const WORKSHOP_MISSION = { ...(MISSIONS.find(m => m.id === 'lnm_relay_psyche_ceres') ?? FIRST_MISSION), id: 'qa-workshop-relay', title: 'Workshop relay fit check', targetId: 'lutetia', requires: { minerals: { nickel: 2, cobalt: 2 }, cargo_min: 8, drill_tier: 2, max_orbit: 6 } }
const FIRST_MINERAL = Object.keys(FIRST_MISSION.requires.minerals)[0] ?? 'iron'
// SSL-332 Transport lesson (guided mission 2) is the two-leg "mine then
// deliver" client choice — Belt Courier Run (Bennu -> Vesta) is the authored
// pick used for these dev shots.
const TRANSPORT_MISSION = MISSIONS.find(m => m.id === 'lnm_m3_relay_bennu_vesta') ?? MISSIONS.find(m => m.sequence === 2) ?? FIRST_MISSION

const BASE_PLAYER: Player = {
  francs: 150_000_000,
  activeMission: null,
  missionCount: 1,
  pendingLaunch: false,
  placed: ['launchpad'],
  placementPlots: { launchpad: 0 },
  controlBuilt: false,
  missionsDone: 0,
  freeOperations: false,
  clientMissions: {},
  clientStreaks: {},
  clientCooldowns: {},
  researchAnnotations: 0,
  
  loanDebt: 0,
  loanOffered: false,
}

const EXTRACTION_DONE: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 8: true, 9: true }
const TRANSPORT_DONE: Record<number, boolean> = { ...EXTRACTION_DONE, 30: true, 31: true, 32: true, 33: true }
const TRAINING_DONE: Record<number, boolean> = { ...TRANSPORT_DONE, 40: true, 41: true }

// Story mission synthesized at runtime in game-context.tsx once free ops +
// the space telescope are unlocked — not in MISSIONS, so these
// presets set the ids directly rather than looking a mission up by sequence.
const TRANSIT_TELESCOPE_TARGET_ID = 'earth-orbit-transit-telescope'
const TRANSIT_TELESCOPE_MISSION_ID = 'story-transit-telescope-launch'

const POST_ONBOARDING_PLAYER: Player = {
  ...BASE_PLAYER,
  missionsDone: 3,
  placed: ['launchpad', 'transit-telescope'],
  placementPlots: { launchpad: 0, 'transit-telescope': 1 },
  freeOperations: true,
  transitSatelliteLevel: 1,
  transitSatelliteLaunchedAt: null,
}

// Space Telescope built alongside the transit satellite (STS-622) —
// asteroid-discovery presets need both instruments' unlock gates cleared,
// since deepSpaceTelescopeUnlocked() also checks transitSatelliteLevel.
const ASTEROID_DISCOVERY_PLAYER: Player = {
  ...POST_ONBOARDING_PLAYER,
  placed: [...POST_ONBOARDING_PLAYER.placed, 'deep-space-telescope'],
  placementPlots: { ...POST_ONBOARDING_PLAYER.placementPlots, 'deep-space-telescope': 2 },
  transitSatelliteLevel: 2,
  deepSpaceTelescopeBuilt: true,
  deepSpaceTelescopeLevel: 1,
  clientMissions: { 'helios-propulsion-depot': 2 },
}

export interface DevShot {
  key: string
  label: string
  hint: string
  // Whether this preset's player.freeOperations is true (Free Ops / fully
  // post-tutorial) or false (still mid-onboarding, tutorial coach active) —
  // set explicitly per-shot from the actual resolvePreset() player state so
  // the DEV panel can't be misread as "tutorial fully finished" when a
  // preset is really mid-mission (see STS-635). Source of truth is each
  // preset's player.freeOperations below, not the group it lives in — some
  // groups (Recent UI) mix both stages.
  stage: 'tutorial' | 'free-ops'
}

export interface DevGroup {
  label: string
  color: string
  shots: DevShot[]
}

export const DEV_GROUPS: DevGroup[] = [
  {
    label: 'Extraction',
    color: '#50d9bc',
    shots: [
      { key: 'm1-intro',  label: 'Intro',   hint: 'Fresh start, no progress', stage: 'tutorial' },
      { key: 'm1-hub',    label: 'Hub',     hint: 'Launchpad built, Extraction coach active', stage: 'tutorial' },
      { key: 'm1-fab',    label: 'Fab',     hint: 'First generated mission + Eros picked, at fab', stage: 'tutorial' },
      { key: 'm1-mining', label: 'Mining',  hint: 'In mining with iron target', stage: 'tutorial' },
      { key: 'solar-site-mining', label: 'Solar site mining', hint: 'Selected Mercury site with preserved cargo and charges', stage: 'free-ops' },
      { key: 'solar-field-mining', label: 'Solar field mining', hint: 'Mine and revisit a generated Mercury field', stage: 'free-ops' },
      { key: 'solar-playtest', label: 'Solar mission playtest', hint: 'Land, mine and return in an isolated test mission', stage: 'free-ops' },
      { key: 'ui-mining-survey', label: 'Mining mapped finds', hint: 'SSL-879: two Eros sectors, one aluminium haul; mapped mix plus required ore', stage: 'free-ops' },
      { key: 'm1-debrief',label: 'Debrief', hint: 'Post-mine debrief, 6 iron', stage: 'tutorial' },
      { key: 'm1-return', label: 'Return',  hint: 'Flying home with the haul', stage: 'tutorial' },
      { key: 'm1-home',   label: 'Home',    hint: 'Touchdown on the pad, delivery sheet', stage: 'tutorial' },
    ],
  },
  {
    label: 'Transport',
    color: '#91ccef',
    shots: [
      { key: 'transport-hub',     label: 'Hub',     hint: 'Extraction done (missionsDone: 1), Transport coach active — pick the two-leg client job', stage: 'tutorial' },
      { key: 'transport-fab',     label: 'Fab',     hint: 'Belt Courier Run accepted (Bennu -> Vesta), at fab', stage: 'tutorial' },
      { key: 'transport-mining',  label: 'Mining',  hint: 'In mining at Bennu, delivery leg to Vesta pending', stage: 'tutorial' },
      { key: 'transport-delivery', label: 'Delivery', hint: 'Cargo transfer at Vesta with mixed cargo (ordered + leftover minerals)', stage: 'tutorial' },
      { key: 'solar-site-delivery', label: 'Solar site delivery', hint: 'Experimental Mercury descent and rover cargo delivery', stage: 'free-ops' },
      { key: 'transport-delivery-timed', label: 'Timed delivery', hint: 'Regular two-leg delivery at Vesta with automated unloading', stage: 'free-ops' },
      { key: 'transport-debrief', label: 'Debrief', hint: 'Two-leg run complete, delivered at Vesta then returned', stage: 'tutorial' },
    ],
  },
  {
    label: 'First Satellite Launch',
    color: '#f5d947',
    // Full walkable flow, in order: accept the fixed telescope story
    // mission -> fab -> physical transit to Earth orbit (dev "Skip ▸" button
    // on that screen fast-forwards the ETA) -> debrief/satellite deployed ->
    // TESS Console, where "pointing" (PixiGalaxyStarMap) and "waiting for
    // the transit" (daily candidate rotation, keyed by calendar date) live —
    // that screen has its own dev-only "+1 DAY" control since it has no
    // in-scene timer to skip, unlike the rocket ETA. See the "Transit" vs
    // "transit-photometry" naming note in TransitScreen.tsx and the ZenNotes
    // decision doc for why these are two unrelated screens sharing a word.
    shots: [
      { key: 'telescope-hub',      label: 'Hub',      hint: 'Post-onboarding, Free Ops unlocked, telescope built, story mission on the board', stage: 'free-ops' },
      { key: 'telescope-fab',      label: 'Fab',      hint: 'Space telescope mission accepted, at fab — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-flight-return', label: '3D return flight', hint: 'SSL-847: timed cruise home, painted blue from the workshop, long enough to inspect every viewport and offline rendering', stage: 'free-ops' },
      { key: 'telescope-transit',  label: 'Transit',  hint: 'Rocket physically en route to Earth orbit to deploy the telescope — dev "Skip ▸" button fast-forwards this. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'telescope-debrief',  label: 'Debrief',  hint: 'Telescope deployed, satellite launched — post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-tess-training', label: 'Telescope training', hint: 'Training try 2 of 3: mark the dip in the training light curve and Submit · Transit to see the result card', stage: 'free-ops' },
      { key: 'ui-tess-receipt', label: 'TESS contribution receipt', hint: 'Confirmed research and existing fragments after classification', stage: 'free-ops' },
      { key: 'ui-tess-discovery',  label: 'Console',  hint: 'Satellite already in orbit — point it (star map) and review the daily transit-photometry candidate. Stationary, no travel. Use the on-screen dev "+1 DAY" control to preview future days without waiting. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
    ],
  },
  {
    label: 'Recent UI',
    color: '#9b8cf0',
    shots: [
      { key: 'ui-free-ops-fab', label: 'Free Ops launch', hint: 'Free Ops with no mission opens the launch route and lands on the Mission Board', stage: 'free-ops' },
      { key: 'ui-mission-board', label: 'Mission Board', hint: 'Recent OD layout restyle with client cards — Free Ops unlocked, tutorial off', stage: 'free-ops' },
      { key: 'ui-target-picker', label: 'Launch Review', hint: 'Launch review (the target picker is folded in) with the Transport mission loaded — missionsDone: 1, Free Ops NOT unlocked', stage: 'tutorial' },
      { key: 'ship-customizer', label: 'Ship Customiser', hint: 'Unlocked hangar interior view with Explorer room slots — missionsDone: 1, Free Ops NOT unlocked', stage: 'tutorial' },
      { key: 'ui-hangar-assembly', label: 'Hangar Assembly', hint: 'Prospector shipment fitting in the hangar before launchpad transfer — missionsDone: 1', stage: 'tutorial' },
      { key: 'ui-research-calendar-empty', label: 'Research calendar, empty', hint: 'Control Station with no stamps yet', stage: 'free-ops' },
      { key: 'ui-research-calendar-month-half', label: 'Research calendar, half month', hint: 'Control Station with stamps on most days so far this month', stage: 'free-ops' },
      { key: 'ui-agency-programme', label: 'Agency programme', hint: 'SSL-852: two orbital telescopes, donated spare capacity, shared findings and a completed Community Site licence', stage: 'free-ops' },
      { key: 'ui-agency-research', label: 'Agency research', hint: 'SSL-852: Agency path and shared frontier, behind the weekly passport', stage: 'free-ops' },
      { key: 'ui-craft-service', label: 'Data hub, worn craft', hint: 'SSL-852: the space telescope is worn by use and a solar storm, the Saturn satellite has failed; both offer servicing', stage: 'free-ops' },
      { key: 'ui-instrument-hub', label: 'Control Station', hint: 'One hub for telescopes and satellites. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-radio-meteors', label: 'Meteor radio', hint: 'Real BRAMS radio spectrograms from Radio Meteor Zoo (live Panoptes queue): box the meteor echoes. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-saturn-storm-search', label: 'Saturn Storm Search', hint: 'Saturn satellite launched — Cassini frame classify screen. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-asteroid-discovery', label: 'Asteroid Discovery', hint: 'Space Telescope built (STS-622) — live NEOCP candidate review, requires seeded asteroid_candidates on the shared backend. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-orionids-events-stage2', label: 'Orionids: radio step', hint: 'Mission board at event stage 2: the Orionids card opens mission 2 on ORI-1', stage: 'free-ops' },
      { key: 'ui-radio-meteors-last', label: 'Meteor radio: last check', hint: 'Orionids mission 2 with 2 of 3 recordings checked: the next send completes the chain and grades the badge', stage: 'free-ops' },
      { key: 'ui-orionids-ready', label: 'Orionids: ready', hint: 'Field guide complete, Orionids event focused, ready to choose the shower mission', stage: 'free-ops' },
      { key: 'ui-free-mining-silo-full', label: 'Free mining run, silo full', hint: 'Free run with the 40-unit Surface Silo already full (iron, cobalt, nickel). Free mining only stores, so what does not fit is left behind. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'loop-base', label: 'Core loop start', hint: 'Starter Base (launchpad, hangar, control station, Surface Silo) with Free Ops unlocked: the start of the map → launch → mine → debrief loop', stage: 'free-ops' },
      { key: 'ui-free-mining', label: 'Free mining run', hint: 'Self-directed Free Ops run at Itokawa: mine anything; the haul goes into the Earth silo (silo built). Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-focus-run', label: 'Materials focus run', hint: 'SSL-840: a Mineral Vault focus (15 aluminium, 8 copper) with 6 aluminium already stored, mining at Itokawa in a 6-unit hull. Return with whatever the hold carries; the next trip asks only for what is still missing', stage: 'free-ops' },
      { key: 'ui-orionids-shower-mining-fresh', label: 'Shower run: mining, fresh', hint: 'Orionids shower run on Eros at 0 of 20. Fragments fall and collect on landing. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-leonids-shower-mining-fresh', label: 'Leonids run: mining, fresh', hint: 'Leonids shower run near Earth at 0 of 20, with 40 Orionid catches in the save. Only Leonid fragments count. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-orionids-shower-mining', label: 'Shower run: mining', hint: 'Orionids shower run on Eros with the order filled (20 caught since accept, 25 in the ledger). Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-orionids-shower-debrief', label: 'Shower run: debrief', hint: 'Filled shower run back home: run payout card, fragments kept, haul to sell. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-launch-review', label: 'Launch review (single rocket)', hint: 'Single-rocket launch review reached from the solar map: place, work, cargo, rocket, Launch. Starter Base, Free Ops', stage: 'free-ops' },
      { key: 'ui-mission-log', label: 'Mission Log', hint: 'Mission Log tray over Base. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-ledger', label: 'Ledger', hint: 'Narrative ledger. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'ui-community-research-leonids', label: 'Community research: Leonids', hint: 'Explorer path in the Leonids week, pinned to 16 Nov 09:00 UTC (override with &at=). The event panel counts down to the peak and the event step leads the path', stage: 'free-ops' },
      { key: 'ui-clients-surplus', label: 'Clients: sell surplus', hint: 'SSL-734: Helios at affinity level 3 with platinum in the silo: its card sells surplus straight to Helios, 10% over the Exchange, up to 10 units today. Lumen (level 1) says what unlocks it. Open the Clients tab', stage: 'free-ops' },
      { key: 'ui-events-specials-gold', label: 'Events: special missions, gold', hint: 'SSL-657: Orionids and Leonids done in the window (gold), a gold Orionids find voucher and Meteorite Mastery 1. Every special is open, with Mastery +10%', stage: 'free-ops' },
      { key: 'ui-events-specials-silver', label: 'Events: special missions, silver', hint: 'SSL-657: Orionids done after the window (silver), no voucher, no Mastery. Only the impact survey is open; the rest show what they need', stage: 'free-ops' },
      { key: 'ui-leonids-events', label: 'Leonids: events board', hint: 'SSL-831: Leonids live (open with &at=2026-11-17T12:00:00Z for the peak). The Leonids card names mission 1, the shower run, and starts it', stage: 'free-ops' },
      { key: 'ui-leonids-shower-debrief', label: 'Leonids run: debrief', hint: 'SSL-831: filled Leonids run back home: the Leonid fragment sample and LEO-1 is up', stage: 'free-ops' },
      { key: 'ui-leonids-events-leo1', label: 'Leonids: LEO-1 step', hint: 'SSL-831: Leonids run done, 1 of 3 LEO-1 recordings checked. The card opens LEO-1', stage: 'free-ops' },
      { key: 'ui-radio-receipt-pending', label: 'Event pending receipt', hint: 'Locally saved event work awaiting research confirmation', stage: 'free-ops' },
      { key: 'ui-radio-receipt', label: 'Event contribution receipt', hint: 'Saved LEO-1 result, confirmed research and preserved fragment ledger', stage: 'free-ops' },
      { key: 'ui-radio-meteors-leo1', label: 'Meteor radio: LEO-1 last check', hint: 'SSL-831: Leonids mission 2 on LEO-1 with 2 of 3 recordings checked since the run (and older ORI-1 checks that do not count). The next send grades the badge', stage: 'free-ops' },
      { key: 'ui-community-research-leonids-leo1', label: 'Community research: Leonids LEO-1', hint: 'SSL-831: Explorer path in the Leonids week, run done, 1 of 3 LEO-1 recordings: the event step names LEO-1 and the history shows the fragment sample', stage: 'free-ops' },
      { key: 'ui-probe-launch', label: 'Survey probe: launch', hint: 'SSL-773: control station built, Free Ops. The Program tab offers survey probes to the two nearest bodies without one', stage: 'free-ops' },
      { key: 'ui-probe-debrief', label: 'Survey probe: debrief', hint: 'SSL-773: probe released into orbit at Eros; it waits for SCAN at the Data hub', stage: 'free-ops' },
      { key: 'ui-probe-watch', label: 'Field probe: watch the shower', hint: 'SSL-772: stationary lunar camera at the Leonids peak; confirm impacts. Observations survive reload in an isolated fixture save.', stage: 'free-ops' },
      { key: 'ui-probe-mars', label: 'Mars probe readings', hint: 'Survey deposits on Mars', stage: 'free-ops' },
      { key: 'ui-probe-europa', label: 'Europa probe readings', hint: 'Survey deposits on Europa', stage: 'free-ops' },
      { key: 'ui-probe-receipt', label: 'Probe confirmed receipt', hint: 'Server-confirmed research after a probe download', stage: 'free-ops' },
      { key: 'ui-probe-scan', label: 'Survey probe: readings', hint: 'SSL-832: SCAN starts timed mapping. Eros has 13 of 24 sectors mapped (4 new since the last visit); Vesta has just arrived', stage: 'free-ops' },
      { key: 'ui-probe-subsurface', label: 'Survey probe: subsurface', hint: 'Shallow and deep timed passes open in order after download', stage: 'free-ops' },
      { key: 'ui-probe-science', label: 'Survey probe: citizen science', hint: 'Level 4 spectrum marking and logged readings', stage: 'free-ops' },
      { key: 'ui-second-ground-telescope', label: 'Control Station: second ground telescope', hint: 'SSL-802: one ground telescope standing on the West annex and ₣6M in hand: Add a telescope buys the second one (₣2M) into the Unplaced tray', stage: 'free-ops' },
      { key: 'ui-probe-hub', label: 'Survey probe: data hub', hint: 'SSL-773: the data hub with the space telescope, the Saturn satellite and a survey probe at Eros with new sectors mapped', stage: 'free-ops' },
      { key: 'ui-community-research-site', label: 'Community research: Community Site', hint: 'SSL-758: a late joiner. The Community Spaceport is at Frame, this player has a small share, and last month\'s Observatory is archived. Open Rewards', stage: 'free-ops' },
      { key: 'ui-community-research-event-before', label: 'Community research: before a shower', hint: 'SSL-775: pinned to 20 Sep. The event panel previews the Orionids: when they start, what to do, the badge tiers', stage: 'free-ops' },
      { key: 'ui-community-research-event-after', label: 'Community research: after a shower', hint: 'SSL-775: pinned to 3 Dec. The Leonids ended on 30 Nov; the panel keeps the finished record and names the Geminids next', stage: 'free-ops' },
      { key: 'ui-community-research-geminids', label: 'Community research: Geminids', hint: 'Explorer path in the Geminids week. Open the stage with &at=2026-12-14T00:00:00Z so the shower is live', stage: 'free-ops' },
      { key: 'ui-community-research-orionids', label: 'Community research: Orionids 2 of 2', hint: 'Explorer path this week, on Orionids mission 2 with two ORI-1 recordings checked: the event step points at ORI-1 and the history shows the story items', stage: 'free-ops' },
      { key: 'ui-sky-pointing', label: 'Sky pointing', hint: 'Space telescope and Saturn orbiter online: steer the sight anywhere on the sky with the stick and lock on', stage: 'free-ops' },
      { key: 'ui-signal-dialogue', label: 'Signals ready dismissal', hint: 'SSL-868: pointed space telescope with its live daily feed; dismiss the signal popup and leave and revisit the Base', stage: 'free-ops' },
      { key: 'ui-sky-dialogue', label: 'Sky dialogue', hint: 'Base with the control station and a launched space telescope that has no target this week: the sky asks you to point it', stage: 'free-ops' },
      { key: 'ui-research-passport', label: 'Research: This week tab', hint: 'SSL-849/SSL-886: Community research opens on the This week tab: seven stamp places, earned current part and past weeks', stage: 'free-ops' },
      { key: 'ui-research-passport-unconfirmed', label: 'This week: waiting to sync', hint: 'Local stamp fills the bar but does not grant an unconfirmed part', stage: 'free-ops' },
      { key: 'ui-research-passport-missed', label: 'This week: no contribution', hint: 'Shared goal reached; player must contribute before earning the weekly part', stage: 'free-ops' },
      { key: 'ui-research-passport-empty', label: 'This week: open page', hint: 'No stamps yet; shared weekly progress below the goal', stage: 'free-ops' },
      { key: 'ui-community-research', label: 'Community research', hint: 'Community research: the Week, Step, Rewards and Votes tabs, the live event and the weekly path. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
      { key: 'constellation-hub', label: 'Constellation Base', hint: 'Base after a completed mission, with the authored sky constellations visible', stage: 'free-ops' },
      { key: 'hub-pad-l2', label: 'Base: launchpad level 2', hint: 'Launchpad upgraded once: taller tower, five arms, flame trench (SSL-693)', stage: 'free-ops' },
      { key: 'hub-telescope-upgrades', label: 'Ground telescope upgrades', hint: 'SSL-855: owned unplaced telescope, 3 U iron for levels 2 and 3; open Build in Menu', stage: 'free-ops' },
      { key: 'ui-surface-silo', label: 'Surface Silo contents', hint: 'Full contents page with mixed ore, overflow and Exchange access', stage: 'free-ops' },
      { key: 'hub-pad-l3', label: 'Base: launchpad level 3', hint: 'Launchpad fully upgraded: catch arms, landing legs, recovery loop (SSL-693)', stage: 'free-ops' },
      { key: 'hub-pad-worn', label: 'Base: launchpad needs service', hint: 'Level 1 pad after 10 launches: tap it to service for F1M, or launches stay held (SSL-693)', stage: 'free-ops' },
      { key: 'hub-first-run', label: 'Base: first run', hint: 'Only the launchpad is built: the line-art Agency building stands where the Data hub will go (SSL-785)', stage: 'free-ops' },
      { key: 'hub-biome-mountains', label: 'Base: steppe', hint: 'Base location fixture: Baikonur steppe', stage: 'free-ops' },
      { key: 'hub-biome-desert', label: 'Base: desert', hint: 'Base location fixture: desert terrain', stage: 'free-ops' },
      { key: 'hub-biome-tundra', label: 'Base: tundra', hint: 'Base location fixture: tundra terrain', stage: 'free-ops' },
      { key: 'hub-biome-coast', label: 'Base: coast', hint: 'Base location fixture: coast terrain', stage: 'free-ops' },
      { key: 'hub-orionids-complete', label: 'Base: Orionids complete', hint: 'Orionids badge earned: the top-right event chip is hidden on the Base', stage: 'free-ops' },
      { key: 'ui-mission-planner', label: 'Mission planner', hint: 'SSL-851: own destination, work and amount; save then normal Review and Launch', stage: 'free-ops' },
      { key: 'ui-mission-planner-survey', label: 'Planner: survey coverage', hint: 'A six-sector survey probe plan', stage: 'free-ops' },
      { key: 'ui-mission-planner-delivery', label: 'Planner: delivery', hint: 'Ore from Earth to Mercury; a vehicle is staged for this saved plan', stage: 'free-ops' },
      { key: 'ui-rocket-workshop', label: 'Rocket workshop', hint: 'SSL-850: weekly parts, livery and mission limits', stage: 'free-ops' },
      { key: 'ui-launchpad', label: 'Launchpad', hint: 'Launchpad with the contract board. Post-onboarding, Free Ops unlocked', stage: 'free-ops' },
    ],
  },
  {
    label: 'Gaps and checkpoints',
    color: '#91ccef',
    shots: [
      { key: 'ui-landing', label: 'Landing', hint: 'Touchdown scene on arrival at Eros, mid-mission', stage: 'tutorial' },
      { key: 'ui-landing-ascend', label: 'Landing: ascent', hint: 'Lift-off from Eros back to the orbiter, mid-mission', stage: 'tutorial' },
      { key: 'ui-rocket-buy', label: 'Rocket buy', hint: 'Rocket purchase list, post-onboarding with funds', stage: 'free-ops' },
      { key: 'ui-hangar-surveyor', label: 'Hangar: Surveyor', hint: 'Six missions done and funds in hand, so the tier 3 Surveyor is open in the hangar', stage: 'free-ops' },
      { key: 'cp-early', label: 'Checkpoint: early', hint: 'About 15 min in: 3 missions done, Free Ops unlocked, tier 2 parts', stage: 'free-ops' },
      { key: 'cp-mid', label: 'Checkpoint: mid', hint: 'About 35 min in: 8 missions done, silo and refinery built, tier 2 rocket', stage: 'free-ops' },
      { key: 'cp-late', label: 'Checkpoint: late', hint: 'About 55 min in: 20 missions done, tier 3 rocket, all buildings, rich stash', stage: 'free-ops' },
    ],
  },
]

/** Campaign-free starting points for the Scene Studio's sandbox: the `sandbox-*` cases of `fixture()` below. */
export const SANDBOX_FIXTURES = ['sandbox-hub', 'sandbox-transit'] as const

/**
 * A stage fixture by name. `sandbox:<fixture>[:<setup>]` is the same fixture with its campaign context removed and a
 * scene script's setup layered on (lib/sandbox.ts). The `sandbox-*` fixtures below are the campaign-free starting
 * points those scenes use: the shape a screen needs and nothing more.
 */
export function resolvePreset(name: string): Partial<GameState> | null {
  const preset = resolvePresetState(name)
  // Clear transient campaign UI even when a fixture omits the popup field.
  return preset ? { ...preset, popup: preset.popup ?? null } : null
}

function resolvePresetState(name: string): Partial<GameState> | null {
  if (isSandboxName(name)) return resolveSandbox(name, fixture)
  return fixture(name)
}

function instrumentHubFixture(researchStamps?: Player['researchStamps']): Partial<GameState> {
  return {
    screen: 'instrument-hub',
    player: {
      ...ASTEROID_DISCOVERY_PLAYER,
      transitSatelliteLaunchedAt: Date.now() - 86_400_000,
      transitSatelliteLevel: 1,
      deepSpaceTelescopeBuilt: true,
      saturnImagerLaunchedAt: Date.now() - 86_400_000,
      scanFollowUp: { targetId: 'mars', project: 'asteroid', at: Date.now() - 60_000 },
      // SSL-730: a few past classifications so Explored and All have dots on the sky map.
      tessClassifications: {
        'tic-261136679': { subjectId: 'tic-261136679', verdict: 'planet', ranges: [], submittedAt: Date.now() - 3 * 3_600_000 },
        'tic-150428135': { subjectId: 'tic-150428135', verdict: 'not_planet', ranges: [], submittedAt: Date.now() - 26 * 3_600_000 },
      },
      asteroidClassifications: {
        'neo-c4tq2a1': { candidateId: 'neo-c4tq2a1', verdict: 'likely_real', submittedAt: Date.now() - 5 * 3_600_000 },
        'neo-p21mxk0': { candidateId: 'neo-p21mxk0', verdict: 'likely_artifact', submittedAt: Date.now() - 50 * 3_600_000 },
      },
      // SSL-730: the community has launched ORI-1 (Orionids mission 2 open), one recording checked.
      orionidsEventStage: 2,
      radioMeteorClassifications: {
        '101234567': { subjectId: '101234567', workflowId: '29473', imageUrl: '', filename: 'RAD_BEDOUR_20261021_0215_BEECON_SYS001.png', imageWidth: 864, imageHeight: 595, boxes: [{ x: 120, y: 200, width: 30, height: 80 }, { x: 400, y: 180, width: 24, height: 60 }], submittedAt: Date.now() - 2 * 3_600_000 },
      },
      ...(researchStamps ? { researchStamps } : {}),
    },
    tutorial: false,
    doneSteps: TRAINING_DONE,
    missionId: null,
    targetId: null,
    rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
    lastCargo: null,
    popup: null,
  }
}

/** SSL-773: a probe at Eros for 26 hours (13 sectors mapped, 9 downloaded before, so 4 are new) and one just arrived at Vesta. */
function probeFixture(targetId = 'eros'): NonNullable<Player['probes']> {
  const body = TARGETS.find(target => target.id === targetId)!
  const launchedAt = Date.now() - 26 * 3_600_000
  const readings = Object.fromEntries(sectorIds().slice(0, 9).map(id => [id, { at: launchedAt + 20 * 3_600_000, marked: [], deposits: sectorDeposits(body, id) }]))
  return {
    [targetId]: { launchedAt, readings },
    ...(targetId === 'eros' ? { vesta: { launchedAt: Date.now() - 600_000, scanStartedAt: null, readings: {} } } : {}),
  }
}

/** SSL-831: checked radio recordings for the LEO-1 fixtures. */
function leonidRecordings(ids: string[], submittedAt: number): NonNullable<Player['radioMeteorClassifications']> {
  return Object.fromEntries(ids.map(id => [id, { subjectId: id, workflowId: '33017', imageUrl: '', filename: '', imageWidth: 949, imageHeight: 543, boxes: [], submittedAt }]))
}

function fixture(name: string): Partial<GameState> | null {
  switch (name) {
    // ── Sandbox starting points (SSL-641): no campaign, nothing built, nothing owed ──
    case 'sandbox-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 3, placed: [], placementPlots: {}, freeOperations: true },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'sandbox-transit': {
      // Outbound to Eros, an hour long, 20 minutes in. The scene's things move the destination, the ship and the progress.
      const transitStartedAt = Date.now() - 20 * 60_000
      return {
        screen: 'flight',
        player: {
          ...BASE_PLAYER, missionsDone: 3, freeOperations: true,
          activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, missionPhase: 'transit',
          transitStartedAt, arrivalAt: transitStartedAt + 60 * 60_000,
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }
    }

    // ── Mission 1 ──
    case 'm1-intro':
      return {
        screen: 'intro',
        player: { ...BASE_PLAYER, placed: [], placementPlots: {}, francs: STARTING_FRANCS },
        tutorial: true, doneSteps: {},
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 0 },
        tutorial: true, doneSteps: { 0: true },
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'hub-biome-mountains':
    case 'hub-biome-desert':
    case 'hub-biome-tundra':
    case 'hub-biome-coast': {
      const earthBiome = name.replace('hub-biome-', '') as Player['earthBiome']
      return {
        screen: 'hub',
        player: { ...POST_ONBOARDING_PLAYER, earthBiome, placed: ['launchpad', 'hangar'], placementPlots: { launchpad: 0, hangar: 1, market: 2 } },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }
    }

    case 'hub-pad-worn':
      return {
        screen: 'hub',
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad', 'hangar'], placementPlots: { launchpad: 0, hangar: 1, market: 2 }, padLaunches: 10 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'hub-unplaced':
      return {
        screen: 'hub',
        player: {
          ...POST_ONBOARDING_PLAYER,
          francs: 11_500_000_000,
          placed: ['launchpad', 'control-station', 'surface-silo', 'ground-telescope'],
          placementPlots: { launchpad: 0, market: 1, 'surface-silo': 2, 'control-station': 3 },
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'hub-telescope-upgrades': {
      const base = fixture('hub-unplaced')!
      return { ...base, player: { ...base.player!, stash: { iron: 3 }, groundTelescopeLevels: {}, groundTelescopeGrandfathered: false } }
    }

    case 'hub-pad-l2':
    case 'hub-buildings-l3': {
      const level = name === 'hub-buildings-l3' ? 3 : 2
      return {
        screen: 'hub',
        player: {
          ...POST_ONBOARDING_PLAYER,
          francs: 80_000_000,
          placed: ['launchpad', 'hangar', 'control-station'],
          placementPlots: { launchpad: 0, market: 1, hangar: 2, 'control-station': 3 },
          agencyLevels: { launch: level, exchange: level, 'rocket-discounts': level, 'data-hub': level },
        },
      }
    }
    case 'hub-pad-l3':
      return {
        screen: 'hub',
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad', 'hangar'], placementPlots: { launchpad: 0, hangar: 1, market: 2 }, agencyLevels: { launch: name === 'hub-pad-l3' ? 3 : 2 }, selectedStagedRocketId: 'pad-demo', stagedRockets: [{ id: 'pad-demo', rocketId: ROCKET_IDS.prospector, rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' }, location: 'launchpad', source: 'company', missionId: FIRST_MISSION.id, targetId: 'eros' }] },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'hub-first-run':
      return {
        screen: 'hub',
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad'], placementPlots: { launchpad: 0 } },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'hub-orionids-complete':
      return {
        screen: 'hub',
        player: {
          ...POST_ONBOARDING_PLAYER,
          placed: ['launchpad', 'hangar'], placementPlots: { launchpad: 0, hangar: 1, market: 2 },
          badges: { 'orionids-2026': { eventId: 'orionids-2026', tier: 'gold', earnedAt: 1 } },
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'constellation-hub':
      return {
        screen: 'hub',
        player: {
          ...BASE_PLAYER,
          missionsDone: 1,
          completedMissions: [{ id: FIRST_MISSION.id, title: FIRST_MISSION.title, targetId: 'eros', completedAt: 42, runId: 'constellation-fixture', kind: 'client' }],
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'm1-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 0 },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'solar-playtest': {
      const field = resolvePresetState('solar-site-mining')!
      return { ...field, screen: 'landing', visualFixture: 'solar-mining', player: { ...field.player!, missionPhase: 'landing', landingStartedAt: Date.now(), miningCargoInProgress: undefined } }
    }
    case 'solar-field-mining':
      return { ...resolvePresetState('solar-site-mining')!, visualFixture: 'solar-mining' }
    case 'solar-site-mining': {
      const plan: MissionPlan = { id: 'self-plan-fixture-mine', work: 'mine', targetId: 'mercury', mineral: 'iron', amount: 3, createdAt: 100, zone: 'east' }
      const target = TARGETS.find(body => body.id === plan.targetId)!
      const mission = missionFromPlan(plan, target, MINERAL_META)
      return { ...resolvePresetState('m1-mining')!, tutorial: false, doneSteps: TRAINING_DONE,
        missionId: plan.id, targetId: target.id,
        player: { ...POST_ONBOARDING_PLAYER, missionPlans: { [plan.id]: plan }, miningCargoInProgress: { iron: 1 }, miningLaserCharges: 12, activeMission: { id: plan.id, label: mission.title, mission, target } } }
    }
    case 'ui-mining-survey': {
      const base = resolvePresetState('m1-mining')!
      const plan = { id: 'self-plan-probe-field', targetId: 'eros', work: 'mine' as const, mineral: 'aluminium', amount: 1, createdAt: Date.now() }
      const body = TARGETS.find(target => target.id === 'eros')!
      const readings = Object.fromEntries(['0_0', '1_0'].map(id => [id, { at: Date.now(), deposits: sectorDeposits(body, id), marked: [] }]))
      return { ...base, tutorial: false, doneSteps: TRAINING_DONE, missionId: plan.id,
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad', 'control-station', 'surface-silo'], missionPlans: { [plan.id]: plan }, probes: { eros: { launchedAt: Date.now(), readings } }, activeMission: { id: plan.id, label: 'Mine aluminium at Eros' } } }
    }

    case 'm1-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'ui-flight-return': {
      const base = resolvePresetState('m1-return')!
      const now = Date.now()
      return { ...base, tutorial: false, player: { ...base.player!, missionsDone: 3, freeOperations: true, transitStartedAt: now - 2 * 60_000, arrivalAt: now + 10 * 60_000, rocketLivery: { hull: 'blue', trim: 'cream', decal: 'none', updatedAt: now } } }
    }

    case 'm1-return':
      return {
        screen: 'flight',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, returningToEarth: true, debriefPending: true, missionPhase: 'transit', transitStartedAt: Date.now(), arrivalAt: null },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: { ...FIRST_MISSION.requires.minerals, [FIRST_MINERAL]: (FIRST_MISSION.requires.minerals[FIRST_MINERAL] ?? 1) + 3, nickel: 2 }, popup: null,
      }

    case 'm1-home': {
      const haul = { ...FIRST_MISSION.requires.minerals, [FIRST_MINERAL]: (FIRST_MISSION.requires.minerals[FIRST_MINERAL] ?? 1) + 3, nickel: 2 }
      return {
        screen: 'debrief',
        player: {
          ...BASE_PLAYER, missionsDone: 0, stash: { ...haul, cobalt: 3 },
          placed: [...(BASE_PLAYER.placed ?? []), 'surface-silo'],
          activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, missionPhase: 'debrief', homeDeliveryPending: true,
        },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: haul, popup: null,
      }
    }

    case 'm1-debrief':
      return {
        screen: 'debrief',
        player: { ...BASE_PLAYER, missionsDone: 0, stash: { [FIRST_MINERAL]: FIRST_MISSION.requires.minerals[FIRST_MINERAL] ?? 1 } },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: FIRST_MISSION.requires.minerals, popup: null,
      }

    // ── Transport (guided mission 2: two-leg "mine then deliver" client pick) ──
    case 'transport-hub':
      return {
        screen: 'hub',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: EXTRACTION_DONE,
        missionId: null, targetId: null, deliveryTargetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'transport-fab':
      return {
        screen: 'fab',
        player: { ...BASE_PLAYER, missionsDone: 1, francs: BASE_PLAYER.francs - ROCKET_PRICES.prospector },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'transport-mining':
      return {
        screen: 'mining',
        player: { ...BASE_PLAYER, missionsDone: 1, activeMission: { id: TRANSPORT_MISSION.id, label: `${TRANSPORT_MISSION.title} → ${TRANSPORT_MISSION.targetId}` } },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true, 32: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'solar-site-delivery': {
      const plan: MissionPlan = { id: 'self-plan-fixture-solar', work: 'deliver', targetId: 'mercury', mineral: 'iron', amount: 3, createdAt: 100, zone: 'east' }
      const target = TARGETS.find(body => body.id === plan.targetId)!
      const mission = missionFromPlan(plan, target, MINERAL_META)
      return {
        screen: 'landing', tutorial: false, doneSteps: TRAINING_DONE,
        missionId: plan.id, targetId: target.id, deliveryTargetId: target.id,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: { iron: 3 }, popup: null,
        player: { ...POST_ONBOARDING_PLAYER, missionPlans: { [plan.id]: plan }, activeMission: { id: plan.id, label: mission.title, mission, target }, missionRunId: 'solar-site-fixture', missionPhase: 'landing', headingToDelivery: true, landingStartedAt: Date.now() },
      }
    }

    case 'transport-delivery-timed': {
      const delivery = fixture('transport-delivery')!
      return { ...delivery, tutorial: false, player: { ...POST_ONBOARDING_PLAYER, activeMission: delivery.player!.activeMission, deliveryUnloadStartedAt: Date.now() } }
    }

    case 'transport-delivery':
      return {
        screen: 'delivery',
        player: { ...BASE_PLAYER, missionsDone: 1, activeMission: { id: TRANSPORT_MISSION.id, label: `${TRANSPORT_MISSION.title} → ${TRANSPORT_MISSION.targetId}` } },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true, 32: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: { ...(TRANSPORT_MISSION.requires?.minerals ?? {}), ice: 3 }, popup: null,
      }

    case 'transport-debrief':
      return {
        screen: 'debrief',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: true, doneSteps: { ...EXTRACTION_DONE, 30: true, 31: true, 32: true },
        missionId: TRANSPORT_MISSION.id, targetId: TRANSPORT_MISSION.targetId ?? 'bennu', deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: TRANSPORT_MISSION.requires.minerals, popup: null,
      }

    // ── Storage Silo (last training step; placing it opens Free Ops) ──
    case 'telescope-hub':
      return {
        screen: 'hub',
        player: POST_ONBOARDING_PLAYER,
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'telescope-fab':
      return {
        screen: 'fab',
        player: POST_ONBOARDING_PLAYER,
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'telescope-transit':
      {
        const transitStartedAt = Date.now() - 30_000
      return {
        screen: 'flight',
        player: { ...POST_ONBOARDING_PLAYER, activeMission: { id: TRANSIT_TELESCOPE_MISSION_ID, label: 'Launch Space Telescope → Earth Orbit' }, transitStartedAt, arrivalAt: transitStartedAt + 90_000 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }
      }

    case 'telescope-debrief':
      return {
        screen: 'debrief',
        player: { ...POST_ONBOARDING_PLAYER, transitSatelliteLaunchedAt: Date.now(), transitSatelliteLevel: 1 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: TRANSIT_TELESCOPE_MISSION_ID, targetId: TRANSIT_TELESCOPE_TARGET_ID,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: {}, popup: null,
      }

    case 'ship-customizer':
      return {
        screen: 'hangar',
        player: {
          ...BASE_PLAYER,
          missionsDone: 1,
        },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: TRANSPORT_MISSION.id,
        targetId: TRANSPORT_MISSION.targetId ?? 'bennu',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-hangar-assembly':
      return {
        screen: 'hangar',
        player: {
          ...BASE_PLAYER,
          missionsDone: 1,
          pendingLaunch: true,
        },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: TRANSPORT_MISSION.id,
        targetId: TRANSPORT_MISSION.targetId,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    // ── Recently overhauled UI surfaces ──
    case 'ui-free-ops-fab':
      // Free Ops opens the launch route with no mission picked; it must hand over to the Mission Board.
      return { ...fixture('ui-mission-board'), screen: 'fab' }
    case 'ui-orionids-events-stage2':
      // Shower run done (event stage 2): the Orionids card opens mission 2 on ORI-1.
      { const board = fixture('ui-mission-board')!
      return { ...board, player: { ...board.player!, orionidsEventStage: 2, orionidsFragments: { caught: 25, redeemed: 0 } } } }
    case 'ui-orionids-ready':
      return {
        screen: 'missions',
        player: {
          ...POST_ONBOARDING_PLAYER,
          fireballSpotter: { readAt: 1, passedAt: 1 },
          orionidsEventStage: 0,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }
    case 'ui-timed-asteroid':
    case 'ui-timed-comet':
      return fixture('ui-mission-board')
    case 'ui-mission-board':
      return {
        screen: 'missions',
        player: {
          ...BASE_PLAYER,
          missionsDone: 2,
          placed: ['launchpad', 'surface-silo'],
          placementPlots: { launchpad: 0, 'surface-silo': 1 },
          freeOperations: true,
          clientMissions: { 'helios-propulsion-depot': 2, 'lumen-research': 1 },
          lastClient: 'helios-propulsion-depot',
        },
        tutorial: false,
        doneSteps: TRANSPORT_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-target-picker':
      return {
        screen: 'targets',
        player: { ...BASE_PLAYER, missionsDone: 1 },
        tutorial: false,
        doneSteps: EXTRACTION_DONE,
        missionId: TRANSPORT_MISSION.id,
        targetId: TRANSPORT_MISSION.targetId ?? 'bennu',
        deliveryTargetId: TRANSPORT_MISSION.deliveryTargetId ?? 'vesta',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-launch-review':
      // Launch review reached from the solar map: one rocket, the place, the work, the cargo. Agency mission (self-directed mining) at Mercury.
      return {
        screen: 'fab',
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad', 'hangar', 'control-station', 'surface-silo'], placementPlots: { launchpad: 0, market: 1, hangar: 2, 'control-station': 3, 'surface-silo': 4 } },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: SELF_DIRECTED_MINING_MISSION_ID,
        targetId: 'mercury',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-tess-training':
      return {
        screen: 'tess-discovery',
        player: {
          ...POST_ONBOARDING_PLAYER,
          flightPlan: { completed: { mining: true }, hidden: false },
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-tess-receipt': {
      const base = fixture('ui-tess-discovery')!
      const at = Date.now(), day = new Date(at).toISOString().slice(0, 10)
      return { ...base, player: { ...base.player!, researchFragments: 17, tessClassifications: { [VISUAL_TESS_CANDIDATE.id]: { subjectId: VISUAL_TESS_CANDIDATE.id, verdict: 'not_planet', ranges: [], submittedAt: at } }, researchStamps: { [day]: ['classification'] } } }
    }

    case 'ui-tess-discovery':
      return {
        screen: 'tess-discovery',
        visualFixture: 'tess',
        player: {
          ...POST_ONBOARDING_PLAYER,
          transitSatelliteLaunchedAt: Date.now() - 86_400_000,
          // Level 3 so the fixture shows three unlocked console finishes (Indigo, Ember, Aurora).
          transitSatelliteLevel: 3,
          researchAnnotations: 3,
          researchXP: 180,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-research-calendar-empty':
      return instrumentHubFixture({})

    case 'ui-research-calendar-month-half': {
      // Most days of this UTC month up to today, with a second kind on some, so streak, gaps and the dot all show.
      const today = new Date()
      const stamps: NonNullable<Player['researchStamps']> = {}
      for (let day = 1; day <= today.getUTCDate(); day += 1) {
        if (day % 3 === 0) continue
        const key = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day)).toISOString().slice(0, 10)
        stamps[key] = day % 4 === 0 ? ['classification', 'event'] : ['survey']
      }
      return instrumentHubFixture(stamps)
    }

    case 'ui-instrument-hub':
      return instrumentHubFixture()

    // SSL-773: survey probes. Two sectors of Eros were read yesterday; Vesta's probe has just arrived.
    // SSL-802: the first ground telescope stands on the West annex; the second slot is free.
    case 'ui-second-ground-telescope': {
      const hub = instrumentHubFixture()
      const p = hub.player!
      return { ...hub, player: { ...p, francs: 6_000_000, placed: [...p.placed, 'ground-telescope'], placementPlots: { ...p.placementPlots, 'ground-telescope': 10 }, groundTelescopeGrandfathered: false, scanFollowUp: null } }
    }

    // SSL-852: craft wear. Serviced 25 and 55 days ago, with a Kp 6.67 storm three days ago: the space telescope is
    // worn (half data) and the Saturn satellite has failed. Both offer a servicing mission.
    case 'ui-discovery-follow-up':
    case 'ui-discovery-follow-up-readings':
    case 'ui-agency-programme':
    case 'ui-agency-research': {
      const hub = instrumentHubFixture()
      const now = Date.now()
      const world = { id: 'exo-shared-852', name: 'Community transit candidate', type: 'exoplanet' as const, orbit: 5, difficulty: 'L2' as const, minerals: ['iron', 'silicon'], brief: 'Stage fixture for a community-verified transit world.' }
      return { ...hub, screen: name === 'ui-agency-research' ? 'community-research' : 'instrument-hub', player: {
        ...hub.player!,
        ...(name.startsWith('ui-discovery-follow-up') ? { francs: 150_000_000, agencyUnlocks: [...new Set([...(hub.player!.agencyUnlocks ?? []), 'data-hub' as const])] } : {}),
        ...(name === 'ui-discovery-follow-up-readings' ? { probes: { [world.id]: { launchedAt: now - 86400000, goalSectors: 6, readings: Object.fromEntries(['0_0', '1_0'].map(id => [id, { at: now, marked: [], deposits: sectorDeposits(world, id) }])) } } } : {}),
        placed: ['launchpad', 'control-station', 'surface-silo', 'ground-telescope'], placementPlots: { launchpad: 0, 'control-station': 1, 'surface-silo': 6, 'ground-telescope': 10 }, groundTelescopeLevels: { 'ground-telescope': 2 },
        transitSatelliteLaunchedAt: now - 86400000, saturnImagerLaunchedAt: now - 86400000,
        telescopeAim: { transit: { week: weekKey(now) }, 'deep-space': { week: weekKey(now) }, saturn: { week: weekKey(now) } },
        agencyLaunches: { 'fixture-1': { craft: 'space-telescope', at: now - 86400000 }, 'fixture-2': { craft: 'space-telescope', at: now - 3600000 } }, agencyDonations: { 'space-telescope': true },
        agencyCommunity: { projects: { 'exoplanet-hunters': { contributions: 42, donatedPerDay: 1 }, 'asteroid-discovery': { contributions: 18, donatedPerDay: 1 }, 'saturn-storms': { contributions: 7, donatedPerDay: 0 }, 'deposit-survey': { contributions: 6, donatedPerDay: 0 }, 'meteor-echoes': { contributions: 9, donatedPerDay: 0 } }, surveys: { eros: ['0_0', '1_0'], [world.id]: ['0_0', '1_0', '2_0', '3_0'] }, worlds: { [world.id]: world }, siteUnlocks: ['community-site-2026-10:observatory-instrument'] },
        stagedRockets: [{ id: 'qa-agency-vehicle', rocketId: 'explorer', location: 'launchpad', source: 'fabricated', rocket: rocketConfigForModel({ id: ROCKET_IDS.explorer }), missionId: '', targetId: '' }], selectedStagedRocketId: 'qa-agency-vehicle',
      } }
    }

    case 'ui-craft-service': {
      const hub = instrumentHubFixture()
      const day = 86_400_000
      const now = Date.now()
      const stormDay = new Date(now - 3 * day).toISOString().slice(0, 10)
      return {
        ...hub,
        player: {
          ...hub.player!,
          stagedRockets: [{ id: 'qa-service-vehicle', rocketId: 'explorer', location: 'launchpad', source: 'fabricated', rocket: rocketConfigForModel({ id: ROCKET_IDS.explorer }), missionId: '', targetId: '' }], selectedStagedRocketId: 'qa-service-vehicle',
          transitSatelliteLaunchedAt: now - 90 * day,
          saturnImagerLaunchedAt: now - 90 * day,
          craftServicedAt: { 'space-telescope': now - 25 * day, 'saturn-satellite': now - 55 * day },
          spaceStorms: { [stormDay]: 6.67 },
        },
      }
    }

    case 'ui-probe-hub': {
      const hub = instrumentHubFixture()
      return { ...hub, player: { ...hub.player!, probes: probeFixture() } }
    }

    case 'ui-probe-watch':
      return { screen: 'probe-watch', player: { ...POST_ONBOARDING_PLAYER }, tutorial: false, targetId: null, missionId: null, popup: null }

    case 'ui-probe-subsurface':
    case 'ui-probe-science': {
      const base = fixture('ui-probe-scan')!
      const at = Date.now() - 48 * 3_600_000
      const target = TARGETS.find(t => t.id === 'eros')!
      const readings = Object.fromEntries(sectorIds().slice(0, 2).map(id => [id, { at, marked: [], deposits: sectorDeposits(target, id) }]))
      return { ...base, player: { ...base.player!, probes: { eros: { launchedAt: at, goalSectors: 2, readings, ...(name === 'ui-probe-science' ? { subsurface: { 2: { startedAt: at, readings }, 3: { startedAt: at, readings } } } : {}) } } } }
    }

    case 'ui-probe-receipt':
      return fixture('ui-probe-scan')

    case 'ui-probe-mars':
    case 'ui-probe-europa':
    case 'ui-probe-scan':
      return {
        screen: 'probe-scan',
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad', 'control-station'], placementPlots: { launchpad: 0, 'control-station': 1 }, probes: probeFixture(name === 'ui-probe-scan' ? 'eros' : name.slice(9)) },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-probe-launch':
      return {
        screen: 'missions',
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad', 'control-station'], placementPlots: { launchpad: 0, 'control-station': 1 } },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-probe-debrief':
      return {
        screen: 'debrief',
        player: {
          ...POST_ONBOARDING_PLAYER,
          placed: ['launchpad', 'control-station'],
          placementPlots: { launchpad: 0, 'control-station': 1 },
          activeMission: { id: 'probe-launch-eros', label: 'Survey probe to Eros' },
          missionPhase: 'debrief',
          probes: { eros: { launchedAt: Date.now(), scanStartedAt: null, readings: {} } },
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: 'probe-launch-eros',
        targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: {},
        popup: null,
      }

    case 'ui-saturn-storm-search':
      return {
        screen: 'saturn-storm-search',
        player: {
          ...ASTEROID_DISCOVERY_PLAYER,
          transitSatelliteLaunchedAt: Date.now() - 86_400_000,
          transitSatelliteLevel: 1,
          deepSpaceTelescopeBuilt: true,
          saturnImagerLaunchedAt: Date.now() - 86_400_000,
          telescopeAim: { saturn: { week: weekKey(Date.now()), sector: 'band' } },
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-radio-meteors':
    case 'ui-radio-meteors-last':
      // SSL-714: Orionids mission 2 on ORI-1. The "last" fixture has two recordings already checked.
      return {
        screen: 'radio-meteors',
        player: {
          ...POST_ONBOARDING_PLAYER,
          orionidsEventStage: 2,
          orionidsFragments: { caught: 25, redeemed: 0 },
          radioMeteorClassifications: name === 'ui-radio-meteors-last' ? Object.fromEntries(['fixture-a', 'fixture-b'].map(id => [id, {
            subjectId: id, workflowId: '33017', imageUrl: '', filename: '', imageWidth: 949, imageHeight: 543, boxes: [], submittedAt: Date.UTC(2026, 9, 29),
          }])) : undefined,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-asteroid-discovery':
      return {
        screen: 'asteroid-discovery',
        visualFixture: 'asteroid',
        player: ASTEROID_DISCOVERY_PLAYER,
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    // SSL-651: the Orionids shower run with its order filled. 25 caught in all, 5 before this run was accepted.
    case 'ui-orionids-shower-mining':
    case 'ui-orionids-shower-mining-fresh':
    case 'ui-orionids-shower-debrief': {
      const home = name === 'ui-orionids-shower-debrief'
      const haul = { orionid_debris: 19, iron: 2 }
      return {
        screen: home ? 'debrief' : 'mining',
        player: {
          ...POST_ONBOARDING_PLAYER,
          activeMission: { id: ORIONIDS_NIGHT_RUN_ID, label: 'Orionids shower run' },
          missionPhase: home ? 'debrief' : 'mining',
          orionidsFragments: { caught: name === 'ui-orionids-shower-mining-fresh' ? 5 : 25, redeemed: 0 },
          orionidsRunBaseline: 5,
          stash: home ? haul : {},
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: ORIONIDS_NIGHT_RUN_ID,
        targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: home ? haul : null,
        popup: null,
      }
    }

    // SSL-658: a Leonids run for a player with 40 Orionid catches. Only Leonid fragments count: 0 of 20 at accept.
    case 'ui-leonids-shower-mining-fresh': {
      const runId = showerRunMission('leonids-2026').id
      return {
        screen: 'mining',
        player: {
          ...POST_ONBOARDING_PLAYER,
          activeMission: { id: runId, label: 'Leonids shower run' },
          missionPhase: 'mining',
          orionidsFragments: { caught: 40, redeemed: 0 },
          orionidsRunBaseline: 40,
          showerFragments: { 'leonids-2026': { caught: 2, redeemed: 0 } },
          showerRunBaselines: { 'leonids-2026': 2 },
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: runId,
        targetId: showerRunMission('leonids-2026').targetId,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }
    }

    // SSL-831: the Leonids event set. The run comes home with 20 caught since accept (22 in the ledger).
    case 'ui-leonids-shower-debrief': {
      const runId = showerRunMission('leonids-2026').id
      const haul = { leonid_debris: 20, iron: 2 }
      return {
        screen: 'debrief',
        player: {
          ...POST_ONBOARDING_PLAYER,
          fireballSpotter: { readAt: 1, passedAt: 1 },
          activeMission: { id: runId, label: 'Leonids shower run' },
          missionPhase: 'debrief',
          showerFragments: { 'leonids-2026': { caught: 22, redeemed: 0 } },
          showerRunBaselines: { 'leonids-2026': 2 },
          stash: haul,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: runId,
        targetId: showerRunMission('leonids-2026').targetId,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: haul,
        popup: null,
      }
    }

    case 'ui-clients-surplus':
      return {
        screen: 'missions',
        popup: null,
        player: {
          ...POST_ONBOARDING_PLAYER,
          clientMissions: { 'helios-propulsion-depot': 10, 'lumen-research': 1 },
          stash: { platinum: 14, nickel: 6, iron: 20 },
        },
      }
    case 'ui-events-specials-gold':
    case 'ui-events-specials-silver': {
      const gold = name === 'ui-events-specials-gold'
      const earned = Date.parse('2026-10-22T03:00:00Z')
      return {
        screen: 'missions',
        popup: null,
        player: {
          ...POST_ONBOARDING_PLAYER,
          fireballSpotter: { readAt: 1, passedAt: 1 },
          orionidsEventStage: 3,
          badges: gold
            ? { 'orionids-2026': { eventId: 'orionids-2026', tier: 'gold', earnedAt: earned }, 'leonids-2026': { eventId: 'leonids-2026', tier: 'gold', earnedAt: Date.parse('2026-11-17T12:00:00Z') } }
            : { 'orionids-2026': { eventId: 'orionids-2026', tier: 'silver', earnedAt: Date.parse('2026-11-09T12:00:00Z') } },
          ...(gold ? {
            meteoriteMastery: 1,
            showerChains: { 'leonids-2026': { stage: 2, at: Date.parse('2026-11-17T12:00:00Z') } },
            orionidsFinds: { 'tic-1': { subjectId: 'tic-1', targetId: null, name: 'TIC 1', tier: 'gold' as const, earnedAt: earned, marker: 'orionids-found' as const, voucher: 'owned' as const } },
          } : {}),
        },
      }
    }
    case 'ui-leonids-events':
    case 'ui-leonids-events-leo1': {
      const runAt = Date.now() - 3_600_000
      const leo1 = name === 'ui-leonids-events-leo1'
      return {
        screen: 'missions',
        player: {
          ...POST_ONBOARDING_PLAYER,
          fireballSpotter: { readAt: 1, passedAt: 1 },
          orionidsEventStage: 3,
          ...(leo1 ? {
            showerChains: { 'leonids-2026': { stage: 1, at: runAt } },
            showerFragments: { 'leonids-2026': { caught: 20, redeemed: 0 } },
            showerRunBaselines: { 'leonids-2026': 20 },
            radioMeteorClassifications: leonidRecordings(['leo-a'], runAt + 60_000),
          } : {}),
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }
    }

    case 'ui-radio-receipt-pending':
      return fixture('ui-radio-receipt')

    case 'ui-radio-receipt': {
      const base = fixture('ui-radio-meteors-leo1')!
      const at = Date.now(), day = new Date(at).toISOString().slice(0, 10)
      const result = { subjectId: 'receipt-radio-883', eventId: 'leonids-2026', workflowId: '33017', imageUrl: '', filename: 'Saved LEO-1 recording', imageWidth: 949, imageHeight: 543, boxes: [], submittedAt: at }
      const p: Player = { ...base.player!, radioMeteorClassifications: { ...base.player!.radioMeteorClassifications, [result.subjectId]: result }, researchStamps: { [day]: ['classification', 'event'] } }
      return { ...base, player: completeChainRadio(p, getShowerChain('leonids-2026')!, at).player }
    }

    case 'ui-radio-meteors-leo1': {
      const runAt = Date.now() - 3_600_000
      return {
        screen: 'radio-meteors',
        player: {
          ...POST_ONBOARDING_PLAYER,
          orionidsEventStage: 3,
          showerChains: { 'leonids-2026': { stage: 1, at: runAt } },
          showerFragments: { 'leonids-2026': { caught: 20, redeemed: 0 } },
          // Two ORI-1 checks from October do not count toward LEO-1; two since the Leonids run do.
          radioMeteorClassifications: { ...leonidRecordings(['ori-a', 'ori-b'], Date.UTC(2026, 9, 29)), ...leonidRecordings(['leo-a', 'leo-b'], runAt + 60_000) },
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }
    }

    case 'loop-base':
      return {
        screen: 'hub',
        player: { ...POST_ONBOARDING_PLAYER, placed: [...STARTER_BASE_PLACED], placementPlots: { ...STARTER_BASE_PLOTS } },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'ui-free-mining-silo-full':
    case 'ui-free-mining':
      return {
        screen: 'mining',
        player: {
          ...POST_ONBOARDING_PLAYER,
          placed: [...POST_ONBOARDING_PLAYER.placed, 'surface-silo'],
          ...(name === 'ui-free-mining-silo-full' ? { stash: { iron: 24, cobalt: 10, nickel: 6 } } : {}),
          activeMission: { id: SELF_DIRECTED_MINING_MISSION_ID, label: 'Self-Directed Mining Run' },
          missionPhase: 'mining',
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: SELF_DIRECTED_MINING_MISSION_ID,
        targetId: 'itokawa',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-focus-run':
      return {
        screen: 'mining',
        player: {
          ...POST_ONBOARDING_PLAYER,
          placed: [...POST_ONBOARDING_PLAYER.placed, 'surface-silo'],
          stash: { aluminium: 6 },
          resourceFocus: { label: 'Mineral Vault', minerals: { aluminium: 15, copper: 8 } },
          activeMission: { id: RESOURCE_FOCUS_MISSION_ID, label: 'Materials for Mineral Vault' },
          missionPhase: 'mining',
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: RESOURCE_FOCUS_MISSION_ID,
        targetId: 'itokawa',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-surface-silo':
      return {
        screen: 'surface-silo',
        player: { ...POST_ONBOARDING_PLAYER, placed: ['launchpad', 'surface-silo'], stash: { iron: 18, aluminium: 9, silicon: 8, nickel: 6, carbon: 3, leonid_debris: 1 } },
        tutorial: false, doneSteps: TRAINING_DONE, missionId: null, targetId: null, lastCargo: null, popup: null,
      }

    case 'ui-mission-log':
      return {
        screen: 'mission-history',
        // SSL-751/781: modern entries alongside imported discoveries.
        player: { ...POST_ONBOARDING_PLAYER, legacyProgressImported: true,
          legacyDiscoveredBodies: { 'legacy-anomaly-42': { anomalyId: 42, rover: true }, 'legacy-anomaly-81': { anomalyId: 81, rover: false } }, completedMissions: [
          { id: FIRST_MISSION.id, title: FIRST_MISSION.title, targetId: 'eros', targetName: '433 Eros', clientName: 'Helios Propulsion Depot', completedAt: Date.UTC(2026, 9, 30), runId: 'log-fixture-1', kind: 'client' },
          { id: 'dcp-log-fixture', title: 'Palladium starter contract', targetId: 'bennu', targetName: '101955 Bennu', clientName: 'Helios-Propulsion-Depot', completedAt: Date.UTC(2026, 10, 1), runId: 'log-fixture-2', kind: 'client' },
        ] },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-ledger':
      return {
        screen: 'narrative-ledger',
        player: { ...POST_ONBOARDING_PLAYER, },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-research-passport':
    case 'ui-research-passport-unconfirmed':
    case 'ui-research-passport-missed':
    case 'ui-research-passport-empty': {
      const now = Date.now()
      const week = weekKey(now)
      const start = Date.parse(`${week}T00:00:00Z`)
      const today = new Date(now).toISOString().slice(0, 10)
      const day = (offset: number) => new Date(start + offset * 86_400_000).toISOString().slice(0, 10)
      const stamps = name === 'ui-research-passport' ? { [week]: ['survey', 'classification'], ...(day(1) <= today ? { [day(1)]: ['gift'] } : {}), [today]: ['review'], [day(-4)]: ['event'] } : name === 'ui-research-passport-unconfirmed' ? { [today]: ['classification'] } : {}
      return {
        ...fixture('ui-community-research')!,
        player: { ...POST_ONBOARDING_PLAYER, researchStamps: stamps as Player['researchStamps'],
          researchFirstStamps: name === 'ui-research-passport' ? { [week]: { kind: 'survey', at: start + 3_600_000 } } : {} },
      }
    }
    case 'ui-community-research':
      return {
        screen: 'community-research',
        player: {
          ...POST_ONBOARDING_PLAYER,
          // Existing-save acceptance fixture: the Orionids run has already
          // stamped today's event contribution for the community history view.
          researchStamps: { [new Date().toISOString().slice(0, 10)]: ['event'] },
          // Two telescopes online, so choosing the week's path asks where to point them.
          transitSatelliteLaunchedAt: Date.now() - 86_400_000,
          transitSatelliteLevel: 1,
          saturnImagerLaunchedAt: Date.now() - 86_400_000,
        },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-sky-pointing':
      return {
        screen: 'sky-pointing',
        popup: null,
        player: {
          ...POST_ONBOARDING_PLAYER, transitSatelliteLaunchedAt: Date.now() - 86_400_000, transitSatelliteLevel: 1, saturnImagerLaunchedAt: Date.now() - 86_400_000,
          // SSL-830: a few weeks of mapping, so the chart and the whole-sky overview show progress.
          skyMap: Object.fromEntries(['18_8', '20_8', '19_7', '17_9', '5_6', '6_6', '12_3', '0_10'].map((id, i) => [id, { week: `2026-W${40 + i}`, instrument: i % 3 === 2 ? 'deep-space' as const : 'transit' as const }])),
        },
      }

    case 'ui-signal-dialogue': {
      const base = fixture('ui-sky-dialogue')!
      return { ...base, player: { ...base.player!, telescopeAim: { transit: { week: weekKey(Date.now()), sector: 'band' }, 'deep-space': { week: weekKey(Date.now()), sector: 'band' }, saturn: { week: weekKey(Date.now()), sector: 'band' } } } }
    }

    case 'ui-sky-dialogue': {
      const base = fixture('cp-late') as GameState
      return {
        ...base,
        screen: 'hub',
        player: {
          ...base.player,
          placed: ['launchpad', 'hangar', 'control-station'],
          placementPlots: { launchpad: 0, market: 1, hangar: 2, 'control-station': 3 },
          freeOperations: true,
          transitSatelliteLaunchedAt: Date.now() - 86_400_000,
          transitSatelliteLevel: 1,
          telescopeAim: undefined,
        },
      }
    }

    case 'ui-community-research-event-after': {
      const checkedAt = Date.now()
      const runAt = checkedAt - 5 * 86_400_000
      return {
        ...fixture('ui-community-research')!,
        player: {
          ...POST_ONBOARDING_PLAYER,
          researchPath: { week: weekKey(checkedAt), path: 'explorer', pointing: 'transit' },
          researchStamps: {},
          showerChains: { 'leonids-2026': { stage: 2, at: runAt } },
          showerFragments: { 'leonids-2026': { caught: 20, redeemed: 0 } },
          badges: { 'leonids-2026': { eventId: 'leonids-2026', tier: 'gold', earnedAt: runAt } },
        },
      }
    }
    case 'ui-community-research-site':
    case 'ui-community-research-event-before':
    case 'ui-community-research-leonids':
    case 'ui-community-research-geminids': {
      // SSL-774: a declared shower with no saved stage yet. Same screen, its own event step.
      const checkedAt = Date.now()
      return {
        ...fixture('ui-community-research')!,
        player: {
          ...POST_ONBOARDING_PLAYER,
          researchPath: { week: weekKey(checkedAt), path: 'explorer', pointing: 'transit' },
          researchStamps: {},
        },
      }
    }

    case 'ui-community-research-leonids-leo1': {
      const checkedAt = Date.now()
      const runAt = checkedAt - 3_600_000
      return {
        ...fixture('ui-community-research')!,
        player: {
          ...POST_ONBOARDING_PLAYER,
          researchPath: { week: weekKey(checkedAt), path: 'explorer', pointing: 'transit' },
          researchStamps: { [new Date(checkedAt).toISOString().slice(0, 10)]: ['classification', 'event'] },
          showerChains: { 'leonids-2026': { stage: 1, at: runAt } },
          showerFragments: { 'leonids-2026': { caught: 20, redeemed: 0 } },
          radioMeteorClassifications: leonidRecordings(['leo-a'], runAt + 60_000),
        },
      }
    }

    case 'ui-community-research-orionids': {
      // SSL-714: the Orionids chain inside Community research.
      const today = new Date().toISOString().slice(0, 10)
      const checkedAt = Date.now()
      return {
        ...fixture('ui-community-research')!,
        player: {
          ...POST_ONBOARDING_PLAYER,
          researchPath: { week: weekKey(checkedAt), path: 'explorer', pointing: 'transit' },
          researchStamps: { [today]: ['classification', 'event'] },
          orionidsEventStage: 2,
          orionidsFragments: { caught: 25, redeemed: 0 },
          radioMeteorClassifications: Object.fromEntries(['fixture-a', 'fixture-b'].map(id => [id, {
            subjectId: id, workflowId: '33017', imageUrl: '', filename: '', imageWidth: 949, imageHeight: 543, boxes: [], submittedAt: checkedAt,
          }])),
        },
      }
    }

    case 'ui-mission-planner':
    case 'ui-mission-planner-survey':
    case 'ui-mission-planner-delivery': {
      const work = name.endsWith('delivery') ? 'deliver' as const : name.endsWith('survey') ? 'survey' as const : 'mine' as const
      const plan = { id: `self-plan-fixture-${work}`, work, targetId: work === 'deliver' ? 'mercury' : 'eros', mineral: work === 'deliver' ? 'iron' : 'nickel', amount: work === 'survey' ? 6 : 3, createdAt: Date.now() }
      const rocket = { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' }
      return {
        screen: 'mission-planner', missionId: plan.id, targetId: plan.targetId, rocket,
        player: { ...POST_ONBOARDING_PLAYER, francs: 150_000_000, stash: { iron: 12, nickel: 6 }, placed: [...POST_ONBOARDING_PLAYER.placed, 'control-station'], missionPlans: { [plan.id]: plan },
          ...(work === 'mine' ? { probes: { eros: { launchedAt: Date.now() - 12 * 3_600_000, readings: Object.fromEntries(['0_0', '1_0'].map(id => [id, { at: Date.now(), marked: [], deposits: sectorDeposits(TARGETS.find(target => target.id === 'eros')!, id) }])) } } } : {}),
          ...(work === 'deliver' ? { pendingLaunch: true, selectedStagedRocketId: 'planner-fixture-rocket', stagedRockets: [{ id: 'planner-fixture-rocket', rocketId: ROCKET_IDS.explorer, rocket, location: 'launchpad' as const, source: 'company' as const, missionId: plan.id, targetId: plan.targetId }] } : {}) },
        tutorial: false, doneSteps: TRAINING_DONE, lastCargo: null, popup: null,
      }
    }
    case 'ui-rocket-workshop':
      return {
        screen: 'rocket-workshop',
        player: { ...POST_ONBOARDING_PLAYER, francs: 12_000_000, missionsDone: 2,
          researchPath: { week: '2026-11-16', path: 'explorer', claimedSteps: [2, 4, 5] },
          researchRocketParts: ['storage-silo-t2', 'fusion-thruster-t2', 'ringed-laser-t3'],
          dailyClientPool: { date: new Date().toISOString().slice(0, 10), missions: [WORKSHOP_MISSION], acceptedId: null, completedIds: [] },
          shipCustomizerParts: {} },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: WORKSHOP_MISSION.id, targetId: WORKSHOP_MISSION.targetId,
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }
    case 'ui-launchpad':
      return {
        screen: 'launchpad',
        player: { ...POST_ONBOARDING_PLAYER, },
        tutorial: false,
        doneSteps: TRAINING_DONE,
        missionId: null,
        targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null,
        popup: null,
      }

    case 'ui-landing-ascend':
      return {
        screen: 'landing',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, missionPhase: 'landing', landingStartedAt: Date.now() - 60_000, landingReturnStartedAt: Date.now() },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'ui-landing':
      return {
        screen: 'landing',
        player: { ...BASE_PLAYER, missionsDone: 0, activeMission: { id: FIRST_MISSION.id, label: `${FIRST_MISSION.title} → Eros` }, missionPhase: 'landing', landingStartedAt: Date.now() },
        tutorial: true, doneSteps: { 0: true, 1: true, 2: true, 3: true, 4: true },
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
        lastCargo: null, popup: null,
      }

    case 'ui-hangar-surveyor':
      return {
        screen: 'hangar',
        player: { ...POST_ONBOARDING_PLAYER, missionsDone: 6, francs: 1_000_000_000 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'ui-rocket-buy':
      return {
        screen: 'rocket-buy',
        player: { ...POST_ONBOARDING_PLAYER, francs: 1_000_000_000 },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: FIRST_MISSION.id, targetId: 'eros',
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'cp-early':
      return {
        screen: 'hub',
        player: { ...POST_ONBOARDING_PLAYER, francs: 40_000_000, stash: { iron: 10 } },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'cp-mid':
      return {
        screen: 'hub',
        player: {
          ...POST_ONBOARDING_PLAYER,
          clientMissions: { 'helios-propulsion-depot': 10, 'arcturus-battery-systems': 10 },
          missionsDone: 8, francs: 120_000_000,
          placed: ['launchpad', 'transit-telescope', 'surface-silo'],
          placementPlots: { launchpad: 0, 'transit-telescope': 1, 'surface-silo': 2 },
                  stash: { iron: 40, nickel: 20, silicates: 15, copper: 8 },
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk2', propulsion: 'fusion-b2', drill: 'laser-t2' },
        lastCargo: null, popup: null,
      }

    case 'cp-late':
      return {
        screen: 'hub',
        player: {
          ...ASTEROID_DISCOVERY_PLAYER,
          missionsDone: 20, francs: 600_000_000,
          placed: ['launchpad', 'transit-telescope', 'deep-space-telescope', 'surface-silo'],
          placementPlots: { launchpad: 0, 'transit-telescope': 1, 'deep-space-telescope': 2, 'surface-silo': 3, market: 4 },
                  clientMissions: { 'helios-propulsion-depot': 14, 'arcturus-battery-systems': 12 },
          stash: { iron: 120, nickel: 60, silicates: 40, copper: 30, gold: 6 },
        },
        tutorial: false, doneSteps: TRAINING_DONE,
        missionId: null, targetId: null,
        rocket: { chassis: 'hull-mk3', propulsion: 'ion-a3', drill: 'plasma-t3' },
        lastCargo: null, popup: null,
      }

    default:
      return null
  }
}
