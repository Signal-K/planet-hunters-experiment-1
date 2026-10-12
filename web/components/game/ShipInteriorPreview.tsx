'use client'

import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { ShipCustomizerCanvas } from '@/components/game/ShipCustomizerCanvas'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import Panel from '@/components/ui/Panel'
import {
  canConfirmCustomizerBuild,
  chooseCustomizerPart,
  confirmCustomizerBuild,
  createCustomizerBuildState,
  customizerPartById,
  getBuildSequence,
  getShipInteriorLayout,
  partsForKind,
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

const STAGE_LABEL: Record<ShipRoomKind, string> = {
  engine: 'Engine',
  booster: 'Booster',
  cockpit: 'Command',
  payload: 'Payload',
  'fuel-stage': 'Propellant',
  fairing: 'Fairing',
  'docking-port': 'Docking',
  'heat-shield': 'Shield',
  'crew-module': 'Crew',
  lander: 'Lander',
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
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  if (!layout) return null

  const sequence = getBuildSequence(missionsDone, crewModuleResearched, landingResearched)
  const stepKind = sequence[stepIndex]
  const readyToConfirm = canConfirmCustomizerBuild(buildState.installed, sequence)
  const currentInstalled = buildState.installed[stepKind]
    ? customizerPartById(buildState.installed[stepKind]!)
    : undefined
  const availableParts = partsForKind(stepKind, missionsDone)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === sequence.length - 1
  const stageName = STAGE_LABEL[stepKind]

  function choosePart(part: CustomizerPart) {
    setBuildState(s => chooseCustomizerPart(s, part.id).state)
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
  function go(delta: number) {
    if (buildState.confirmed) return
    setStepIndex(i => Math.min(sequence.length - 1, Math.max(0, i + delta)))
  }
  function onPrimary() {
    if (buildState.confirmed) return
    if (!isLast) {
      go(1)
      return
    }
    confirmBuild()
  }

  function onPointerDown(event: PointerEvent) {
    swipe.current = { x: event.clientX, y: event.clientY }
  }
  function onPointerUp(event: PointerEvent) {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy)) return
    suppressClick.current = true
    go(dx < 0 ? 1 : -1)
  }
  function onClickCapture(event: MouseEvent) {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const primaryDisabled = buildState.confirmed || (isLast && !readyToConfirm)
  const primaryLabel = buildState.confirmed ? 'CONFIRMED' : isLast ? 'CONFIRM' : 'NEXT'

  return (
    <div
      data-testid={`ship-interior-${rocketId}`}
      className="ln-starfield theme-blueprint ship-interior-preview sip-root"
      style={{ height: '100%' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <header className="sip-head">
        <div className="sip-budget">
          <span data-testid="ship-budget">{formatCurrency(buildState.balance, { compact: true })}</span>
          <span className="sip-budget-note">remaining</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="ship-interior-close"
            className="sip-close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3 L13 13 M13 3 L3 13" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        )}
      </header>

      <div className="sip-ship">
        <Panel surface="glass" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
          <ErrorBoundary fallback={<div className="sip-diagram-fallback">Diagram unavailable</div>}>
            <ShipCustomizerCanvas
              layout={layout}
              activeKind={stepKind}
              installedParts={buildState.installed}
              onSlotClick={kind => {
                const idx = sequence.indexOf(kind)
                if (idx >= 0) setStepIndex(idx)
              }}
              confirmed={buildState.confirmed}
            />
          </ErrorBoundary>
        </Panel>
      </div>

      <div style={{ display: 'none' }}>
        {layout.slots.map(slot => (
          <span
            key={slot.id}
            data-testid={`ship-slot-${slot.kind}`}
            data-installed={buildState.installed[slot.kind] ?? ''}
          />
        ))}
      </div>

      <div data-testid="ship-build-step" className="sip-side">
        <div
          className="sip-stage"
          data-testid="ship-stage"
          data-kind={stepKind}
          data-index={stepIndex + 1}
          data-total={sequence.length}
        >
          <button
            type="button"
            data-testid="ship-step-back"
            className="sip-back"
            aria-label="Previous stage"
            onClick={() => go(-1)}
            disabled={isFirst || buildState.confirmed}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M12 3 L6 9 L12 15" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <div className="sip-stage-copy">
            <span className="sip-stage-label">{stageName} {stepIndex + 1}/{sequence.length}</span>
            <span className="sip-dots" aria-hidden="true">
              {sequence.map((kind, index) => {
                const done = !!buildState.installed[kind]
                const current = index === stepIndex
                return (
                  <i
                    key={kind}
                    className={current ? 'sip-dot is-current' : done ? 'sip-dot is-done' : 'sip-dot'}
                  />
                )
              })}
            </span>
          </div>
        </div>

        <div className="sip-cards">
          {availableParts.map(part => {
            const selected = buildState.installed[stepKind] === part.id
            const swapCost = currentInstalled && currentInstalled.id !== part.id ? currentInstalled.price : 0
            const affordable = buildState.balance + swapCost >= part.price
            return (
              <button
                key={part.id}
                type="button"
                data-testid={`choose-${part.id}`}
                disabled={buildState.confirmed || !affordable}
                onClick={() => choosePart(part)}
                className={selected ? 'ship-part-option ship-part-option--selected' : 'ship-part-option'}
              >
                <span className="sip-part-name">{part.name}</span>
                <span className="sip-part-desc">{part.description}</span>
                <span className="sip-part-meta">
                  <span className="sip-part-price">{formatCurrency(part.price, { compact: true })}</span>
                  <span className={selected ? 'sip-part-state is-installed' : 'sip-part-state'}>
                    {selected ? 'Installed' : `+${part.successBonus}%`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <footer className="sip-foot">
        <button
          type="button"
          data-testid="ship-primary"
          data-action={isLast ? 'confirm' : 'next'}
          className={isLast ? 'sip-primary sip-primary--confirm' : 'sip-primary'}
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
      </footer>
    </div>
  )
}
