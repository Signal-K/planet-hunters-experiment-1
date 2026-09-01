'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Mission, Target, MineralMeta } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import IconBadge from '@/components/ui/IconBadge'
import SegmentedBar from '@/components/ui/SegmentedBar'
import ActionConfirmBar from '@/components/game/ActionConfirmBar'
import MiningCanvas from './MiningCanvas'

// Out There: Omega Edition bolt glyph — used inside the charge-meter IconBadge.
// Kept local since it's a one-off HUD glyph, not a shared icon set yet.
function LaserBoltIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
    </svg>
  )
}

// Fixed pip counts for the HUD segmented bars — decoupled from MAX_CHARGES /
// totalNeeded so the bar reads as a clean meter instead of one pip per unit
// (which would sprawl to 30+ pips on post-onboarding runs).
const CHARGE_SEGMENTS = 10
const ORDER_SEGMENTS = 12

// First-time-entering-Free-Ops-mining explainer — dismiss-once, same
// localStorage-ack pattern as MissionBoardScreen's EXPLAINER_ACK_KEY, but
// scoped to the mining screen itself. The board explainer covers the board's
// client/infrastructure/custom split; this covers what changes once
// you're actually mining with no client attached (sell the haul yourself,
// no daily limit) — the two are different moments and were previously
// conflated, leaving the mining screen with zero "no client" first-entry cue.
const FREE_OPS_MINING_ACK_KEY = 'ln_mining_freeops_first_entry_ack'
const FREE_OPS_FIRST_SUCCESS_ACK_KEY = 'ln_mining_freeops_first_success_ack'

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

function OreShapeIcon({ id, color, size = 14, minerals }: { id: string; color: string; size?: number; minerals: Record<string, MineralMeta> }) {
  const shape = minerals[id]?.shape ?? 'circle'
  if (shape === 'diamond')
    return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><polygon points="7,1 13,7 7,13 1,7" fill={color} /></svg>
  if (shape === 'rect')
    return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="3" width="10" height="8" rx="1" fill={color} /></svg>
  if (shape === 'triangle')
    return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><polygon points="7,1 13,13 1,13" fill={color} /></svg>
  return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill={color} /></svg>
}

// Horizontal drag track — left = slow, center = normal, right = fast forward
// Thumb snaps back to center on release
function ScrollTrack({ scrollRef }: { scrollRef: React.MutableRefObject<((dx: number) => void) | null> }) {
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
        fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
        letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        SCROLL
      </div>
      <div
        ref={trackRef}
        style={{
          position: 'relative', flex: 1, height: 36, borderRadius: 8,
          background: 'var(--ln-mining-control-fill)',
          border: `1px solid ${active ? 'var(--ln-cyan-border)' : 'var(--ln-hairline)'}`,
          cursor: 'pointer', touchAction: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 120ms',
        }}
        onPointerDown={e => {
          setActive(true)
          e.currentTarget.setPointerCapture(e.pointerId)
          applyAt(e.clientX)
        }}
        onPointerMove={e => { if (active) applyAt(e.clientX) }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {/* End labels */}
        <span style={{ position: 'absolute', left: 6, fontSize: 9, color: 'var(--ln-text-muted)', lineHeight: 1 }}>◀</span>
        <span style={{ position: 'absolute', right: 6, fontSize: 9, color: 'var(--ln-text-muted)', lineHeight: 1 }}>▶</span>
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
    { label: 'SCROLL', desc: 'Drag the scroll track left to slow down, right to fast-forward camera movement.' },
    { label: 'INVENTORY', desc: 'Shows collected vs. required per mineral. Fill all slots to unlock return.' },
    { label: 'MISSION GOALS', desc: 'Combined ore progress and value context for the current contract.' },
    deliveryTargetName
      ? { label: 'DELIVER CARGO', desc: `Head to ${deliveryTargetName} to drop off this cargo. Payout is unlocked after delivery.` }
      : { label: 'RETURN HOME', desc: 'Return to Earth for recovery and ship destruction. Payout is unlocked after landing.' },
  ]
}

export default function MiningScreen({ mission, target, onComplete, onBack, onAbandon, minerals, laserChargeCap, laserTier, hasCoach, coachManual, onCoachDone, addToast, deliveryTargetName, hasPriorFreeOpsExperience, initialCargo }: {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  /** Called with whatever's been collected so far (may be empty) — the caller is responsible for persisting it so a later resume doesn't lose progress. */
  onBack: (cargo: Record<string, number>) => void
  onAbandon?: () => void
  minerals: Record<string, MineralMeta>
  laserChargeCap?: number
  /** Equipped drill/laser part tier (1-3). Gates how deep ore is reachable — deeper veins tease an upgrade. */
  laserTier?: number
  hasCoach?: boolean
  coachManual?: boolean
  onCoachDone?: () => void
  /** Transient Temple-Run-style hints ("Nice shot!", "You don't need that yet") — tutorial-scoped, not the persistent coach banner. */
  addToast?: (message: string, kind?: 'info' | 'ok' | 'warn') => void
  /** Set for two-leg "mine then deliver" missions (mission.deliveryTargetId) — swaps the return button's copy from "Return to Earth" to "Deliver to {name}" since the ship isn't heading home yet. */
  deliveryTargetName?: string
  /** True once the player has completed any client mission — suppresses the Free Ops first-entry explainer for players who reached self-directed mining before this ack tracking existed. */
  hasPriorFreeOpsExperience?: boolean
  /** Cargo already collected before a prior "Back to hub" pause on this same mission, restored so the player doesn't lose it on resume. */
  initialCargo?: Record<string, number>
}) {
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
  // order fell meaningfully short of 5 on a below-average run, and every failed attempt wipes
  // cargo via handleTryAgain (no partial credit), so a player could cycle failed attempts
  // indefinitely without ever clearing the order. Confirmed live: a 5-platinum starter-bulk
  // order on Eros stayed at 0/5 after 9000+ simulated shots (~6 real minutes) at the old budget.
  // 16x/80 gives ~2.7x the prior margin; still finite, not a difficulty-removing bump.
  // Post-onboarding: respect laserChargeCap from skill nodes, but never let it drop below
  // 4× the ore required — laserChargeCap is a flat 5-7 from skill nodes regardless of mission
  // size, so a harder Free Ops order (e.g. 8 units of one mineral) could demand more hits than
  // the skill-based cap could ever supply, making the mission mathematically unwinnable.
  const totalOreNeeded = Object.values(mission.requires.minerals).reduce((sum, v) => sum + v, 0)
  const isOnboarding = typeof mission.sequence === 'number' && mission.sequence <= FREE_OPS_START_MISSIONS_DONE
  const MAX_CHARGES = isOnboarding
    ? Math.max(80, totalOreNeeded * 16)
    : Math.max(laserChargeCap ?? 5, totalOreNeeded * 4)
  const LOW_CHARGE_THRESHOLD = Math.max(2, Math.ceil(MAX_CHARGES * 0.2))
  const cargoRef = useRef<Record<string, number>>(initialCargo ?? {})
  const [cargo, setCargo] = useState<Record<string, number>>(initialCargo ?? {})
  const fireRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<((dx: number) => void) | null>(null)
  const [laserCharges, setLaserCharges] = useState(MAX_CHARGES)
  const [runKey, setRunKey] = useState(0)  // bump to reset MiningCanvas
  const firedRef = useRef(false)
  const hintedFirstHitRef = useRef(false)
  const hintedWrongOreRef = useRef(false)
  const hintedOrderFilledRef = useRef(false)
  const oreNearRef = useRef<((near: boolean) => void) | null>(null)
  const [oreNear, setOreNear] = useState(false)
  oreNearRef.current = (near: boolean) => setOreNear(near)

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

  // Charges depleted without filling the order — always show recovery options, not just during coaching
  const runFailed = laserCharges === 0 && !orderFilled
  const chargesLow = !orderFilled && laserCharges > 0 && laserCharges <= LOW_CHARGE_THRESHOLD

  function handleTryAgain() {
    cargoRef.current = {}
    setCargo({})
    setLaserCharges(MAX_CHARGES)
    firedRef.current = false
    setRunKey(k => k + 1)
  }

  const collectMineral = useCallback((mineral: string) => {
    cargoRef.current = {
      ...cargoRef.current,
      [mineral]: (cargoRef.current[mineral] ?? 0) + 1,
    }
    setCargo(cargoRef.current)

    // Temple-Run-style transient hints — tutorial-scoped, separate from the
    // persistent coach banner. Each fires at most once per run.
    if (hasCoach && addToast) {
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
  }, [hasCoach, addToast, mission.requires.minerals, minerals])

  function fireLaser() {
    if (laserCharges <= 0) return
    setLaserCharges(c => c - 1)
    fireRef.current?.()
    if (!firedRef.current && coachManual) {
      firedRef.current = true
      onCoachDone?.()
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'KeyF') {
        e.preventDefault()
        fireLaser()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laserCharges])

  function handleReturn() {
    if (orderFilled || laserCharges <= 0) onComplete(cargoRef.current)
  }

  // Local-dev-only shortcut: fills the order instantly so testing later
  // screens doesn't require playing the mining minigame by hand each time.
  function handleDevSkip() {
    cargoRef.current = { ...mission.requires.minerals }
    onComplete(cargoRef.current)
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

  const isFreeOps = !mission.client
  const { show: showFreeOpsMiningExplainer, dismiss: dismissFreeOpsMiningExplainer } = useFreeOpsMiningAck(!isFreeOps || !!hasPriorFreeOpsExperience)
  const { dismissed: freeOpsFirstSuccessDismissed, dismiss: dismissFreeOpsFirstSuccess } = useFreeOpsFirstSuccessAck()
  const showFreeOpsSuccessPopup = isFreeOps && orderFilled && !freeOpsFirstSuccessDismissed

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
    <div className="game-screen mining-screen theme-deep">
      <TopBar
        eyebrow={`${target.name.toUpperCase()} · SURFACE`}
        title="Mining Run"
        onBack={() => onBack(cargoRef.current)}
        glass
        right={isFreeOps ? <StatusPill kind="amber">Free Ops · No Client</StatusPill> : undefined}
      />

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
                color: 'var(--ln-amber)', fontSize: 12, lineHeight: 1, cursor: 'pointer',
              }}
            >
              ×
            </button>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 6 }}>
              No Client On This Run
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.45, paddingRight: 20 }}>
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
            position: 'absolute', top: 8, right: 8, zIndex: 999,
            padding: '3px 8px',
            background: 'var(--ln-bp-paper)',
            border: '1px solid var(--ln-bp-green)',
            borderRadius: 6,
            color: 'var(--ln-bp-green)',
            fontFamily: 'var(--ln-font-mono)',
            fontSize: 10,
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
          Sits left of the dev-only Skip Mining button so the two never overlap. */}
      <button
        data-testid="mining-guide-btn"
        onClick={() => setGuideOpen(o => !o)}
        aria-label="Mining controls guide"
        aria-expanded={guideOpen}
        style={{
          position: 'absolute',
          top: 8,
          right: process.env.NODE_ENV === 'development' ? 92 : 8,
          zIndex: 90,
          width: 24,
          height: 24,
          padding: 0,
          borderRadius: 6,
          border: '1px solid var(--ln-cyan-border)',
          background: 'var(--ln-cyan-soft)',
          color: 'var(--ln-cyan)',
          fontFamily: 'var(--ln-font-display)',
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1,
          cursor: 'pointer',
          opacity: 0.85,
        }}
      >
        ?
      </button>

      {activeOverlay === 'guide' && (
        <aside className="mining-guide-overlay" aria-label="Mining controls" style={{ position: 'absolute', right: 16, bottom: 'calc(var(--ln-nav-h, 64px) + 16px)', zIndex: 70, width: 'min(360px, calc(100% - 32px))' }}>
          <div className="mining-guide-panel">
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 10 }}>Mining Controls</div>
            {miningGuide(deliveryTargetName).map(item => (
              <div key={item.label} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--ln-cyan)', whiteSpace: 'nowrap', minWidth: 90 }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.4 }}>{item.desc}</span>
              </div>
            ))}
            <button className="mining-guide-close" onClick={() => setGuideOpen(false)}>Close</button>
          </div>
        </aside>
      )}

      {activeOverlay === 'success' && (
        <div className="mining-success-overlay" data-testid="freeops-first-success-popup" style={{ position: 'absolute', inset: 0, zIndex: 75, display: 'flex', alignItems: 'flex-end', padding: 16 }}>
          <Panel className="mining-success-panel" accent="var(--ln-ok)" surface="glass" style={{ padding: 14, width: '100%' }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-ok)', textTransform: 'uppercase', marginBottom: 6 }}>
              First Free Ops Haul Secured
            </div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', lineHeight: 1.45 }}>
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
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-crit)', textTransform: 'uppercase' }}>Laser Depleted</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800, color: 'var(--ln-text)', textAlign: 'center', lineHeight: 1.2 }}>Order Not Filled</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
            {totalCollected}/{totalNeeded} units collected. Fire at ore veins — each shot must hit a deposit.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280, marginTop: 8 }}>
            <button className="mining-failure-retry" onClick={handleTryAgain}>
              Try Again
            </button>
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
        <div className="mining-charge-warning" style={{ position: 'absolute', top: hasCoach ? (coachManual ? 'var(--tutorial-manual-content-top)' : 'var(--tutorial-content-top)') : 56, left: 0, right: 0, zIndex: 40, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div>
            {laserCharges} charge{laserCharges !== 1 ? 's' : ''} remaining — order not filled
          </div>
        </div>
      )}

      <div className="mining-viewport">
        <div className="mining-stars" />
        <MiningCanvas
          key={runKey}
          minerals={depositMinerals}
          requiredMinerals={Object.keys(mission.requires.minerals)}
          mineralMeta={minerals}
          laserTier={laserTier}
          onCollect={collectMineral}
          fireRef={fireRef}
          scrollRef={scrollRef}
          oreNearRef={oreNearRef}
          neededMineralsRef={neededMineralsRef}
        />
      </div>

      <div className="mining-controls">
        {/* Caption — clarifies the fractions below are mission-order fulfillment, not cargo capacity */}
        <div style={{
          fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ln-text-muted)',
          marginBottom: 4,
        }}>
          Order Progress
        </div>

        {/* ── Stats + charge strip ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 28, flexWrap: 'wrap' }}>
          {/* Mineral counts — bordered icon-badge tile per Out There: Omega icon language */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            {Object.entries(mission.requires.minerals).map(([id, amount]) => {
              const collected = Math.min(cargo[id] ?? 0, amount)
              const done = collected >= amount
              const color = minerals[id]?.color ?? '#fff'
              const badgeColor = done ? 'var(--ln-text-muted)' : color
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* The shape glyph is aria-hidden and the name/fraction are
                      separate spans, so AT would otherwise announce a bare
                      "PLATINUM 2 / 5". One sentence carries the whole readout;
                      the visual fragments are hidden from AT to avoid a double
                      announcement. */}
                  <span className="ln-sr-only">
                    {`${minerals[id]?.name ?? id}: ${collected} of ${amount} collected`}
                  </span>
                  <span aria-hidden="true" style={{ display: 'contents' }}>
                    <IconBadge
                      size={20}
                      icon={<OreShapeIcon id={id} color={badgeColor} size={11} minerals={minerals} />}
                      active={!done}
                      style={{ borderColor: badgeColor, boxShadow: 'none' }}
                    />
                    <span style={{
                      fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: badgeColor,
                    }}>
                      {minerals[id]?.name ?? id}
                    </span>
                    <span style={{
                      fontFamily: 'var(--ln-font-mono)', fontSize: 10,
                      color: done ? 'var(--ln-text-muted)' : 'var(--ln-text)',
                    }}>
                      {collected}/{amount}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
          {/* Total */}
          <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-cyan-bright)', flexShrink: 0 }}>
            {totalCollected}/{totalNeeded}
          </span>
          {/* Charge meter — bordered laser badge + segmented bar, Out There: Omega chrome */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <IconBadge size={20} icon={<LaserBoltIcon size={11} />} tone="cyan" active={laserCharges > 0} />
            <SegmentedBar
              segments={CHARGE_SEGMENTS}
              filled={(laserCharges / MAX_CHARGES) * CHARGE_SEGMENTS}
              tone={laserCharges > 0 ? 'cyan' : 'crit'}
              height={7}
              style={{ width: 60 }}
            />
            <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9.5, color: 'var(--ln-text-dim)' }}>
              {laserCharges}/{MAX_CHARGES}
            </span>
          </div>
        </div>

        {/* Order progress — segmented bar, Out There: Omega chrome */}
        <SegmentedBar
          segments={ORDER_SEGMENTS}
          filled={(totalCollected / totalNeeded) * ORDER_SEGMENTS}
          tone="cyan"
          height={6}
          style={{ marginTop: 6, marginBottom: 6 }}
        />

        {/* ── Action row: Fire · Fill/Return · Scroll ───────────────────────── */}
        {/* minWidth: 0 on every grid item overrides <button>'s default
            min-width:auto (sized to its longest unbreakable word) — without
            it, "FILL ORDER TO RETURN"/"DELIVER TO <target>" refuses to
            shrink below its own min-content width and the row overflows
            past the container on narrow mobile viewports, pushing
            ScrollTrack half off-screen instead of the whole row fitting. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8, alignItems: 'stretch', minWidth: 0 }}>
          <div
            data-ore-near={oreNear}
            style={{
              minWidth: 0,
              borderRadius: 10,
              boxShadow: hasCoach && oreNear
                ? '0 0 0 2px rgba(112,217,234,0.7), 0 0 18px rgba(112,217,234,0.35)'
                : 'none',
              animation: hasCoach && oreNear ? 'ln-pulse 0.75s ease-in-out infinite' : 'none',
              transition: 'box-shadow 150ms',
            }}>
          <button
            className="mining-command mining-command--fire"
            type="button"
            disabled={laserCharges <= 0}
            data-testid="fire-laser-btn"
            onClick={fireLaser}
          >
            {laserCharges > 0 ? 'FIRE LASER' : 'DEPLETED'}
          </button>
          </div>
          <div style={{ minWidth: 0 }}>
          <button
            className="mining-command mining-command--return"
            type="button"
            disabled={!orderFilled && laserCharges > 0}
            data-testid="return-home-btn"
            onClick={handleReturn}
          >
            {(() => {
              const destination = deliveryTargetName ? `DELIVER TO ${deliveryTargetName.toUpperCase()}` : 'RETURN TO EARTH'
              return orderFilled || laserCharges <= 0 ? destination : `FILL ORDER TO ${deliveryTargetName ? 'DELIVER' : 'RETURN'}`
            })()}
          </button>
          </div>
          <div style={{ minWidth: 0 }}>
            <ScrollTrack scrollRef={scrollRef} />
          </div>
        </div>
      </div>

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
