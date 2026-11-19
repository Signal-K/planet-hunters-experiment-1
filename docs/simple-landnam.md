# Simple Landnam: investigation (SSL-864)

2026-11-19. Started from Hugo's feedback on Haphazard Martians (HM): "anyone can play it,
anyone can jump into it, it's fast, it's clear what to do." Hugo last played Landnam in
October; Landnam has added a lot since (probes, data hub, upgrades, telescopes, community
site, votes), so a newcomer today faces more than he did.

This is an investigation, not a decision. Nothing in the game has changed yet.

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
5. **Account first.** Landnam needs sign-in before play (product rule). HM can be played
   right away; sign-in is optional and progress stays in the browser.
6. **Evidence is thin but matches.** PostHog, last 30 days: 7 players started the
   tutorial, 4 saw the contract screen, 3 launched, 3 reached mining, 2 reached a debrief.

## What HM does that we can borrow

- **A numbered route.** The expedition is "Mission 1 → 2 → 3" with one budget and one
  briefing. The player always knows which step they are on and what is next.
- **One currency, small numbers.** "12 credits", not ₣9.0M.
- **Failure is cheap and explained.** A crash costs the rover, a fast finish earns +2. Rules
  fit on one panel.
- **Every screen has one primary button.** Start Mission 2. Continue. Retry.
- **Play first, account later.**

## Proposal: Story mode

A short, numbered chapter route that is the default for new players, built entirely from
scenes that already exist. The full agency (contract tabs, clients, probes, data hub, votes,
upgrades) opens when the story is finished, or straight away from Menu > "Full agency".

| Chapter | Player does | Existing scenes | Teaches |
| --- | --- | --- | --- |
| 1. First light | Launch, mine iron on the Moon, come home | launch sequence, transit, mining, debrief | Fly and FIRE |
| 2. First sale | Sell the haul at the Exchange | Exchange, debrief | Francs |
| 3. First client | One client contract (one, not nine) | mission board (single card), mining | Contracts |
| 4. Eyes on the sky | Point a telescope and classify once | sky pointing, simple TESS console | Citizen science |
| 5. Shower | The live sky event run (Leonids now) | shower mining | Events |
| 6. Settle | Store a haul in a silo and settle the place | silo, settlement | The release-bar goal |

Rules for story mode:

- **One NEXT button.** The Base shows francs, the next chapter's button and Menu, and
  nothing else (the same trick as build mode hiding the HUD). The button names the chapter:
  "CHAPTER 1 · FIRST LIGHT".
- **No decisions before the first run.** Landscape defaults to Steppe (still movable later),
  the launchpad is already placed, the rocket and destination are picked for the player
  (already the rule: the cheapest rocket that fits).
- **Short transit.** 5 s in story mode, or tap to skip.
- **A one-panel briefing per chapter.** The goal, the reward and what happens if it goes
  wrong, HM style. Then one START button.
- **A chapter strip.** "Chapter 2 of 6" with dots, like HM's route, shown on the briefing
  and the debrief.
- **Small numbers in copy.** Show ₣9M, not ₣9.0M, and keep body names to familiar ones
  (Moon, Mars, an asteroid) until chapter 3.

Engineering shape (to confirm before building): a `storyChapter` on the player, a chapter
table in `shared/authoring/` (one entry per chapter: preset, mission, briefing copy,
unlock), a `simpleHud` flag read by the Base and the dock, each chapter registered in
`qa/scenes.json` with a stage preset, and iOS mirrored in `SceneCatalog`. No new mechanics.

## Clashes with current rules (need Liam)

- **"No account-free play"** (product.md). HM's "anyone can jump in" depends on playing
  before sign-in. Chapter 1 without an account would break that rule.
- **Cycle 11 is "release, watch, fix blockers only"** (release plan). Story mode is new
  work. It could count as the onboarding fix the release bar asks for ("sign-up to first
  haul, sale and settlement unaided"), since its chapters are that bar.
- **"The dock is ‹ › Build and Menu"** and the Base's current controls would be hidden
  during the story.
- **"Separate small games"**: is simple Landnam a mode inside Landnam, or its own small
  app on the same world?

## Suggested first slice

Chapter 1 only, behind a stage preset (`story-ch1`): no landscape picker, launchpad
pre-placed, a simple Base with one "CHAPTER 1 · FIRST LIGHT" button, one briefing panel,
a 5 s transit, the existing mining run, and a debrief that shows "Chapter 1 of 6 done" and
"CHAPTER 2". Then hand it to Hugo and time him from first tap to first FIRE (today it is
about 8 taps and over a minute).
