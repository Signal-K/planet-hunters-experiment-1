# Mission setup: focal-operation direction

This brief is paired with [`mission-setup-reference-explorer.html`](./mission-setup-reference-explorer.html). It turns two references into a Landnam-specific mission-setup language; it is not a production specification or a request to copy either source.

## The direction in one sentence

Each setup step is a **single operation with a focal object**, a compact evidence rail, and one persistent next action.

The selected mission, target, vehicle, or launch route does the visual work. UI chrome exists only to prove the decision and let the player advance or go back.

## What to take from the references

| Reference | Take | Landnam translation | Do not take |
| --- | --- | --- | --- |
| Departure Mono | Dense but calm tabular scanning, monospace readouts, concise wayfinding | A small fixed-width telemetry rail, stage markers, short labels, useful empty space | Its font, box-drawing character artwork, or a terminal UI pasted over a game |
| *Out There: Omega Edition* | A scene/object carries the decision; muted chrome makes each choice feel consequential | One large mission object per step, sparse contextual choices, strong spatial pacing | Its imagery, screen layouts, narrative framing, resource economy, or visual assets |

Landnam keeps its own Oxanium display type, real-science voice, scene tokens, cyan command accent, and amber restriction. Amber belongs only to a small payout/cost readout—not a primary action or surface.

## Shared screen grammar

1. **Operation strip** — back affordance, four numbered stages, current state. It is quiet and always in the same place.
2. **Focal stage** — at least half of the available scene height; one interactive object is enlarged rather than surrounded by equal-weight cards.
3. **Evidence rail** — a narrow region with the minimum data needed to decide. It can become a collapsed drawer on a phone.
4. **Command dock** — stable bottom rail with status on the left and exactly one primary cyan action on the right. Cost/reward stays above or beside it, never becomes the button colour.

The unit of responsive design is not "card count". It is **what stays simultaneously visible**:

| Viewport | Always visible | Moves behind a disclosure |
| --- | --- | --- |
| Phone portrait | current focal object, selection name/state, next action | secondary telemetry and non-critical explanations |
| Desktop landscape | focal object, evidence rail, next action | longer contextual notes |
| Short landscape | focal object, current state, next action | all supporting detail; it becomes a compact inspect drawer |

## Four explored steps

### 1. Programme selection

The board becomes a small programme field rather than a feed of competing cards. Three mission signals share a single orbital/lit stage; choosing one elevates its route and facts in the evidence rail. This replaces broad visual competition with a single selected operation.

### 2. Target selection

The map is the product, not the background of a detail card. Reachable targets are the only high-contrast points; the selected target gets a clear label, route, compatibility state, and deposit preview. On phone, full mineral/capability detail is an inspect drawer so the map keeps meaningful height.

### 3. Vehicle confirmation

The rocket is a large technical object, with only three installable systems called out on the scene. Capacity, range, and drill tier form a compact evidence row. Price and projected return are reward/cost facts, visually secondary to readiness.

### 4. Launch preflight

The final screen has a physical launch composition: vehicle, route, target, and readiness sequence occupy one scene. A minimal checklist shows what blocks launch; the command dock has one cyan confirmation. There is no detached confirmation card floating over unused space.

## Current implementation touchpoints

| Concept | Production boundary | First implementation move |
| --- | --- | --- |
| Shared operation strip and command dock | `web/components/game/screens/MissionSetupShell.tsx`, `StepFooter.tsx`, `.mission-setup-actions` | Make stage state and a compact evidence slot part of the shell contract rather than screen-local bands |
| Programme field | `MissionBoardScreen.tsx`, `MissionBoardSection.tsx`, `MissionDetailPanel.tsx`, `MissionBoard.module.css` | Preserve mission data/state; reduce card parity and give the selected operation one focal stage |
| Target map and inspect drawer | `TargetPickerScreen.tsx`, `TargetPicker/GalaxyMap.tsx` | Keep map-first on narrow viewports; turn dense target details into a deliberate disclosure |
| Vehicle object and telemetry | `RocketPurchaseScreen.tsx`, `RocketCutaway.tsx` | Keep the cutaway dominant and limit readouts to purchase-relevant evidence |
| Preflight scene | `AssemblyScreen.tsx`, `.assembly-preflight-scene` | Bind vehicle/route/readiness into one composition and keep confirm action in the common dock |

## Guardrails for implementation

- Preserve all current mission, target eligibility, purchase, and launch behaviour.
- Keep component colour values token-based; never introduce a new palette through component-local hex values.
- Do not treat a mobile screen as a scaled desktop. Collapse evidence before shrinking the focal stage below usability.
- Maintain 8-point spacing and visible keyboard focus. Interactive map points need a text alternative and a selection label.
- Maintain operational dark surfaces with authored ambient colour. Avoid grey SaaS cards, white-glass identity, or a new light menu theme for this route.
- No proprietary font or artwork from either reference is included or required.

## Acceptance review

Use the explorer at 390×844, 1440×900, and 844×390. For each stage verify:

- Can the player name the selected object and next action at a glance?
- Does the focal object own more visual area than supporting chrome?
- Is the selection evidence clear without reading a long paragraph?
- Can the user back out or inspect supporting data without hiding the primary command?

