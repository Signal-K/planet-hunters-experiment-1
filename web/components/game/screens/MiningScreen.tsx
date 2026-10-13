'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Mission, Target, MineralMeta } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE, REMOTE_MINERAL_SILO_CAPACITY } from '@/lib/data'
import { miningNeedsRecharge, unitsStillNeeded, rechargeCost } from '@/lib/systems/mining-charges'
import { useHelp } from '@/components/ui/useHelp'
import Panel from '@/components/ui/Panel'
import { formatCurrency } from '@/lib/format'
import { paletteById, paletteForTarget } from '@/lib/mining/laserPalette'
import { openSettings } from '@/lib/mining/openChrome'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { BaseDock, DockWordButton } from '@/components/game/hub/BaseDock'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import MiningCanvas from './MiningCanvas'
import SkyEventChip from '@/components/game/SkyEventChip'
import { useDebrisEvent } from '@/lib/hooks/useDebrisEvent'
import { DEBRIS_RESOURCE_IDS } from '@/lib/data/sky-events'

// First-time-entering-Free-Ops-mining explainer — dismiss-once, same
// localStorage-ack pattern as MissionBoardScreen's EXPLAINER_ACK_KEY, but
// scoped to the mining screen itself. The board explainer covers the board's
// client/infrastructure/custom split; this covers what changes once
// you're actually mining with no client attached (sell the haul yourself,
// no daily limit) — the two are different moments and were previously
// conflated, leaving the mining screen with zero "no client" first-entry cue.
const FREE_OPS_MINING_ACK_KEY = 'ln_mining_freeops_first_entry_ack'
const FREE_OPS_FIRST_SUCCESS_ACK_KEY = 'ln_mining_freeops_first_success_ack'
// SSL-333: first-ever mining run, any mission type, opens the controls guide
// automatically once so a player never has to discover the "?" button on
// their own. Separate from FREE_OPS_MINING_ACK_KEY, which only covers the
// no-client explainer and never fires on a client mission's first mining run.
const HUD_GUIDE_ACK_KEY = 'ln_mining_hud_guide_ack'

function useFreeOpsMiningAck(alreadyExperienced: boolean) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (alreadyExperienced) return
    setShow(!localStorage.getItem(FREE_OPS_MINING_ACK_KEY))
  }, [alreadyExperienced])
  const dismiss = () => {
    localStorage.setItem(FREE_OPS_MINING_ACK_KEY, '1')
    setShow(false)
  }
  return { show, dismiss }
}

function useFreeOpsFirstSuccessAck() {
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    setDismissed(!!localStorage.getItem(FREE_OPS_FIRST_SUCCESS_ACK_KEY))
  }, [])
  const dismiss = () => {
    localStorage.setItem(FREE_OPS_FIRST_SUCCESS_ACK_KEY, '1')
    setDismissed(true)
  }
  return { dismissed, dismiss }
}

// Horizontal drag track — left = slow, center = normal, right = fast forward
// Thumb snaps back to center on release
function miningGuide(hasDelivery: boolean) {
  return [
    { kind: 'fire', label: 'Fire Laser', desc: 'Fires the vertical beam. Scroll ore under the beam, then fire (Space/F).' },
    { kind: 'charges', label: 'Charges', desc: 'The fire button reads Depleted when the laser is empty. Empty, with the order unfinished, the run stops.' },
    { kind: 'order', label: 'Order', desc: 'The order card lists each mineral still owed. Tap it to return once the order is filled, or while the laser is empty.' },
    { kind: 'scroll', label: 'Scroll', desc: 'The dock arrows change how fast the ground moves. They settle back to a steady crawl. Drag the field the same way.' },
    { kind: 'inventory', label: 'Inventory', desc: 'The order lines show collected against required. Fill every line to unlock return.' },
    hasDelivery
      ? { kind: 'deliver', label: 'Deliver cargo', desc: 'The next leg drops this cargo off. Payout unlocks after delivery.' }
      : { kind: 'return', label: 'Return home', desc: 'Return for recovery. Payout unlocks after landing.' },
  ]
}

function GuideMark({ kind }: { kind: string }) {
  const blocks: Record<string, Array<[number, number, number, number]>> = {
    fire: [[6, 0, 2, 4], [8, 2, 2, 2], [10, 3, 2, 3], [8, 5, 2, 2], [6, 6, 2, 2], [4, 7, 2, 3], [6, 9, 2, 5], [4, 13, 2, 2]],
    charges: [[7, 1, 2, 2], [4, 3, 8, 1], [4, 3, 1, 11], [11, 3, 1, 11], [4, 13, 8, 1], [6, 8, 4, 4]],
    order: [[2, 3, 12, 2], [2, 7, 12, 2], [2, 11, 8, 2]],
    scroll: [[1, 7, 2, 2], [3, 5, 2, 2], [3, 9, 2, 2], [5, 3, 2, 2], [5, 11, 2, 2], [9, 3, 2, 2], [9, 11, 2, 2], [11, 5, 2, 2], [11, 9, 2, 2], [13, 7, 2, 2]],
    inventory: [[3, 4, 10, 1], [3, 4, 1, 9], [12, 4, 1, 9], [3, 12, 10, 1], [5, 7, 6, 1], [7, 7, 2, 4]],
    deliver: [[2, 4, 8, 1], [2, 4, 1, 8], [9, 4, 1, 8], [2, 11, 8, 1], [12, 6, 2, 2], [11, 4, 2, 2], [11, 8, 2, 2]],
    return: [[7, 1, 2, 2], [5, 3, 6, 2], [3, 5, 10, 2], [4, 7, 8, 7], [7, 10, 2, 4]],
  }
  return (
    <svg className="mining-guide-mark" viewBox="0 0 16 16" width="32" height="32" aria-hidden="true">
      {(blocks[kind] ?? blocks.fire).map(([x, y, w, h], index) => (
        <rect key={index} x={x} y={y} width={w} height={h} />
      ))}
    </svg>
  )
}

export default function MiningScreen({ mission, target, rocketImageSrc, onComplete, onBack, onPersist, onAbandon, minerals, laserChargeCap, laserBonusCharges = 0, laserTier, trainingMiningTry = false, addToast, deliveryTargetName, hasPriorFreeOpsExperience, initialCargo, initialCharges, francs = 0, onSpendFrancs, remoteSiloAvailable, remoteSiloUsed = 0, isFreeHaulEligible, hasEarthStorage, initialEarthDisposition, onDebrisMined, orionidsBadgeTier = null }: {
  mission: Mission
  target: Target
  rocketImageSrc?: string
  onComplete: (cargo: Record<string, number>, remoteDisposition?: 'store' | 'sell', earthDisposition?: 'store' | 'sell') => void
  /** Called with whatever's been collected so far (may be empty) — the caller is responsible for persisting it so a later resume doesn't lose progress. */
  onBack: (cargo: Record<string, number>, laserCharges: number) => void
  /** Writes cargo and charges while the run is open, so a reload does not refill the laser or drop ore. */
  onPersist?: (cargo: Record<string, number>, laserCharges: number) => void
  /** Laser charges left before a prior "Back to hub" pause; resuming must not refill the magazine. */
  initialCharges?: number
  /** Franc balance, shown on and deducted by the recharge action. */
  francs?: number
  onSpendFrancs?: (amount: number) => void
  onAbandon?: () => void
  minerals: Record<string, MineralMeta>
  laserChargeCap?: number
  /** Extra charges from the installed Laser Capacitor (SSL-462). Skipped on the onboarding tries. */
  laserBonusCharges?: number
  /** Equipped drill/laser part tier (1-3). Gates how deep ore is reachable — deeper veins tease an upgrade. */
  laserTier?: number
  trainingMiningTry?: boolean
  /** Transient Temple-Run-style hints ("Nice shot!", "You don't need that yet") — tutorial-scoped, not the persistent coach banner. */
  addToast?: (message: string, kind?: 'info' | 'ok' | 'warn') => void
  /** Set for two-leg "mine then deliver" missions (mission.deliveryTargetId) — swaps the return button's copy from "Return to Earth" to "Deliver to {name}" since the ship isn't heading home yet. */
  deliveryTargetName?: string
  /** True once the player has completed any client mission — suppresses the Free Ops first-entry explainer for players who reached self-directed mining before this ack tracking existed. */
  hasPriorFreeOpsExperience?: boolean
  /** Cargo already collected before a prior "Back to hub" pause on this same mission, restored so the player doesn't lose it on resume. */
  initialCargo?: Record<string, number>
  /** Operational player-owned silo at this target; enables arrival settlement. */
  remoteSiloAvailable?: boolean
  remoteSiloUsed?: number
  /** True for a self-directed mining run with no client, delivery, or
   *  construction attached (KES-283) — the only case that gates on a storage
   *  destination before mining can begin. */
  isFreeHaulEligible?: boolean
  /** Whether the player has a built Earth-side silo/vault to store into. */
  hasEarthStorage?: boolean
  /** Destination already chosen before a prior "Back to hub" pause on this
   *  same mission — resuming must not ask again. */
  initialEarthDisposition?: 'store' | 'sell'
  /** SSL-475: fired for every sky-event debris chunk mined (first one earns the badge). */
  onDebrisMined?: (resourceId: string) => void
  /** Tier already stored for the Orionids badge, so the mining HUD can show it once. */
  orionidsBadgeTier?: 'gold' | 'silver' | null
}) {
  const debrisPreset = useDebrisEvent()
  // Charge count is mission-aware, not coach-aware.
  // During onboarding (sequence <= FREE_OPS_START_MISSIONS_DONE): always 16× the ore required,
  // minimum 80, so the player can never be softlocked by low charges regardless of coach state.
  // Ore only sits in the firing zone briefly as it scrolls through (organic gaps average
  // ~1 ore every few seconds), so most shots miss even with good aim — a tight multiplier
  // here (previously 3x/20, then 6x/30) could exhaust charges before the order fills on a real
  // playthrough. The 6x/30 budget was still not enough: `depositMinerals` below weights the
  // required mineral(s) at only 2 of N pool entries (~33% for a single-mineral order against a
  // 6-mineral pool like Eros's), so of 30 charges — after accounting for shots that miss the
  // firing window entirely — the *expected* on-target hit count for a 5-unit single-mineral
  // order fell meaningfully short of 5 on a below-average run, and a failed attempt
  // used to wipe cargo (no partial credit), so a player could cycle failed attempts
  // indefinitely without ever clearing the order. Confirmed live: a 5-platinum starter-bulk
  // order on Eros stayed at 0/5 after 9000+ simulated shots (~6 real minutes) at the old budget.
  // 16x/80 gives ~2.7x the prior margin; still finite, not a difficulty-removing bump.
  // Post-onboarding: respect laserChargeCap from skill nodes, but never let it drop below
  // 4× the ore required — laserChargeCap is a flat 5-7 from skill nodes regardless of mission
  // size, so a harder Free Ops order (e.g. 8 units of one mineral) could demand more hits than
  // the skill-based cap could ever supply, making the mission mathematically unwinnable.
  const totalOreNeeded = Object.values(mission.requires.minerals).reduce((sum, v) => sum + v, 0)
  const isOnboarding = typeof mission.sequence === 'number' && mission.sequence <= FREE_OPS_START_MISSIONS_DONE
  const MAX_CHARGES = (isOnboarding
    ? Math.max(80, totalOreNeeded * 16)
    : Math.max(laserChargeCap ?? 5, totalOreNeeded * 4)) + laserBonusCharges
  const LOW_CHARGE_THRESHOLD = Math.max(2, Math.ceil(MAX_CHARGES * 0.2))
  const cargoRef = useRef<Record<string, number>>(initialCargo ?? {})
  const [cargo, setCargo] = useState<Record<string, number>>(initialCargo ?? {})
  const [remoteDisposition, setRemoteDisposition] = useState<'store' | 'sell'>('store')
  // KES-283: a self-directed run requires a storage destination before mining
  // starts. A destination chosen before a prior back-to-hub pause carries
  // over via initialEarthDisposition so resuming never asks twice.
  const [earthDisposition, setEarthDisposition] = useState<'store' | 'sell' | null>(initialEarthDisposition ?? null)
  const gateOpen = !!isFreeHaulEligible && earthDisposition == null
  const fireRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<((dx: number) => void) | null>(null)
  const [laserCharges, setLaserCharges] = useState(() => initialCharges != null ? Math.max(0, Math.min(MAX_CHARGES, initialCharges)) : MAX_CHARGES)
  const laserChargesRef = useRef(laserCharges)
  laserChargesRef.current = laserCharges
  const onPersistRef = useRef(onPersist)
  onPersistRef.current = onPersist
  const help = useHelp('mining')
  useEffect(() => {
    onPersistRef.current?.(cargo, laserCharges)
  }, [cargo, laserCharges])
  const [confirmingRecharge, setConfirmingRecharge] = useState(false)
  const [runKey, setRunKey] = useState(0)  // bump to reset MiningCanvas
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const firedRef = useRef(false)
  const hintedFirstHitRef = useRef(false)
  const hintedWrongOreRef = useRef(false)
  const hintedOrderFilledRef = useRef(false)
  const oreNearRef = useRef<((near: boolean) => void) | null>(null)
  const [oreNear, setOreNear] = useState(false)
  oreNearRef.current = (near: boolean) => setOreNear(near)

  // Fire cooldown state lives in MiningCanvas (it must gate both the button
  // and a direct canvas tap). chargingRef mirrors it up here the same way
  // oreNearRef mirrors ore-proximity, purely for the button's own display.
  const chargingRef = useRef<((charging: boolean) => void) | null>(null)
  const [isCharging, setIsCharging] = useState(false)
  chargingRef.current = (charging: boolean) => setIsCharging(charging)
  const [tapDenied, setTapDenied] = useState(false)
  const tapDeniedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Kept current every render (cheap Set build) so the "fire now" flash only
  // lights up for ore whose mineral is still short of the order — not any
  // ore in the deposit's full mineral pool.
  const neededMineralsRef = useRef<Set<string> | null>(null)
  neededMineralsRef.current = new Set(
    Object.entries(mission.requires.minerals)
      .filter(([id, amount]) => (cargo[id] ?? 0) < amount)
      .map(([id]) => id)
  )

  const orderFilled = Object.entries(mission.requires.minerals).every(
    ([id, amount]) => (cargoRef.current[id] ?? 0) >= amount
  )

  const stillNeeded = unitsStillNeeded(mission.requires.minerals, cargo)
  // A magazine that cannot reliably cover the remaining units offers a recharge
  // that keeps the cargo already collected (SSL-413).
  const needsRecharge = miningNeedsRecharge(laserCharges, stillNeeded)

  // Charges depleted without filling the order — always show recovery options, not just during coaching
  const runFailed = !isFreeHaulEligible && laserCharges === 0 && !orderFilled
  const chargesLow = !isFreeHaulEligible && !orderFilled && laserCharges > 0 && laserCharges <= LOW_CHARGE_THRESHOLD

  // A recharge is paid for (SSL-512): the cost is on the button, confirmed,
  // deducted, and the new balance is reported. Training tries recharge free so
  // onboarding can't be softlocked.
  const rechargePrice = trainingMiningTry ? 0 : rechargeCost(francs)
  function handleRecharge() {
    setConfirmingRecharge(true)
  }
  function confirmRecharge() {
    setConfirmingRecharge(false)
    if (rechargePrice > 0) onSpendFrancs?.(rechargePrice)
    setLaserCharges(MAX_CHARGES)
    addToast?.(rechargePrice > 0 ? `Laser recharged for ${rechargePrice} fr. Balance ${francs - rechargePrice} fr` : 'Laser recharged', 'ok')
  }
  const rechargeLabel = rechargePrice > 0 ? `Recharge Laser · ${rechargePrice} fr` : 'Recharge Laser · free'

  function handleTryAgain() {
    cargoRef.current = {}
    setCargo({})
    setLaserCharges(MAX_CHARGES)
    firedRef.current = false
    setSceneStatus('loading')
    setRunKey(k => k + 1)
    if (tapDeniedTimerRef.current) clearTimeout(tapDeniedTimerRef.current)
    setTapDenied(false)
  }

  const onDebrisMinedRef = useRef(onDebrisMined)
  onDebrisMinedRef.current = onDebrisMined
  const collectMineral = useCallback((mineral: string) => {
    // Shower debris rides in cargo and sells at the Market. It is not part of the order.
    if (DEBRIS_RESOURCE_IDS.includes(mineral)) onDebrisMinedRef.current?.(mineral)
    cargoRef.current = {
      ...cargoRef.current,
      [mineral]: (cargoRef.current[mineral] ?? 0) + 1,
    }
    setCargo(cargoRef.current)

    // Temple-Run-style transient hints — tutorial-scoped, separate from the
    // persistent coach banner. Each fires at most once per run.
    if (trainingMiningTry && addToast) {
      const isNeeded = mineral in mission.requires.minerals
        && (cargoRef.current[mineral] ?? 0) <= mission.requires.minerals[mineral]
      if (!hintedFirstHitRef.current) {
        hintedFirstHitRef.current = true
        addToast('Nice shot!', 'ok')
      } else if (!isNeeded && !hintedWrongOreRef.current) {
        hintedWrongOreRef.current = true
        const name = minerals[mineral]?.name ?? mineral
        addToast(`You don't need ${name} for this order — skip it`, 'warn')
      }
      const nowFilled = Object.entries(mission.requires.minerals).every(
        ([id, amount]) => (cargoRef.current[id] ?? 0) >= amount
      )
      if (nowFilled && !hintedOrderFilledRef.current) {
        hintedOrderFilledRef.current = true
        addToast('Order filled — tap the order to return', 'ok')
      }
    }
  }, [trainingMiningTry, addToast, mission.requires.minerals, minerals])

  function fireLaser(quiet = false) {
    if (gateOpen || sceneStatus !== 'ready' || laserCharges <= 0) return
    if (isCharging) {
      if (quiet) return
      // Tap landed mid-cooldown: acknowledge it instead of silently dropping
      // it, so a phone tester never wonders whether the tap registered.
      if (tapDeniedTimerRef.current) clearTimeout(tapDeniedTimerRef.current)
      setTapDenied(true)
      tapDeniedTimerRef.current = setTimeout(() => setTapDenied(false), 160)
      return
    }
    setLaserCharges(c => c - 1)
    fireRef.current?.()
    if (!firedRef.current && trainingMiningTry) {
      firedRef.current = true
    }
  }

  // SSL-413: players mashed FIRE LASER every ~0.6s in 15s bursts (rageclicks).
  // Holding the button now re-fires the moment the laser has recharged.
  const fireLaserRef = useRef(fireLaser)
  fireLaserRef.current = fireLaser
  const fireHoldRef = useRef(0)
  const endFireHold = useCallback(() => window.clearInterval(fireHoldRef.current), [])
  const beginFireHold = useCallback(() => {
    window.clearInterval(fireHoldRef.current)
    fireLaserRef.current()
    fireHoldRef.current = window.setInterval(() => fireLaserRef.current(true), 120)
  }, [])
  useEffect(() => endFireHold, [endFireHold])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'KeyF') {
        e.preventDefault()
        fireLaser()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [laserCharges, sceneStatus, isCharging])

  function handleReturn() {
    if (isFreeHaulEligible || orderFilled || laserCharges <= 0) {
      onComplete(cargoRef.current, remoteDisposition, earthDisposition ?? undefined)
      return
    }
    // SSL-411: a disabled RETURN swallowed taps (read as rageclicks on the
    // bare controls panel). Stay tappable and say what is still missing.
    const missing = Object.entries(mission.requires.minerals)
      .map(([id, amount]) => ({ id, left: amount - (cargoRef.current[id] ?? 0) }))
      .filter(m => m.left > 0)
      .map(m => `${m.left} more ${minerals[m.id]?.name ?? m.id}`)
    addToast?.(`Order not filled yet: mine ${missing.join(' and ')}`, 'warn')
  }

  // Local-dev-only shortcut: fills the order instantly so testing later
  // screens doesn't require playing the mining minigame by hand each time.
  function handleDevSkip() {
    cargoRef.current = { ...cargoRef.current, ...mission.requires.minerals }
    onComplete(cargoRef.current, remoteDisposition, earthDisposition ?? undefined)
  }

  // Deposit contains the target's full mineral pool, not just the mission's objective —
  // otherwise a single-mineral order (e.g. silicon) makes every ore in the field identical.
  // The required mineral(s) are weighted 2x so onboarding orders still fill at a reasonable pace.
  const depositMinerals = (() => {
    const required = Object.keys(mission.requires.minerals)
    const pool = target.minerals && target.minerals.length > 0 ? target.minerals : required
    const others = pool.filter(m => !required.includes(m))
    const weighted = [...required, ...required, ...others]
    return weighted.length > 0 ? weighted : required
  })()

  const totalNeeded = Object.entries(mission.requires.minerals).reduce((sum, [, v]) => sum + v, 0)
  const totalCollected = Object.entries(mission.requires.minerals).reduce(
    (sum, [id, amount]) => sum + Math.min(cargo[id] ?? 0, amount), 0
  )
  const [guideOpen, setGuideOpen] = useState(false)
  const [confirmingAbandon, setConfirmingAbandon] = useState(false)
  const [paletteOverride, setPaletteOverride] = useState<string | null>(null)
  const [devBars, setDevBars] = useState(false)
  const [mixedOres, setMixedOres] = useState(false)
  const [scrollScreens, setScrollScreens] = useState(0)
  const [pinScroll, setPinScroll] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPaletteOverride(params.get('palette'))
    setDevBars(params.get('dev') === '1')
    setMixedOres(params.get('ores') === 'mixed')
    const raw = params.get('scroll')
    if (raw == null || raw === '') {
      setScrollScreens(0)
      setPinScroll(false)
      return
    }
    const scroll = Number(raw)
    setScrollScreens(Number.isFinite(scroll) && scroll > 0 ? scroll : 0)
    setPinScroll(true)
  }, [])
  const palette = paletteById(paletteOverride) ?? paletteForTarget(target)

  // SSL-333 opened the guide once on a first mining run. The Flight Plan owns
  // the Fire Laser training try now, so the guide remains opt-in there and
  // never covers the seam it asks the player to watch.
  useEffect(() => {
    // Flight Plan already explains the shot; the guide must not create a
    // second guidance layer over the ore and fire controls.
    if (trainingMiningTry) return
    try {
      if (!localStorage.getItem(HUD_GUIDE_ACK_KEY)) {
        setGuideOpen(true)
        localStorage.setItem(HUD_GUIDE_ACK_KEY, '1')
      }
    } catch { /* localStorage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingMiningTry])

  const isFreeOps = !!isFreeHaulEligible
  const { show: showFreeOpsMiningExplainer, dismiss: dismissFreeOpsMiningExplainer } = useFreeOpsMiningAck(!isFreeOps || !!hasPriorFreeOpsExperience)
  const { dismissed: freeOpsFirstSuccessDismissed, dismiss: dismissFreeOpsFirstSuccess } = useFreeOpsFirstSuccessAck()
  const freeOpsCargoUnits = Object.values(cargo).reduce((sum, amount) => sum + Math.max(0, amount), 0)
  const freeOpsDebrisReadout = Object.entries(cargo)
    .filter(([id, amount]) => DEBRIS_RESOURCE_IDS.includes(id) && amount > 0)
    .map(([id, amount]) => `${minerals[id]?.name ?? id} ${amount} U`)
    .join(' · ')
  const showFreeOpsSuccessPopup = isFreeOps && freeOpsCargoUnits > 0 && !freeOpsFirstSuccessDismissed

  // KES-282: a first-time player could previously face up to 4 stacked overlays at
  // once (first-entry explainer, guide flyout, first-success popup, low-charge
  // banner, failure overlay). Collapse to a single "assist surface" chosen by
  // priority — the most consequential state wins outright instead of stacking on
  // top of the others. Order: mission-ending failure > one-time success moment >
  // active risk warning > informational guide/explainer (guide, being player-
  // initiated, wins that last tier over the passive first-entry explainer).
  const activeOverlay: 'failure' | 'success' | 'warning' | 'guide' | 'explainer' | null =
    runFailed ? 'failure'
      : showFreeOpsSuccessPopup ? 'success'
      : chargesLow ? 'warning'
      : guideOpen ? 'guide'
      : (isFreeOps && showFreeOpsMiningExplainer) ? 'explainer'
      : null

  const orderLines = Object.entries(mission.requires.minerals)
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nudge = (dir: number) => {
    if (sceneStatus !== 'ready') return
    scrollRef.current?.(dir)
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current)
    nudgeTimer.current = setTimeout(() => { scrollRef.current?.(0) }, 500)
  }
  useEffect(() => () => { if (nudgeTimer.current) clearTimeout(nudgeTimer.current) }, [])

  return (
    <div className="game-screen mining-screen theme-blueprint" data-training-active={trainingMiningTry ? 'true' : 'false'} data-palette={palette.id} data-scroll={pinScroll ? String(scrollScreens) : undefined} style={{ background: palette.skyCss }}>
      {help.layer}

      {/* KES-283: self-directed mining requires a storage destination before
          the run can start — takes absolute precedence over every other
          overlay (explainer/guide/success/failure/warning) since nothing
          about the run can proceed while it's open. */}
      {gateOpen && (
        <div className="mining-storage-gate-overlay" style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(4, 10, 20, 0.72)' }}>
          <Panel accent="var(--ln-cyan)" surface="solid" style={{ padding: 16, width: '100%', maxWidth: 340 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 8 }}>
              Choose Storage Destination
            </div>
            <p style={{ margin: '0 0 14px', fontFamily: 'var(--ln-font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--ln-text-dim)' }}>
              No client is owed this haul. Pick where whatever you mine on this run goes before you start drilling.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                data-testid="mining-gate-sell"
                onClick={() => setEarthDisposition('sell')}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: '1.5px solid var(--ln-hairline)', background: 'var(--ln-surface-2)',
                }}
              >
                <div style={{ font: '800 14px var(--ln-font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ln-text)' }}>Sell On Earth</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 2 }}>At market price</div>
              </button>
              <button
                type="button"
                data-testid="mining-gate-store"
                onClick={() => hasEarthStorage && setEarthDisposition('store')}
                disabled={!hasEarthStorage}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: hasEarthStorage ? 'pointer' : 'not-allowed',
                  border: '1.5px solid var(--ln-hairline)', background: 'var(--ln-surface-2)',
                  opacity: hasEarthStorage ? 1 : 0.5,
                }}
              >
                <div style={{ font: '800 14px var(--ln-font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ln-text)' }}>Store On Earth</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 2 }}>{hasEarthStorage ? 'Into the silo' : 'Needs a silo or vault'}</div>
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* First-time-in-Free-Ops-mining explainer — dismiss-once, mirrors the mission-board explainer's ack pattern but covers what changes about the mining run itself (sell the haul yourself, no daily limit). Gated on activeOverlay so it never stacks with the guide, success popup, warning, or failure overlay. */}
      {activeOverlay === 'explainer' && (
        <div style={{ position: 'absolute', top: 64, left: 14, right: 14, zIndex: 60 }}>
          <Panel className="mining-info-panel" accent="var(--ln-cyan)" surface="glass" style={{ padding: 12, position: 'relative' }}>
            <button
              data-testid="dismiss-freeops-mining-explainer"
              onClick={dismissFreeOpsMiningExplainer}
              aria-label="Dismiss"
              style={{
                position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 6,
                border: '1px solid var(--ln-hairline-strong)', background: 'var(--ln-mining-control-fill)',
                color: 'var(--ln-amber)', fontSize: 14, lineHeight: 1, cursor: 'pointer',
              }}
            >
              ×
            </button>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 6 }}>
              No Client On This Run
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-dim)', lineHeight: 1.45, paddingRight: 20 }}>
              You picked the target and the order. No daily limit — mine what looks valuable, then sell the haul yourself at market price instead of a fixed client payout.
            </div>
          </Panel>
        </div>
      )}

      {devBars && (
        <button
          data-testid="dev-skip-mining-btn"
          className="laser-dev-skip"
          onClick={handleDevSkip}
        >
            SKIP MINING
        </button>
      )}

      {activeOverlay === 'success' && (
        <div className="mining-success-overlay" data-testid="freeops-first-success-popup" style={{ position: 'absolute', inset: 0, zIndex: 75, display: 'flex', alignItems: 'flex-end', padding: 16 }}>
          <Panel className="mining-success-panel" accent="var(--ln-ok)" surface="glass" style={{ padding: 14, width: '100%' }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-ok)', textTransform: 'uppercase', marginBottom: 6 }}>
              First Free Ops Haul Secured
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-dim)', lineHeight: 1.45 }}>
              This cargo is yours. Return to Earth, recover the ship, then sell the haul on the open market instead of handing it to a client.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button
                onClick={dismissFreeOpsFirstSuccess}
                className="mining-success-secondary"
              >
                Review Cargo
              </button>
              <button
                onClick={() => { dismissFreeOpsFirstSuccess(); handleReturn() }}
                className="mining-success-primary"
              >
                Return Now
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* Laser depleted without filling order — highest-priority overlay, always wins */}
      {activeOverlay === 'failure' && (
        <div className="mining-failure-overlay" style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-crit)', textTransform: 'uppercase' }}>Laser Depleted</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, color: 'var(--ln-text)', textAlign: 'center', lineHeight: 1.2 }}>Order Not Filled</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
            {totalCollected}/{totalNeeded} units collected. Recharge keeps this cargo. Each new shot still has to hit a deposit.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280, marginTop: 8 }}>
            <button className="mining-failure-retry" data-testid="mining-recharge-btn" onClick={handleRecharge}>
              {rechargeLabel}
            </button>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-dim)', textAlign: 'center' }} data-testid="mining-balance">Balance {francs} fr</div>
            {onAbandon && (
              <button className="mining-failure-abandon" onClick={() => setConfirmingAbandon(true)}>
                Scrub Mission
              </button>
            )}
          </div>
        </div>
      )}

      {/* Low-charge warning banner — fades in when running short without filling the order */}
      {activeOverlay === 'warning' && (
        <div className="mining-charge-warning" style={{ position: 'absolute', top: 56, left: 0, right: 0, zIndex: 40, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div>
            {laserCharges} charge{laserCharges !== 1 ? 's' : ''} remaining, recharge to keep this cargo
          </div>
        </div>
      )}
      <div className="laser-chrome">
        <button type="button" className="settings-cog" data-testid="settings-button" aria-label="Settings" onClick={openSettings}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <button
          type="button"
          className="laser-chrome__clock"
          data-testid="mining-guide-btn"
          aria-label="Mining controls guide"
          aria-expanded={guideOpen}
          onClick={() => setGuideOpen(o => !o)}
        >
          <HubClockWidget />
        </button>
        <div className="laser-chrome__chips">
          <span className="scene-chip" data-testid="mining-francs-chip">{formatCurrency(francs, { compact: true })}</span>
          <span className="scene-chip" aria-label={`Cargo ${freeOpsCargoUnits} units`} data-testid="mining-cargo-chip">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
        </div>
        <DockWordButton
          className="laser-order"
          data-testid="return-home-btn"
          data-mode={!isFreeOps && needsRecharge && !orderFilled ? 'recharge' : 'return'}
          onClick={!isFreeOps && needsRecharge && !orderFilled ? handleRecharge : handleReturn}
        >
          <span className="laser-dock__lines" data-testid={isFreeOps ? 'freeops-cargo-progress' : 'mining-order-progress'}>
            {isFreeOps ? (
              <span>Cargo {freeOpsCargoUnits}</span>
            ) : (
              orderLines.map(([id, amount]) => (
                <span key={id}>{`${minerals[id]?.name ?? id} ${Math.min(cargo[id] ?? 0, amount)}/${amount}`}</span>
              ))
            )}
          </span>
        </DockWordButton>
      </div>

      <div className="mining-stage">
      <div className="mining-viewport" style={{ background: palette.skyCss }}>
        <MiningCanvas
          key={runKey}
          palette={palette}
          rocketImageSrc={rocketImageSrc}
          minerals={depositMinerals}
          leadMinerals={mixedOres ? ['iron', 'carbon', 'ice'] : undefined}
          scrollScreens={scrollScreens}
          pinScroll={pinScroll}
          requiredMinerals={Object.keys(mission.requires.minerals)}
          mineralMeta={minerals}
          laserTier={laserTier}
          onCollect={collectMineral}
          onReady={() => setSceneStatus('ready')}
          onFailure={() => setSceneStatus('failed')}
          fireRef={fireRef}
          onFireRequest={() => fireLaser()}
          scrollRef={scrollRef}
          oreNearRef={oreNearRef}
          neededMineralsRef={neededMineralsRef}
          chargingRef={chargingRef}
          trainingMiningTry={trainingMiningTry}
          debrisPreset={debrisPreset}
        />
        <SkyEventChip
          surface="mining"
          debrisCount={cargo.orionid_debris ?? 0}
          badgeTier={(cargo.orionid_debris ?? 0) > 0 ? orionidsBadgeTier : null}
        />
        {sceneStatus !== 'ready' && (
          <div className="mining-scene-status" role="status" aria-live="polite" data-testid="mining-scene-status">
            <span className="mining-scene-status__eyebrow">{sceneStatus === 'failed' ? 'FIELD OFFLINE' : 'PREPARING MINING FIELD'}</span>
            <strong>{sceneStatus === 'failed' ? 'SCENE INITIALIZATION FAILED' : 'LOADING ROCKET TELEMETRY AND ORE TARGETS'}</strong>
            {sceneStatus === 'failed' && (
              <button type="button" className="mining-scene-status__retry" onClick={handleTryAgain}>RETRY FIELD</button>
            )}
          </div>
        )}
      </div>

      {activeOverlay === 'guide' && (
        <div className="mining-guide-dock" role="region" aria-label="Mining controls">
          <div className="mining-guide-top">
            <button type="button" className="mining-guide-x" aria-label="Close" onClick={() => setGuideOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4 4 L14 14 M14 4 L4 14" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
          <div className="mining-guide-scroll">
            <div className="mining-guide-column">
              {miningGuide(!!deliveryTargetName).map(item => (
                <article key={item.label} className="mining-guide-card">
                  <GuideMark kind={item.kind} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="mining-guide-actions">
            <div className="mining-guide-column">
              <button type="button" className="mining-guide-close" data-testid="mining-overflow-recharge-btn" disabled={laserCharges >= MAX_CHARGES} onClick={() => { setGuideOpen(false); handleRecharge() }}>
                {rechargePrice > 0 ? `Recharge Laser · ${rechargePrice} fr` : 'Recharge Laser'}
              </button>
              {onAbandon && (
                <button type="button" className="mining-guide-close mining-guide-scrub" data-testid="mining-scrub-btn" onClick={() => { setGuideOpen(false); setConfirmingAbandon(true) }}>
                  Scrub Mission
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {trainingMiningTry && (
        <p className="laser-cue" data-testid="mining-training-tip">Fire when ore crosses the beam</p>
      )}
      <div className="laser-hud" data-testid="mining-controls">
        {/* SSL-411: the stat row is gone. Per-mineral progress is kept for
            assistive tech; charges live inside FIRE LASER and order progress
            inside the return button. */}
        <span className="ln-sr-only" data-testid="mining-order-readout">
          {Object.entries(mission.requires.minerals).map(([id, amount]) =>
            `${minerals[id]?.name ?? id}: ${Math.min(cargo[id] ?? 0, amount)} of ${amount} collected. `).join('')}
        </span>

        {remoteSiloAvailable && (isFreeOps || orderFilled || laserCharges <= 0) && (
          <Panel accent="var(--ln-cyan)" surface="glass" style={{ marginBottom: 8, padding: 10 }}>
            <div style={{ font: '800 14px var(--ln-font-display)', letterSpacing: '0.16em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>Arrival settlement</div>
            <div style={{ font: '14px var(--ln-font-body)', color: 'var(--ln-text-dim)', lineHeight: 1.4, marginTop: 4 }}>
              Remote Mineral Silo online · {remoteSiloUsed} / {REMOTE_MINERAL_SILO_CAPACITY} U. Choose where this haul goes before the return leg.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => setRemoteDisposition('store')} style={{ padding: '8px 6px', borderRadius: 6, border: `1px solid ${remoteDisposition === 'store' ? 'var(--ln-cyan)' : 'var(--ln-hairline)'}`, background: remoteDisposition === 'store' ? 'var(--ln-cyan-soft)' : 'transparent', color: 'var(--ln-text)', font: '700 14px var(--ln-font-display)' }}>PLACE IN SILO</button>
              <button type="button" onClick={() => setRemoteDisposition('sell')} style={{ padding: '8px 6px', borderRadius: 6, border: `1px solid ${remoteDisposition === 'sell' ? 'var(--ln-amber)' : 'var(--ln-hairline)'}`, background: remoteDisposition === 'sell' ? 'var(--ln-amber-soft)' : 'transparent', color: 'var(--ln-text)', font: '700 14px var(--ln-font-display)' }}>SELL AT MARKET</button>
            </div>
          </Panel>
        )}

        <BaseDock
          variant="flight"
          buildLabel={laserCharges <= 0 ? 'Depleted' : isCharging ? 'Charging' : 'Fire'}
          buildTestId="fire-laser-btn"
          buildBeacon="mining-fire-laser"
          buildDisabled={gateOpen || sceneStatus !== 'ready' || laserCharges <= 0}
          buildCharging={isCharging}
          buildIcon={(
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M13 2 L4 14 h7 l-1 8 10-14 h-7 l0-6 z" />
            </svg>
          )}
          onPrev={() => nudge(-1)}
          onNext={() => nudge(1)}
          onBuild={event => { if (!event || event.detail === 0) fireLaser() }}
          onBuildPointerDown={event => { if (event.button === 0) beginFireHold() }}
          onBuildPointerUp={endFireHold}
          onBuildPointerLeave={endFireHold}
          onBuildPointerCancel={endFireHold}
          onHub={() => onBack(cargoRef.current, laserChargesRef.current)}
        />
        {isFreeOps && freeOpsDebrisReadout ? <span className="laser-dock__debris" data-testid="freeops-event-debris">{freeOpsDebrisReadout}</span> : null}
      </div>

      {confirmingRecharge && (
        <ActionConfirmBar
          eyebrow="Laser"
          title="Recharge Laser"
          description={rechargePrice > 0 ? `Refill to ${MAX_CHARGES} charges for ${rechargePrice} fr. Balance ${francs} fr, ${francs - rechargePrice} fr after. Your cargo is kept.` : `Refill to ${MAX_CHARGES} charges. Your cargo is kept.`}
          confirmLabel={rechargePrice > 0 ? `Pay ${rechargePrice} fr` : 'Recharge'}
          onConfirm={confirmRecharge}
          onDismiss={() => setConfirmingRecharge(false)}
        />
      )}

      {confirmingAbandon && onAbandon && (
        <ActionConfirmBar
          eyebrow="Laser"
          title="Scrub Mission"
          description={`Abandon this run? ${totalCollected} of ${totalNeeded} units collected will be lost.`}
          confirmLabel="Confirm Scrub"
          onConfirm={() => { setConfirmingAbandon(false); onAbandon() }}
          onDismiss={() => setConfirmingAbandon(false)}
        />
      )}
    </div>
  )
}
