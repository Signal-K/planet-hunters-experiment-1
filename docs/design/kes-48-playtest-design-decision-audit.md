# KES-48 — Playtest design-decision audit

**Audit date:** 2026-08-25
**Scope:** design evidence and Liam handoff only. No production decision is made here.

## Executive read

The playtest concern was originally a combined economy, mission-depth, and legibility problem. The underlying franc scale has since been recalibrated in `web/lib/data/economy.ts` to a single `₣15M–₣25M` contract-fee band. Compact notation also exists and is used in several high-visibility surfaces. The remaining design question is therefore primarily **notation policy and visual hierarchy**, not a fresh economy rebalance.

The repo still has a mixed display policy: persistent HUD values and mission/rocket cards use compact notation, while several costs, confirmations, debrief rows, market totals, and the Hub subsurface quote still render full comma-separated values. That may be intentional precision, or it may be the unfinished part of KES-48. Liam needs to choose the rule and draw the reference states.

## Evidence ledger

| Area | Current repo evidence | Audit status |
|---|---|---|
| Economy scale | `web/lib/data/economy.ts` documents the unified band: M1 `₣15M`, M2 `₣18M`, Prospector `₣13M`, starting balance `₣9M`, exotic full hold `₣11M`. | Existing product calibration; do not reopen in this artifact. |
| Currency utility | `web/lib/format.ts` defines `₣`, comma notation, compact `M/B` notation, and explicit signed deltas. Its examples are `₣1.5B`, `+₣250M`, and `−₣1,300`. | Existing implementation; notation policy still needs visual sign-off. |
| Persistent balances | `HUDStrip`, `TopBar`, `MissionCard`, `RocketPurchaseScreen`, `HangarScreen`, `MarketScreen`, `SurfaceOpsScreen`, and `IntroScreen` use compact formatting. | Strong evidence for compact notation in scan/read contexts. |
| Exact or confirmable amounts | `RefineryScreen`, `BuildPlaceScreen` prose, `AcademyScreen`, `DebriefScreen`, `DeliveryScreen`, `MarketScreen` confirmation copy, and `HubSubsurfaceView` still call `formatCurrency` without `compact`. | Mixed policy; Liam decision required. |
| Existing visual reference | `web/design-reference/landnam-full-panel-reskin/landnam-earth-base.html` shows a resource chip as `120` with a separate `Francs` label; `landnam-launch.html` shows a full `₣180,000` launch cost. | Reference material is internally inconsistent with the current `₣M` economy; do not copy either value literally. |
| Visual language | The canonical ZenNotes style prompt requires instrument-panel clarity, mono/telemetry readouts, uppercase labels, and amber only for small payout/cost emphasis. | Governs the drawing treatment, not the numeric scale. |

## Currency / notation decision draft

This is a handoff for Liam to approve or alter, not a final product decision.

### Candidate policy A — compact by default, exact at commitment

- Persistent balance, mission payout, rocket/structure browse cards, and summary rails: compact `₣9M`, `₣13M`, `₣18M`.
- A purchase/sale/upgrade confirmation: show the same compact amount in the action label, with an exact comma-separated amount in the explanatory detail only if exact verification is useful.
- Debrief: compact headline net result; exact itemized lines only where the player is reconciling a charge or repayment.
- Signed changes use `+₣…` / `−₣…`; no arrows or alternate currency glyphs.

This preserves scanability on small screens while keeping irreversible actions auditable.

### Candidate policy B — compact everywhere in gameplay

- All gameplay-facing franc amounts use `₣M` / `₣B` notation, including confirmations and debrief rows.
- Exact comma-separated values are reserved for a future ledger/details view, not ordinary gameplay.

This is more visually consistent, but may make a player less able to verify a transaction.

### Liam must decide

1. Choose A or B, or specify a third rule for exact values.
2. Confirm whether `₣18M` is the canonical visible form, or whether the UI should say `18M Francs` / `18 million Francs` in any surface. The current code and references use both a `₣` prefix and a separate `Francs` label.
3. Confirm rounding: current compact output is one decimal for billions, no decimal for millions (`₣1.3B`, `₣18M`). Decide whether values such as `₣1.2M` need one decimal when the million value is not integral.
4. Approve one reference composition for Liam to draw at minimum: HUD balance, mission payout card, purchase confirmation, and debrief net/expense breakdown. Include a narrow mobile-landscape state because the utility exists specifically to protect small HUD surfaces.
5. Confirm whether the existing reference screenshots are mood/layout references only. Their literal `₣180,000` and `120 Francs` examples predate the current economy and should not be treated as target values.

## Other playtest items: draw/approve versus already evidenced

These items came from the same playtest thread. They should not be reimplemented or silently re-decided as part of this artifact.

| Item | Current evidence | Liam handoff |
|---|---|---|
| Mission depth / transit | `TransitScreen.tsx` remains a mostly passive wait state; the existing design direction is to make client, destination, cargo, and ETA legible before considering a new minigame. | Draw/approve the information hierarchy for the waiting state; do not imply a transit minigame is decided. |
| Mineral clarity | `MINERAL_META` carries symbols, and the mining reference already demonstrates short labels such as `Pt` over ore. | Approve symbol-label treatment and minimum readable size across textured and vector ore; no new palette decision is needed for this ticket. |
| Orbit meaning | Target-picker copy and orbit logic exist, including rarity thresholds in `web/lib/data/target-archetypes.ts`; the remaining concern is whether the explanatory copy and ring emphasis are understandable. | Draw one target-picker example showing the orbit explanation and rarity relationship; leave threshold changes out of this artifact. |
| Mission difficulty / payout tier | `MissionCard.tsx` and `MissionDetailPanel.tsx` already render difficulty and qualitative payout-tier signals. | Approve prominence and wording in the reference card; this is a visual review, not a new mechanic. |
| Debrief expenses | `DebriefScreen.tsx` now includes a loan-repayment line when applicable and renders signed net totals. | Draw/approve the hierarchy of earned, expenses, repayment, and net; do not add nonexistent fuel/wear costs. |

## Non-decisions and guardrails

- Do not rebalance the economy from this audit. The current unified scale is documented and tested separately.
- Do not create another formatter or another currency glyph. Extend the existing policy only after Liam chooses the display rule.
- Do not treat the old reference values as balance targets.
- Keep the design language command-deck: compact telemetry, clear labels, and amber reserved for small semantic payout/cost emphasis rather than broad chrome.

## Source references

- Linear: KES-48, KES-11, KES-27, KES-35, KES-36.
- Repo: `web/lib/format.ts`, `web/lib/data/economy.ts`, `web/components/ui/HUDStrip.tsx`, `web/components/ui/TopBar.tsx`, `web/components/game/MissionCard.tsx`, `web/components/game/MissionDetailPanel.tsx`, `web/components/game/screens/DebriefScreen.tsx`.
- Design references: `web/design-reference/landnam-full-panel-reskin/landnam-earth-base.html`, `web/design-reference/landnam-full-panel-reskin/landnam-launch.html`, and the canonical ZenNotes Landnam UI design-language decision.
