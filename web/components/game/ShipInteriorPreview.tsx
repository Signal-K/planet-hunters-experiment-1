'use client'

import { useState } from 'react'
import { ShipCustomizerCanvas } from '@/components/game/ShipCustomizerCanvas'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import {
  calculateShipSuccessChance,
  canConfirmCustomizerBuild,
  chooseCustomizerPart,
  confirmCustomizerBuild,
  createCustomizerBuildState,
  customizerPartById,
  getBuildSequence,
  getShipInteriorLayout,
  partsForKind,
  refundCustomizerPart,
  selectedCustomizerPartIds,
} from '@/lib/data'
import type { CustomizerPart, InstalledCustomizerPartsByKind, ShipRoomKind } from '@/lib/data'
import { formatCurrency } from '@/lib/format'

interface ShipInteriorPreviewProps {
  rocketId: string
  startingFrancs?: number
  missionsDone?: number
  installedParts?: InstalledCustomizerPartsByKind
  onConfirm?: (installed: InstalledCustomizerPartsByKind, prevInstalled: InstalledCustomizerPartsByKind) => boolean
  onClose?: () => void
  crewModuleResearched?: boolean
  landingResearched?: boolean
}

interface BuildStep {
  kind: ShipRoomKind
  title: string
  body: string
}

const STEP_DETAILS: Record<ShipRoomKind, Omit<BuildStep, 'kind'>> = {
  engine:        { title: 'Engine / Thrusters',  body: 'Sets reach, thrust margin, and base launch reliability.' },
  booster:       { title: 'Boosters',             body: 'Adds ascent force so the rocket clears atmosphere with heavier modules.' },
  cockpit:       { title: 'Command',              body: 'Adds guidance, navigation, comms, and launch authority.' },
  payload:       { title: 'Payload',              body: 'Defines what this rocket can actually do on mission.' },
  'fuel-stage':  { title: 'Propellant Stage',     body: 'Sets total delta-v and burn duration. Required for orbital insertion.' },
  fairing:       { title: 'Payload Fairing',      body: 'Nose cone protects cargo during ascent. Jettisoned at separation altitude.' },
  'docking-port':{ title: 'Docking Port',         body: 'Enables cargo transfer at orbital stations or relay depots.' },
  'heat-shield': { title: 'Re-entry Shield',      body: 'Protects the return vehicle and payload during atmospheric deceleration.' },
  'crew-module': { title: 'Crew Quarters',         body: 'Adds two pressurised seats for qualified astronauts on larger hulls.' },
  lander:        { title: 'Lander Module',         body: 'Detaches to descend and land on a target, then re-docks with the ship in orbit.' },
}

export default function ShipInteriorPreview({
  rocketId,
  startingFrancs = 30_000_000,
  missionsDone = 0,
  installedParts,
  onConfirm,
  onClose,
  crewModuleResearched = false,
  landingResearched = false,
}: ShipInteriorPreviewProps) {
  const layout = getShipInteriorLayout(rocketId)
  const [buildState, setBuildState] = useState(() => ({
    ...createCustomizerBuildState(startingFrancs),
    installed: installedParts ?? {},
  }))
  const [stepIndex, setStepIndex] = useState(0)
  if (!layout) return null

  const sequence = getBuildSequence(missionsDone, crewModuleResearched, landingResearched)
  const buildSteps: BuildStep[] = sequence.map(kind => ({ kind, ...STEP_DETAILS[kind] }))
  const step = buildSteps[stepIndex]
  const installedIds = selectedCustomizerPartIds(buildState.installed, sequence)
  const chance = calculateShipSuccessChance(installedIds, sequence)
  const readyToConfirm = canConfirmCustomizerBuild(buildState.installed, sequence)
  const currentInstalled = buildState.installed[step.kind]
    ? customizerPartById(buildState.installed[step.kind]!)
    : undefined
  const availableParts = partsForKind(step.kind, missionsDone)

  function choosePart(part: CustomizerPart) {
    setBuildState(s => chooseCustomizerPart(s, part.id).state)
  }
  function removeCurrentPart() {
    setBuildState(s => refundCustomizerPart(s, step.kind).state)
  }
  function confirmBuild() {
    const result = confirmCustomizerBuild(buildState, sequence)
    if (!result.ok) {
      setBuildState(result.state)
      return
    }
    const applied = onConfirm ? onConfirm(result.state.installed, installedParts ?? {}) : true
    if (!applied) return
    setBuildState(result.state)
    onClose?.()
  }

  const isFirst = stepIndex === 0
  const isLast = stepIndex === buildSteps.length - 1

  return (
    // Full-screen overlay — caller must position this (position: absolute; inset: 0)
    <div
      data-testid={`ship-interior-${rocketId}`}
      className="ln-starfield"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* ── HEADER (glass topbar) ─────────────────────────────────── */}
      <div className="ln-glass-panel" style={{
        flex: 'none',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px 8px',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.18em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
            Build Config · Explorer
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 1 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: 'var(--ln-text)' }} data-testid="ship-budget">
              {formatCurrency(buildState.balance, { compact: true })}
            </span>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, color: 'var(--ln-text-muted)' }}>remaining</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div data-testid="ship-success-chance">
            <StatusPill kind="ok">{chance}%</StatusPill>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--ln-glass-border)', background: 'transparent', color: 'var(--ln-text-dim)', fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── SHIP DIAGRAM (PixiJS, glass-framed with corner brackets) ── */}
      <div style={{ flex: 'none', maxHeight: '28%', padding: 6 }}>
        <Panel surface="glass" style={{ padding: 0, overflow: 'hidden' }}>
          <ErrorBoundary fallback={<div style={{ height: 80, background: 'rgba(12,12,13,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)', letterSpacing: '0.1em' }}>DIAGRAM UNAVAILABLE</div>}>
            <ShipCustomizerCanvas
              layout={layout}
              activeKind={step.kind}
              installedParts={buildState.installed}
              onSlotClick={kind => {
                const idx = buildSteps.findIndex(s => s.kind === kind)
                if (idx >= 0) setStepIndex(idx)
              }}
              confirmed={buildState.confirmed}
            />
          </ErrorBoundary>
        </Panel>
      </div>

      {/* data-testid anchors for Cypress slot tests (invisible, mirrors slot state) */}
      <div style={{ display: 'none' }}>
        {layout.slots.map(slot => (
          <span
            key={slot.id}
            data-testid={`ship-slot-${slot.kind}`}
            data-installed={buildState.installed[slot.kind] ?? ''}
          />
        ))}
      </div>

      {/* ── STEP TABS (pill row, cyan current / lime done) ──────────── */}
      <div style={{
        flex: 'none',
        display: 'grid',
        gridTemplateColumns: `repeat(${buildSteps.length}, minmax(0, 1fr))`,
        gap: 4,
        padding: '6px 8px',
      }}>
        {buildSteps.map((item, index) => {
          const active = index === stepIndex
          const done = !!buildState.installed[item.kind]
          return (
            <button
              key={item.kind}
              data-testid={`ship-step-${item.kind}`}
              onClick={() => setStepIndex(index)}
              disabled={buildState.confirmed}
              style={{
                minHeight: 28,
                borderRadius: 999,
                border: `1px solid ${active ? 'var(--ln-cyan)' : done ? 'rgba(90,208,126,0.4)' : 'var(--ln-glass-border)'}`,
                background: active ? 'var(--ln-cyan)' : done ? 'rgba(90,208,126,0.12)' : 'rgba(255,255,255,0.05)',
                color: active ? '#0e1526' : done ? 'var(--ln-ok)' : 'var(--ln-text-dim)',
                fontFamily: 'var(--ln-font-display)',
                fontSize: 7,
                fontWeight: active ? 900 : 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                cursor: buildState.confirmed ? 'default' : 'pointer',
                transition: 'border-color 120ms, background 120ms, color 120ms',
              }}
            >
              {done ? '✓' : index + 1}. {item.kind.replace('-', '‑')}
            </button>
          )
        })}
      </div>

      {/* ── STEP CONTENT (fills remaining) ───────────────────────────── */}
      <div data-testid="ship-build-step" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 10px 6px' }}>
        {/* Step title + desc */}
        <div style={{ flex: 'none', marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
            Step {stepIndex + 1} / {buildSteps.length}
          </div>
          <h3 style={{ margin: '1px 0 3px', fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: 'var(--ln-text)', lineHeight: 1.1 }}>
            {step.title}
          </h3>
          <p style={{ margin: 0, fontFamily: 'var(--ln-font-body)', fontSize: 10, color: 'var(--ln-text-muted)', lineHeight: 1.35 }}>
            {step.body}
          </p>
        </div>

        {/* Part cards — flex 1, fill space. Glass-HUD variant cards: cyan
            border by default, lime border + "Installed" state when selected. */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          {availableParts.map(part => {
            const selected = buildState.installed[step.kind] === part.id
            const swapCost = currentInstalled && currentInstalled.id !== part.id ? currentInstalled.price : 0
            const affordable = buildState.balance + swapCost >= part.price
            return (
              <button
                key={part.id}
                data-testid={`choose-${part.id}`}
                disabled={buildState.confirmed || !affordable}
                onClick={() => choosePart(part)}
                className={selected ? undefined : 'ln-glass-panel'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '8px 9px',
                  borderRadius: 8,
                  border: selected ? '1px solid rgba(90,208,126,0.72)' : undefined,
                  background: selected ? 'rgba(90,208,126,0.14)' : undefined,
                  color: 'var(--ln-text)',
                  textAlign: 'left',
                  cursor: buildState.confirmed || !affordable ? 'not-allowed' : 'pointer',
                  opacity: !affordable && !selected ? 0.45 : 1,
                  transition: 'border-color 120ms, background 120ms',
                  overflow: 'hidden',
                }}
              >
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 900, lineHeight: 1.1, flex: 'none' }}>
                  {part.name}
                </div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 10, color: 'var(--ln-text-muted)', lineHeight: 1.3, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {part.description}
                </div>
                <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-amber)' }}>
                    {formatCurrency(part.price, { compact: true })}
                  </span>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 900, color: selected ? 'var(--ln-ok)' : 'var(--ln-cyan)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    {selected ? 'Installed' : `+${part.successBonus}%`}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── FOOTER (glass) ──────────────────────────────────────────── */}
      <div className="ln-glass-panel" style={{
        flex: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
      }}>
        {/* Stage summary chips */}
        <div style={{ display: 'flex', gap: 3, padding: '5px 10px 0', overflowX: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
          <span data-testid="ship-review" data-installed={installedIds.length} data-total={buildSteps.length} style={{ fontFamily: 'var(--ln-font-display)', fontSize: 7, color: 'var(--ln-text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginRight: 4 }}>
            {buildState.confirmed ? 'Configuration confirmed' : `${installedIds.length}/${buildSteps.length} stages selected`}
          </span>
          {buildSteps.map(item => {
            const part = buildState.installed[item.kind] ? customizerPartById(buildState.installed[item.kind]!) : undefined
            const active = item.kind === step.kind
            return (
              <div key={item.kind} style={{
                flex: 'none',
                padding: '2px 6px',
                borderRadius: 4,
                border: `1px solid ${active ? 'var(--ln-cyan)' : part ? 'rgba(90,208,126,0.4)' : 'var(--ln-glass-border)'}`,
                color: active ? 'var(--ln-cyan)' : part ? 'var(--ln-ok)' : 'var(--ln-text-muted)',
                fontFamily: 'var(--ln-font-display)',
                fontSize: 7,
                fontWeight: 800,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {part ? part.name : item.kind}
              </div>
            )
          })}
        </div>

        {/* Nav row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 6, padding: '5px 10px 8px', alignItems: 'center' }}>
          <button
            data-testid="ship-step-back"
            onClick={() => setStepIndex(i => Math.max(0, i - 1))}
            disabled={isFirst || buildState.confirmed}
            style={{
              minHeight: 36, minWidth: 56, padding: '0 10px', borderRadius: 7,
              border: '1px solid var(--ln-glass-border)', background: 'rgba(255,255,255,0.05)',
              color: isFirst || buildState.confirmed ? 'var(--ln-text-muted)' : 'var(--ln-text-dim)',
              fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: isFirst || buildState.confirmed ? 'not-allowed' : 'pointer',
              opacity: isFirst || buildState.confirmed ? 0.4 : 1,
            }}
          >
            Back
          </button>

          {/* Centre: refund + confirm stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {!buildState.confirmed && (
              <button
                data-testid="ship-refund-step"
                onClick={removeCurrentPart}
                disabled={!currentInstalled}
                style={{
                  minHeight: 28, borderRadius: 6,
                  border: `1px solid ${currentInstalled ? 'var(--ln-crimson)' : 'rgba(255,255,255,0.08)'}`,
                  background: currentInstalled ? 'rgba(200,41,62,0.1)' : 'transparent',
                  color: currentInstalled ? 'var(--ln-crimson)' : 'var(--ln-text-muted)',
                  fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 900,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: currentInstalled ? 'pointer' : 'not-allowed',
                  opacity: currentInstalled ? 1 : 0.4,
                }}
              >
                Refund Step
              </button>
            )}
            <button
              data-testid="confirm-ship-config"
              onClick={buildState.confirmed ? undefined : confirmBuild}
              disabled={!readyToConfirm || buildState.confirmed}
              style={{
                minHeight: 28, borderRadius: 6,
                border: 'none',
                background: readyToConfirm && !buildState.confirmed
                  ? 'linear-gradient(180deg, #6cf09a, #1ea54a)'
                  : 'rgba(90,208,126,0.12)',
                color: readyToConfirm && !buildState.confirmed ? '#02180c' : 'var(--ln-ok)',
                fontFamily: 'var(--ln-font-display)', fontSize: 9,
                fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: readyToConfirm && !buildState.confirmed ? 'pointer' : 'not-allowed',
                opacity: readyToConfirm || buildState.confirmed ? 1 : 0.45,
              }}
            >
              {buildState.confirmed ? 'Configuration Confirmed' : 'Confirm Configuration'}
            </button>
          </div>

          <button
            data-testid="ship-step-next"
            onClick={() => setStepIndex(i => Math.min(buildSteps.length - 1, i + 1))}
            disabled={isLast || buildState.confirmed}
            style={{
              minHeight: 36, minWidth: 56, padding: '0 10px', borderRadius: 7,
              border: '1px solid rgba(112,217,234,0.4)', background: 'rgba(112,217,234,0.12)',
              color: isLast || buildState.confirmed ? 'var(--ln-text-muted)' : 'var(--ln-cyan)',
              fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: isLast || buildState.confirmed ? 'not-allowed' : 'pointer',
              opacity: isLast || buildState.confirmed ? 0.4 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
