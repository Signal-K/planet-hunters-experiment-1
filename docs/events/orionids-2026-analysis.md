# Orionids 2026: what the player actually does

> Stale in places: the shower run now catches fragments at launch (SSL-578, SSL-651) and the order reads caught over goal. See the ZenNotes audit "Orionids 2026 event audit and learnings for future events".

Written 19 Oct 2026, then revised the same day for the web event pass. This is a description of the live web loop, not a pitch. Native is unchanged.

> **Update, 22 Oct 2026 (SSL-630, SSL-646).** The catch described below, debris mined with the laser after 22:00 and held in cargo, is no longer how fragments are caught. The rocket now catches them on the way up, at any hour of the window: 2 per launch, 4 on peak night (21 Oct 18:00 to 22 Oct 06:00), none outside the window, at negligible cargo cost. The launch shows a sticky "N Orionid fragments caught on the way up" toast. The passages below on night-only debris, the 22:00 start and the cargo limit are superseded. The chip, panel, banner, voucher and 02:00 fireball passages were not re-checked against the current build. Source: `web/lib/orionids/launch-catch.ts`. Rendered proof at 390x844, 926x428 and 1440x900: `web/tests/scenes/flow-orionids-launch.spec.ts`.

The shower is open from local midnight on 19 Oct through 8 Nov 2026 00:00 UTC. On an ordinary night, debris falls from 22:00 to 06:00 local. On peak night it starts at 18:00 on 21 Oct and runs until 06:00 on 22 Oct, and the rate is doubled. Outside that night the rate still moves: it starts at 4 particles a minute and climbs toward 12 as the UTC peak (22 Oct 00:00) gets closer, then falls back. A normal night in the window is the same scene at the un-doubled rate.

## A normal night in the window

Afternoon, any day from 19 Oct to 7 Nov. The player is on the base. A chip in the corner reads Orionids tonight, including at noon. Opening it shows the panel: Halley's Comet dust, the 22:00–06:00 window, three steps (fly a laser mining run at night, wait for debris, sell it at the Exchange), the badge line, Share, and View event. Nothing in the sky is different. The chip does not say how long until 22:00.

View event opens the Events board. Spacetober sits at the top: World Space Week first (4–10 Oct, already ended), then the Orionids peak (21 Oct 18:00–22 Oct 06:00). The week step shows a gold or silver set badge only if the player already earned a World Space Week badge. The peak step shows one only after an Orionids badge or an Orionids-found planet. Links go to Atlas badges, Garden, and the Atlas Orionids page at https://youratlas.cc/orionids, which is the public check-in. Under that, the old cards are still there: Orionids as a live event, and the four World Space Week cards as past events with Play for silver.

Participate on the Orionids card opens a Free run headed "Orionids night run". The goal is catch 20 Orionid fragments across the night. That count is stored on the player and survives leaving the field. Cargo only keeps what the ship can hold, and the launch gate stays at 8U. The card also says to classify a planet tonight for a voucher. If the player starts the run before 22:00 on an ordinary night, the field has no debris and the counter stays at 0 / 20. The Orionids badge still waits for the first fragment.

After 22:00 the same run shows blue-white specks falling through the asteroid field while the laser mines rock. The first speck mined grants the Orionids badge, gold during the window. More specks are just cargo of the mineral Orionid debris, uncommon, sold at the Exchange at the ordinary spot price. There is no counter of specks, no comparison with last night, and no moment in the scene for moonset. When the run ends, the debrief is the normal mining debrief plus the badge row if a badge was earned.

If the player classifies a TESS candidate as a planet, or finishes a survey scan of a planet, during the window, that body gets an Orionids-found marker and an owned voucher. The toast says the voucher is owned and that redeem is coming soon. The Events strip lists it the same way. Meteorite mastery becomes 1, once. A second planet does not raise it. The training candidate does not count. An asteroid classification does not count. Before 19 Oct none of this is granted. After 8 Nov the same actions still grant the marker and the voucher, at silver, and still set mastery to 1 if it was 0.

## Peak night, 21 Oct 18:00 to 22 Oct 06:00

From 18:00 the field is live. Debris falls, the counter reads toward 20, and a Peak ×2 tag sits on the mining field. The global banner has already been up since 19 Oct, on every screen: the shower is happening, and the best time is after moonset, about 02:00 local on 21–22 Oct. A hazy pixel streak overlay sits across the app. It holds still when the player prefers reduced motion.

At 22:00 nothing new starts. The specks have been falling since 18:00. The first one still grants the Orionids badge if it was not already earned.

At 02:00 local on 22 Oct the reminder still fires, if notifications are allowed: "Moon's down — look up. Orionids peak; debris is falling in Landnam." In the field, one fireball fragment falls for this player if they have not caught one. Catching it grants the Fireball 2026 badge, gold during the window. The fragment's book value is ₣20,160,000, fifteen times the ₣1,344,000 an ordinary Orionid fragment fetches at the Exchange. The Exchange pays 80% of that book, ₣16,128,000, about one early contract. It does not fall a second time for that player. Leaving before the catch means it can fall again on the next visit that night.

At 06:00 the specks stop. The chip goes back to the daytime line. The banner stays until 8 Nov. Cargo already collected is still in the hold or the silo.

A planet classified during the window keeps the Orionids-found marker, the owned voucher ("Redeem coming soon"), and meteorite mastery 1. The marker is a pixel meteor that shimmers on that planet in the Events list and in the community hub, and the discovery toast still fires. After 8 Nov the same actions, including the reading, grant silver instead of gold. Gold is never downgraded.

## Is the goal clear?

The night run and the field counter now say the same thing: catch 20 Orionid fragments. The Orionids card also says to classify a planet tonight for a voucher. The badge for ordinary debris is still the first speck, not the twentieth. Finishing the Fireballs in the Sky reading and its three-question check is a separate Fireball Spotter badge.

## Are the choices meaningful?

Night versus day is a real choice: day has no debris. Which asteroid to mine is the same choice as a normal free run. Selling debris versus holding it is the normal Exchange choice. Peak night versus any other night is not a choice the board offers; it is a date. Classifying a planet as a planet, versus unsure, changes whether the marker is granted. That is meaningful only if the player already came to classify. The game does not ask them to do it for the shower.

Peak night now starts four hours earlier, shows Peak ×2, and has one fireball at 02:00. That is a timing difference a player can see. There is still no loadout or site choice.

## Is the feedback readable?

The chip, the panel, the night-run counter, the Peak ×2 tag, the banner, and the voucher mark are readable. Body text on those surfaces is at least 14px, and the main buttons meet 44px. Twice as fast is now a tag on the field as well as a sentence in the panel. Meteorite mastery 1 still has no other level and does not change a tool. The voucher still cannot be spent.

## Is there a reason to come back?

The 20-fragment counter, the 02:00 fireball, and the reading are reasons to stay on peak night. After the fireball is caught and the counter is full, later nights are the same shower at a slower rate, for silver if they are after 8 Nov. The voucher still does not bring anyone back, because redeem is not built. Mastery still does not change a tool. The 02:00 reminder still points at the real sky, and the game now has a matching fragment at that minute.

## What is still missing for this to feel like an event

The night run is now a shower goal, peak night is labelled, and 02:00 drops one rare fragment. What is still missing: redeeming the voucher, a mastery level that changes a tool, the fragment appearing if the player is not in a debris field that night, and the whole pass on native. Native still has the 8 iron run, no global banner, and no fireball mineral. The galaxy map still does not draw discovered planets, so the shimmer is on the Events voucher and the community hub card, which is where the player sees that planet.
