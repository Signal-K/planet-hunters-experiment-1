# Simple Landnam: investigation (SSL-864)

2026-11-19. Started from Hugo's feedback on Haphazard Martians (HM): "anyone can play it,
anyone can jump into it, it's fast, it's clear what to do." Hugo last played Landnam in
October; Landnam has added a lot since (probes, data hub, upgrades, telescopes, community
site, votes), so a newcomer today faces more than he did.

**Decided 2026-11-19 (Liam):** the simple version is **Landnam Minimal**, a separate project
kept in this repo as its own module (`minimal/`) and served at **playlandnam.space/minimal**. It is a standalone game with
Landnam's mechanics, research, narrative and missions. "Anyone can play" means no context
needed; sign-in is still required. See the decision note in `notes/decisions/` and
"How Minimal is built" below. The findings that follow are why.

## What a new player does today (played by hand, phone 390x844, `m1-intro` stage)

| # | Screen | What it asks | Decision before playing? |
| --- | --- | --- | --- |
| 1 | Intro | Choose a landscape: Steppe, Desert, Tundra, Coast | Yes |
| 2 | Build mode | "+ PLACE LAUNCHPAD", then DONE | Yes (placement) |
| 3 | Base | Clock, ₣9.0M, LEONIDS ACTIVE, two buildings, ‹ ›, "Go below the base", Earth, Missions, Menu. No cue to what is next | Where do I tap? |
| 4 | Mission board | 5 icon tabs, Log, ₣, ?, 5 client tabs, contract 1 of 9: "Atlas Aggregate · L1 · Belt Courier Run: iron and carbon from Bennu, dropped at their Vesta depot" | Yes (which of 9) |
| 5 | Plan | Destination, vehicle, Customize, Change mission, Launch | Yes (or accept defaults) |
| 6 | Transit | 18 s flight, BOOST | Wait |
| 7 | Mining | Goal, d-pad, FIRE. About one minute | **First real play** |

About 8 taps, 4 decisions and 18 s of waiting before the first fun action. In HM it is
Menu, Start, then build and drive.

Screens: `.scene-shots/001` (intro), `006` (Base), `008` (mission board), `015` (mining).

## What is already simple

The mining run is already HM-grade: one goal stated once, d-pad bottom-left, one round
FIRE, a dashed aim line, about a minute, nothing across the top. The same goes for the
debrief's "next step" choice and the simple classify console. **The core verbs are not the
problem; the shell around them is.**

## What makes it hard

1. **Decisions before play.** Landscape, placement, contract and rocket all come before
   the first run, and none of them mean anything to a new player yet.
2. **No single "do this next".** The Base offers about 9 controls and the mission board
   10 tabs. HM always has one obvious big button.
3. **Vocabulary.** Bennu, Vesta, Atlas Aggregate, L1, francs in millions, clients,
   affinity, stamps, Leonids, data hub, probes. HM has credits, parts and a finish line.
4. **Breadth.** 95 registered scenes and 52 standing product decisions. All of it can
   reach a new player in their first week.
5. **Evidence is thin but matches.** PostHog, last 30 days: 7 players started the
   tutorial, 4 saw the contract screen, 3 launched, 3 reached mining, 2 reached a debrief.

## What HM does that we can borrow

- **A numbered route.** The expedition is "Mission 1 → 2 → 3" with one budget and one
  briefing. The player always knows which step they are on and what is next.
- **One currency, small numbers.** "12 credits", not ₣9.0M.
- **Failure is cheap and explained.** A crash costs the rover, a fast finish earns +2. Rules
  fit on one panel.
- **Every screen has one primary button.** Start Mission 2. Continue. Retry.

## Proposal: Minimal is a story

Minimal is a short, numbered chapter route over Landnam's real missions. The full agency
(contract tabs, clients, probes, data hub, votes, upgrades) stays in Landnam; the last chapter
points there for players who want more.

| Chapter | Player does | Existing scenes | Teaches |
| --- | --- | --- | --- |
| 1. First light | Launch, mine iron on the Moon, come home | launch sequence, transit, mining, debrief | Fly and FIRE |
| 2. First sale | Sell the haul at the Exchange | Exchange, debrief | Francs |
| 3. First client | One client contract (one, not nine) | mission board (single card), mining | Contracts |
| 4. Eyes on the sky | Point a telescope and classify once | sky pointing, simple TESS console | Citizen science |
| 5. Shower | The live sky event run (Leonids now) | shower mining | Events |
| 6. Settle | Store a haul in a silo and settle the place | silo, settlement | The release-bar goal |

Rules for Minimal:

- **One NEXT button.** The Base shows francs, the next chapter's button and Menu, and
  nothing else (the same trick as build mode hiding the HUD). The button names the chapter:
  "CHAPTER 1 · FIRST LIGHT".
- **No decisions before the first run.** Landscape defaults to Steppe (still movable later),
  the launchpad is already placed, the rocket and destination are picked for the player
  (already the rule: the cheapest rocket that fits).
- **Short transit.** 5 s, or tap to skip.
- **A one-panel briefing per chapter.** The goal, the reward and what happens if it goes
  wrong, HM style. Then one START button.
- **A chapter strip.** "Chapter 2 of 6" with dots, like HM's route, shown on the briefing
  and the debrief.
- **Small numbers in copy.** Show ₣9M, not ₣9.0M, and keep body names to familiar ones
  (Moon, Mars, an asteroid) until chapter 3.

## How Minimal is built

`minimal/` is its own module in this repo: its own Vite + React app, entry point and build,
with no new repository and no submodule. It builds to `web/public/minimal/`, so Landnam's deploy
serves it at playlandnam.space/minimal, the way Haphazard Martians is served at /martians/.

| Piece | Where |
| --- | --- |
| App | `minimal/` (Vite + React + TypeScript, base `/minimal/`) |
| Build | `cd web && npm run build:minimal` → `web/public/minimal/` (runs before `next build`) |
| Dev | `cd web && npm run dev:minimal` → http://localhost:4330/minimal/ |
| Sign-in | Required: reads Landnam's shared `pocketbase_auth` on the same origin; no session sends the player to Landnam to sign in |
| Offline | Landnam's `public/sw.js` caches `/minimal/` (to add with the first playable slice) |

**Same mechanics, research, narrative, missions.** Minimal imports Landnam's sources
through a `@landnam` alias (`web/`) and `@shared` (`shared/`) instead of copying them: the
mission, target, mineral and economy data in `web/lib/data/`, the UI-free logic in `web/lib/`
(`mission-flow.ts`, `lib/mining/*`), and the tokens in `shared/tokens/`. React and the other
libraries come from `web/node_modules`, so there is one copy of each. A mission or rule changes
once, in Landnam, and Minimal picks it up on its next build.

The mining run (`web/components/game/screens/MiningCanvas.tsx`) is next: lift it into a
context-free component both games draw, so Minimal's chapter 1 is the real run.

## Every mission type, one chapter each (2026-11-19)

| Chapter | Landnam mission type | Built from | Run |
| --- | --- | --- | --- |
| 1 First light | Client contract | first sequence-1 client mission | Launch, mine, home |
| 2 First sale | Self-directed mining | `SELF_DIRECTED_MINING_MISSION_ID` | Launch, mine, home (sold at market) |
| 3 Courier | Delivery contract | first mission with `deliveryTargetId` | Launch, mine, deliver, home |
| 4 Eyes on the sky | Satellite launch | runtime catalog, space telescope | Launch, deploy, home |
| 5 Probe | Survey probe | runtime catalog, `probeMission` | Launch, deploy, home |
| 6 Shower | Meteor shower run | `showerRunMission` (Leonids) | Launch, catch fragments, home |
| 7 Stockpile | Materials haul | runtime catalog, resource focus | Launch, mine, home (stored) |
| 8 Build | Construction job | daily client pool, construct template | Launch, build, home (spends stored materials) |
| 9 Follow-up | Survey flight | runtime catalog, `exo-survey-*` | Launch, scan, home |

Mining is Landnam's `MiningScreen`, mounted whole. Payouts follow Landnam: contracts, deliveries,
builds and shower runs pay their stated payout; self-directed hauls sell at the open-market
price; a materials haul is stored; satellites, probes and survey flights give their outcome.
Storyboard of every screen: https://claude.ai/artifact/MqCkAyn9GUJagZKLSsQXVt

## Next steps

1. First playable slice: sign in → "CHAPTER 1 · FIRST LIGHT" → one briefing panel → 5 s
   transit → the real mining run → "Chapter 1 of 6 done".
2. Add `/minimal/` to Landnam's service worker cache and to the deploy build.
3. Time Hugo from first tap to first FIRE (in Landnam today it is about 8 taps and over a
   minute).
