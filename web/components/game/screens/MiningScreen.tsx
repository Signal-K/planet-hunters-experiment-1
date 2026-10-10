'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Mission, Target, MineralMeta } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE, REMOTE_MINERAL_SILO_CAPACITY } from '@/lib/data'
import { miningNeedsRecharge, unitsStillNeeded, rechargeCost } from '@/lib/systems/mining-charges'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import MiningCanvas from './MiningCanvas'
import SkyEventChip from '@/components/game/SkyEventChip'
import { useDebrisEvent } from '@/lib/hooks/useDebrisEvent'
import { DEBRIS_RESOURCE_IDS } from '@/lib/data/sky-events'

// Out There: Omega Edition bolt glyph — used inside the charge-meter IconBadge.
// Kept local since it's a one-off HUD glyph, not a shared icon set yet.
function LaserBoltIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
    </svg>
  )
}

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
function ScrollTrack({ scrollRef, disabled = false }: { scrollRef: React.MutableRefObject<((dx: number) => void) | null>; disabled?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(0.5)   // 0..1, 0.5 = center = normal speed
  const [active, setActive] = useState(false)

  const applyAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setPos(p)
    scrollRef.current?.(p * 2 - 1)  // maps 0..1 → -1..1
  }

  const release = () => {
    setActive(false)
    setPos(0.5)
    scrollRef.current?.(0)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
        letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        SCROLL
      </div>
      <div
        ref={trackRef}
        style={{
          position: 'relative', flex: 1, height: 44, borderRadius: 8,
          background: 'var(--ln-mining-control-fill)',
          border: `1px solid ${active ? 'var(--ln-cyan-border)' : 'var(--ln-hairline)'}`,
          cursor: disabled ? 'not-allowed' : 'pointer', touchAction: 'none',
          opacity: disabled ? 0.52 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 120ms',
        }}
        onPointerDown={e => {
          if (disabled) return
          setActive(true)
          e.currentTarget.setPointerCapture(e.pointerId)
          applyAt(e.clientX)
        }}
        onPointerMove={e => { if (!disabled && active) applyAt(e.clientX) }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {/* End labels */}
        <span style={{ position: 'absolute', left: 6, fontSize: 14, color: 'var(--ln-text-muted)', lineHeight: 1 }}>◀</span>
        <span style={{ position: 'absolute', right: 6, fontSize: 14, color: 'var(--ln-text-muted)', lineHeight: 1 }}>▶</span>
        {/* Center tick */}
        <div style={{ position: 'absolute', top: '30%', bottom: '30%', left: '50%', width: 1, background: 'var(--ln-divider)' }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `calc(${pos * 100}% - 10px)`,
          width: 20, height: 20, borderRadius: '50%',
          background: active ? 'var(--ln-cyan)' : 'var(--ln-cyan-soft)',
          border: `1.5px solid ${active ? 'var(--ln-cyan)' : 'var(--ln-cyan-border)'}`,
          boxShadow: active ? 'var(--ln-glow-cyan)' : 'none',
          transition: active ? 'background 80ms, border-color 80ms, box-shadow 80ms' : 'left 180ms ease-out, background 120ms, border-color 120ms, box-shadow 120ms',
        }} />
      </div>
    </div>
  )
}

function miningGuide(deliveryTargetName?: string) {
  return [
    { label: 'FIRE LASER', desc: 'Fires your mining laser at the asteroid. Collect ore by hitting ore veins (Space/F).' },
    { label: 'CHARGE METER', desc: 'Printed inside FIRE LASER, showing how many shots you have left. Runs out and the order isn\'t filled, the run fails.' },
    { label: 'ORDER PROGRESS', desc: 'Printed inside the return button with a fill bar, showing how much of this order you\'ve mined so far.' },
    { label: 'SCROLL', desc: 'Drag the field left to speed up or right to slow down. The more menu also has a scroll track and Scrub Mission.' },
    { label: 'INVENTORY', desc: 'Shows collected vs. required per mineral. Fill all slots to unlock return.' },
    { label: 'MISSION GOALS', desc: 'Combined ore progress and value context for the current contract.' },
    deliveryTargetName
      ? { label: 'DELIVER CARGO', desc: `Head to ${deliveryTargetName} to drop off this cargo. Payout is unlocked after delivery.` }
      : { label: 'RETURN HOME', desc: 'Return to Earth for recovery and ship destruction. Payout is unlocked after landing.' },
  ]
}

export default function MiningScreen({ mission, target, rocketImageSrc, onComplete, onBack, onAbandon, minerals, laserChargeCap, laserBonusCharges = 0, laserTier, trainingMiningTry = false, addToast, deliveryTargetName, hasPriorFreeOpsExperience, initialCargo, initialCharges, francs = 0, onSpendFrancs, remoteSiloAvailable, remoteSiloUsed = 0, isFreeHaulEligible, hasEarthStorage, initialEarthDisposition, onDebrisMined, orionidsBadgeTier = null }: {
  mission: Mission
  target: Target
  rocketImageSrc?: string
  onComplete: (cargo: Record<string, number>, remoteDisposition?: 'store' | 'sell', earthDisposition?: 'store' | 'sell') => void
  /** Called with whatever's been collected so far (may be empty) — the caller is responsible for persisting it so a later resume doesn't lose progress. */
  onBack: (cargo: Record<string, number>, laserCharges: number) => void
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
        addToast('Order filled — tap RETURN', 'ok')
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
  const [overflowOpen, setOverflowOpen] = useState(false)

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

  return (
    <div className="game-screen mining-screen theme-blueprint" data-training-active={trainingMiningTry ? 'true' : 'false'}>
      <TopBar
        eyebrow={`${target.name.toUpperCase()} · SURFACE`}
        title="Mining Run"
        onBack={() => onBack(cargoRef.current, laserChargesRef.current)}
        glass
        right={isFreeOps ? <StatusPill kind="amber">Free Ops · No Client</StatusPill> : undefined}
      />

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

      {process.env.NODE_ENV === 'development' && (
        <button
          data-testid="dev-skip-mining-btn"
          onClick={handleDevSkip}
          style={{
            position: 'absolute', top: 58, right: 8, zIndex: 999,
            padding: '3px 8px',
            background: 'var(--ln-bp-paper)',
            border: '1px solid var(--ln-bp-green)',
            borderRadius: 6,
            color: 'var(--ln-bp-green)',
            fontFamily: 'var(--ln-font-mono)',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            opacity: 0.8,
          }}
        >
            SKIP MINING
        </button>
      )}

      {/* KES-282: moved out of the always-visible stats row (which was competing
          with the mineral/charge readout for attention) into a small standalone
          corner control — same button, same testid/behavior, lower prominence.
          The dev-only Skip Mining button sits below it so the two never overlap. */}
      <button
        data-testid="mining-guide-btn"
        onClick={() => setGuideOpen(o => !o)}
        aria-label="Mining controls guide"
        aria-expanded={guideOpen}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 90,
          width: 44,
          height: 44,
          padding: 0,
          borderRadius: 8,
          border: '2px solid var(--ln-bp-ink, #0f2436)',
          background: 'var(--ln-bp-paper, #fff)',
          color: 'var(--ln-bp-ink, #0f2436)',
          boxShadow: '2px 2px 0 var(--ln-bp-blue, #42a6df)',
          fontFamily: 'var(--ln-font-display)',
          fontSize: 16,
          fontWeight: 800,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ?
      </button>

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
      <div className="mining-stage">
      <div className="mining-viewport">
        <div className="mining-stars" />
        <MiningCanvas
          key={runKey}
          rocketImageSrc={rocketImageSrc}
          minerals={depositMinerals}
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
        <aside className="mining-guide-dock" aria-label="Mining controls">
          <Panel className="mining-guide-panel" accent="var(--ln-cyan)" surface="glass" style={{ padding: 12 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 10 }}>Mining Controls</div>
            {miningGuide(deliveryTargetName).map(item => (
              <div key={item.label} className="mining-guide-row">
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </div>
            ))}
            <button
              className="mining-guide-close"
              onClick={() => setGuideOpen(false)}
            >
              Close
            </button>
          </Panel>
        </aside>
      )}
      </div>

      <div className="mining-controls" data-testid="mining-controls">
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

        {/* ── Action row: Fire · Fill/Return · overflow ─────────────────────── */}
        <div className="mining-action-row" data-ore-near={oreNear}>
          <button
            className={[
              'mining-command mining-command--fire',
              isCharging && 'mining-command--charging',
              tapDenied && 'mining-command--tap-denied',
            ].filter(Boolean).join(' ')}
            type="button"
            disabled={gateOpen || sceneStatus !== 'ready' || laserCharges <= 0}
            data-testid="fire-laser-btn"
            data-beacon="mining-fire-laser"
            data-charging={isCharging}
            onPointerDown={e => { if (e.button === 0) beginFireHold() }}
            onPointerUp={endFireHold}
            onPointerLeave={endFireHold}
            onPointerCancel={endFireHold}
            onClick={e => { if (e.detail === 0) fireLaser() }}
          >
            <span className="mining-command__label">{laserCharges <= 0 ? 'DEPLETED' : isCharging ? 'CHARGING' : 'FIRE LASER'}</span>
            <span className="mining-command__meta" data-testid="mining-charges">
              <LaserBoltIcon size={11} /> {laserCharges}/{MAX_CHARGES} charges
            </span>
          </button>
          <button
            className="mining-command mining-command--return"
            type="button"
            aria-disabled={(!orderFilled && laserCharges > 0 && !needsRecharge) || undefined}
            data-testid="return-home-btn"
            data-mode={!isFreeOps && needsRecharge && !orderFilled ? 'recharge' : 'return'}
            onClick={!isFreeOps && needsRecharge && !orderFilled ? handleRecharge : handleReturn}
          >
            <span className="mining-command__label">
              {(() => {
                const destination = deliveryTargetName ? `DELIVER TO ${deliveryTargetName.toUpperCase()}` : 'RETURN TO EARTH'
                if (!isFreeOps && needsRecharge && !orderFilled) return rechargePrice > 0 ? `RECHARGE LASER · ${rechargePrice} FR` : 'RECHARGE LASER'
                return isFreeOps || orderFilled || laserCharges <= 0 ? destination : `FILL ORDER TO ${deliveryTargetName ? 'DELIVER' : 'RETURN'}`
              })()}
            </span>
            <span className="mining-command__meta" data-testid={isFreeOps ? 'freeops-cargo-progress' : 'mining-order-progress'}>{isFreeOps ? `Cargo collected ${freeOpsCargoUnits} U` : `Order ${totalCollected}/${totalNeeded}`}</span>
            {isFreeOps && freeOpsDebrisReadout && <span className="mining-command__meta" data-testid="freeops-event-debris">{freeOpsDebrisReadout}</span>}
            <span className="mining-command__fill" aria-hidden="true">
              <span style={{ width: `${isFreeOps ? Math.min(100, freeOpsCargoUnits * 10) : totalNeeded > 0 ? Math.min(100, (totalCollected / totalNeeded) * 100) : 0}%` }} />
            </span>
          </button>
          <div className="mining-overflow">
            <button
              type="button"
              className="mining-overflow__btn"
              data-testid="mining-overflow-btn"
              aria-label="More controls"
              aria-expanded={overflowOpen}
              onClick={() => setOverflowOpen(o => !o)}
            >
              {'\u22EF'}
            </button>
            {overflowOpen && (
              <div className="mining-overflow__menu" data-testid="mining-overflow-menu" role="group" aria-label="More controls">
                <ScrollTrack scrollRef={scrollRef} disabled={sceneStatus !== 'ready'} />
                <button type="button" className="mining-overflow__scrub" data-testid="mining-overflow-recharge-btn" disabled={laserCharges >= MAX_CHARGES} onClick={() => { setOverflowOpen(false); handleRecharge() }}>
                  {rechargeLabel}
                </button>
                {onAbandon && (
                  <button type="button" className="mining-overflow__scrub" data-testid="mining-scrub-btn" onClick={() => { setOverflowOpen(false); setConfirmingAbandon(true) }}>
                    Scrub Mission
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmingRecharge && (
        <ActionConfirmBar
          eyebrow="Mining Run"
          title="Recharge Laser"
          description={rechargePrice > 0 ? `Refill to ${MAX_CHARGES} charges for ${rechargePrice} fr. Balance ${francs} fr, ${francs - rechargePrice} fr after. Your cargo is kept.` : `Refill to ${MAX_CHARGES} charges. Your cargo is kept.`}
          confirmLabel={rechargePrice > 0 ? `Pay ${rechargePrice} fr` : 'Recharge'}
          onConfirm={confirmRecharge}
          onDismiss={() => setConfirmingRecharge(false)}
        />
      )}

      {confirmingAbandon && onAbandon && (
        <ActionConfirmBar
          eyebrow="Mining Run"
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
