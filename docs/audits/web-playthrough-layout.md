# Web playthrough and layout audit

23 November 2026. Scope covers the web router, operation router, mission setup, authored scenes, shared frames, TakeOn hosts and developer fixtures. The companion JSON inventories action callback names and button counts in game, TakeOn, layout and route components. Callback names identify wiring to inspect, including optional and development controls. They are not a count of distinct player decisions.

## Findings

The route frame is present, but the game router supplies its content slot without populating its header or action slots. Individual scenes position their own headers, cards and actions. The frame therefore cannot reserve space for those controls. Mission Board adds two absolute header groups above an absolute three-panel workspace. Portrait and landscape overrides move these independently. Pinning Accept and the pager fixed their movement inside a panel, while leaving the header collision intact.

SceneChrome repeats this arrangement with absolute top, card and action groups and fixed portrait offsets. It requires migration as a unit. Simply changing route labels or reducing the number of enum values cannot change these layout behaviors.

## Five setups and complete screen assignment

| Setup | Existing screens | Decisions and actions |
| --- | --- | --- |
| Base | intro, hub, hub-subsurface, build, surface-silo | Choose biome, place/move buildings, excavate, construct rooms, upgrade/service infrastructure, manage storage, choose or resume an activity |
| Travel | launchpad, targets, rocket-buy, fab, flight, landing | Inspect origin/destination/payload and range, select an eligible destination, launch, switch/resume flights, boost, land, return |
| Surface | mining, delivery, probe-watch | Drive, steer/hover, scan, drill, choose deposits, manage cargo, build/demolish/rotate, deploy or observe field equipment, unload, depart |
| Board | missions, mission-planner, mission-history, narrative-ledger, community-research, market, refinery, hangar, rocket-workshop, debrief | Pick/filter offers, select client or body, set cargo goal, save a plan, inspect history, select research path, vote/contribute/claim, buy/sell/set alerts/refine/collect, review rocket, settle results |
| Instrument | instrument-hub, tess-discovery, asteroid-discovery, saturn-storm-search, radio-meteors, probe-scan, sky-pointing | Select owned instrument, aim, classify/annotate/submit, compare observations, download mapped sectors, plan follow-up mining or contracts |

Instrument is the fifth setup because the image/light-curve workspace needs persistent tools and a submit action. Keep classification mechanics visible in that workspace.

## Action placement

All setups need a content-sized header, a remaining-space main viewport, a content-sized action row and a separate modal layer. Back/Menu stays at the leading header edge. Context navigation follows it. Balance/help and secondary utilities follow at the trailing edge, wrapping into another measured row when necessary. Primary actions live in the action row. Pan/zoom, driving and classification tools stay attached to the visual workspace. Destructive abandonment, spending and irreversible submission retain explicit actions.

Use one details drawer for requirements, cargo manifests, fees, unlock explanations and history. Opening it must not relocate the main action. A disabled action names its unmet requirement and links to the relevant repair or upgrade.

## Playthrough decisions and step reductions

| Playthrough | Required decisions | Simplification |
| --- | --- | --- |
| Client extraction | Job, eligible destination when open, launch, extract, finish haul, keep/sell when applicable | Fixed-target jobs skip target selection. Equipment assignment is automatic. Requirements appear in launch review. |
| Two-body transport | Job, source/destination when open, launch, extract, depart, unload, return, settle | Show the full route before launch. Destination and delivery UI follow the actual drop-off body. Keep manual unloading where it is gameplay. |
| Construction | Contract/site, required materials, launch, build/unload, settlement | Material shortage links to procurement and returns to the same job. Keep client ownership distinct from agency assets. |
| Self-directed mining | Body, mineral, amount, launch, extract, cargo disposition | Start from the body's mapped deposits. Planner becomes a detail panel for the selected operation. Save-plan remains optional. |
| Survey probe | Body, coverage, launch, deployment, collect sectors, follow-up | Coverage and deployment review share the body's operation panel. Collect readings in the instrument workspace. |
| Telescope or satellite | Instrument/payload, orbital destination, launch, deploy, aim, classify | Earth-orbit deployment remains a flight. Exoplanet candidates remain observations. Aim and classify share instrument context. |
| Meteor shower | Event chain step, fly/collect, debrief, radio/field observation, redeem/combine | Events point at the same operation surfaces. The chain owns eligibility and completion, without a parallel scene layout. |
| Weekly research | Path, activity, contribution, review, reward | Week references existing operations and returns to the selected path. Preserve stamp, fragment and reward accounting. |
| Base expansion | Location/plot, blueprint, resources, construct/upgrade | In-world selection opens one construction drawer. Remove navigation through unrelated boards. |
| Trade/refinery | Commodity/recipe, amount, purchase/sale/queue, alert or collection | Use board detail and action slots. Keep money/material mutations explicit. |
| Results | Outcome, cargo settlement, follow-up | Show the change on the selected body/client. Offer next activity from the same result view. |

## Implementation status

Mission Board now uses the existing ScreenFrame header slot so both navigation groups reserve measured space before the map and panels. Other scenes still require migration. This audit does not certify every viewport or every mission as visually verified. No migration may delete saved mission identity, prepared vehicles, cargo, unlocks, research receipts or pending sync operations.

## Verification matrix

For each setup inspect phone portrait, phone landscape and desktop with short and long labels, low and high balances, empty and populated inventories, locked and eligible actions, overlay open/closed, offline rendering and an active saved mission. For each mission family play from selection through results using the existing scene driver, then reload mid-operation and verify the resume action. Community weeks and special events must exercise the same operations with their eligibility and rewards.

### Instrument migration

The shared InstrumentViewport now reserves its TopBar in an InstrumentFrame row. This covers TESS, asteroid discovery, Saturn imaging and their standby variants through the same component. ProbeScanScreen and RadioMeteorScreen use that frame and no longer offset headings sideways to avoid a floating Back button. Their original scan, annotation, classification and submission callbacks remain attached. Telescope training copy now points to the agency rocket review.

Browser geometry checks confirmed header bottom equals content top at 390×844, 926×428 and 1440×900 for probe and radio fixtures. The TESS browser check did not finish mounting within the inspection window, so its visual verification remains pending.
