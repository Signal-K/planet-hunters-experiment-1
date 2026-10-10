'use client'

import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import TopBar from '@/components/ui/TopBar'
import { UI_ZONES } from '@/lib/ui-zones'
import {
  applyInstrumentCommand,
  DEFAULT_INSTRUMENT_VIEW,
  instrumentOptics,
  INSTRUMENT_LIMITS,
  nudgeAim,
  type InstrumentCommandResult,
  type InstrumentView,
} from '@/lib/instrument-viewport/view'
import styles from './InstrumentViewport.module.css'

export interface InstrumentAnswer {
  id: string
  label: string
  testId: string
  disabled?: boolean
  onClick: () => void
}

interface InstrumentViewportProps {
  testId: string
  sceneClassName: string
  eyebrow: string
  title: string
  onBack: () => void
  help?: ReactNode
  helpLayer?: ReactNode
  /** Dev-only day skip. Kept in the column so it does not cover the viewport. */
  devBar?: ReactNode
  status: string
  /** Fills the optics stage. Zoom, pan, stretch, invert and exposure apply here. */
  viewport: ReactNode
  /** Sits above the transformed image and moves with it. Saturn's 3×3 grid uses this. */
  overlay?: ReactNode
  /** Fixed label inside the well, outside the optics, so it stays readable. */
  caption?: ReactNode
  /** Fixed controls over the well (sector chips, point-satellite). Not transformed. */
  viewportChrome?: ReactNode
  answers: ReactNode
  tool?: ReactNode
  /** Dashed slot when this project has no annotate tool. */
  emptyToolLabel?: string
  /**
   * Project-only verbs. Return null to fall through to the shared command set
   * (POINT, ZOOM, FOCUS, EXPOSE, STRETCH, INVERT, DOWNLINK, HELP).
   */
  onCommand?: (line: string, view: InstrumentView) => InstrumentCommandResult | null
}

const LOG_LIMIT = 8

function dialAngle(value: number, min: number, max: number): number {
  const span = max - min
  const t = span === 0 ? 0 : (value - min) / span
  return -135 + Math.min(1, Math.max(0, t)) * 270
}

function Knob({
  label,
  testId,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  testId: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className={styles.knob}>
      <span className={styles.dial} style={{ transform: `rotate(${dialAngle(value, min, max)}deg)` }} aria-hidden="true">
        <span className={styles.needle} />
      </span>
      <input
        className={styles.knobRange}
        type="range"
        data-testid={testId}
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
      />
      <span className={styles.knobLabel}>{label}</span>
    </label>
  )
}

function Switch({
  label,
  testId,
  pressed,
  onToggle,
}: {
  label: string
  testId: string
  pressed: boolean
  onToggle: () => void
}) {
  return (
    <button type="button" className={styles.switch} data-testid={testId} aria-pressed={pressed} onClick={onToggle}>
      <span className={styles.switchTrack} data-on={pressed ? 'true' : 'false'} aria-hidden="true">
        <span className={styles.switchThumb} />
      </span>
      <span className={styles.switchLabel}>{label}</span>
    </button>
  )
}

function AimIcon({ direction }: { direction: 'n' | 's' | 'e' | 'w' | 'reset' }) {
  if (direction === 'reset') {
    return <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="3" fill="currentColor" /></svg>
  }
  const rotation = { n: 0, e: 90, s: 180, w: 270 }[direction]
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M6 1.5 L10.5 9.5 H1.5 Z" fill="currentColor" />
    </svg>
  )
}

export function InstrumentAnswerRow({ actions, groupTestId, coachTarget }: { actions: InstrumentAnswer[]; groupTestId?: string; coachTarget?: string }) {
  return (
    <div className={styles.answers} data-testid={groupTestId} data-coach-target={coachTarget} data-ui-zone={UI_ZONES.bottomActions}>
      {actions.map(action => (
        <button
          key={action.id}
          type="button"
          className={styles.answer}
          data-testid={action.testId}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export function InstrumentToolButton({
  testId,
  label,
  pressed,
  disabled,
  onClick,
}: {
  testId: string
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={styles.toolButton}
      data-testid={testId}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true">{pressed ? '●' : '○'}</span>
      {label}
    </button>
  )
}

export function InstrumentDevDayBar({
  testIdPrefix,
  offset,
  onAdvance,
  onReset,
}: {
  testIdPrefix: string
  offset: number
  onAdvance: () => void
  onReset: () => void
}) {
  const simulated = new Date()
  simulated.setDate(simulated.getDate() + offset)
  return (
    <div className={styles.devBar}>
      <span>DEV · Simulated day {simulated.toISOString().slice(0, 10)} ({offset >= 0 ? '+' : ''}{offset}d)</span>
      <button type="button" data-testid={`${testIdPrefix}-dev-skip-day`} onClick={onAdvance}>+1 DAY</button>
      {offset !== 0 && (
        <button type="button" data-testid={`${testIdPrefix}-dev-reset-day`} onClick={onReset}>RESET</button>
      )}
    </div>
  )
}

/**
 * One console for every classify project. Pass the data renderer as `viewport`,
 * the project's answer buttons as `answers`, and an optional annotate tool.
 */
export default function InstrumentViewport({
  testId,
  sceneClassName,
  eyebrow,
  title,
  onBack,
  help,
  helpLayer,
  devBar,
  status,
  viewport,
  overlay,
  caption,
  viewportChrome,
  answers,
  tool,
  emptyToolLabel,
  onCommand,
}: InstrumentViewportProps) {
  const [view, setView] = useState<InstrumentView>(DEFAULT_INSTRUMENT_VIEW)
  const [log, setLog] = useState<string[]>(['> DOWNLINK  RECEIVED'])
  const [draft, setDraft] = useState('')
  const [terminalOpen, setTerminalOpen] = useState(false)
  const optics = useMemo(() => instrumentOptics(view), [view])

  const pushLines = (lines: string[]) => {
    if (!lines.length) return
    setLog(prev => [...prev, ...lines].slice(-LOG_LIMIT))
  }

  const runCommand = (raw: string) => {
    const project = onCommand?.(raw, view)
    const result = project === undefined || project === null ? applyInstrumentCommand(view, raw) : project
    if (!result) {
      const token = raw.trim().split(/\s+/)[0]?.toUpperCase() || 'COMMAND'
      pushLines([`> ${token}  UNKNOWN`])
      return
    }
    setView(result.view)
    pushLines(result.lines)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const next = draft
    setDraft('')
    runCommand(next)
  }

  const opticsStyle = {
    '--iv-pan-x': String(optics.panX),
    '--iv-pan-y': String(optics.panY),
    '--iv-zoom': String(optics.zoom),
    '--iv-stretch': String(optics.stretch),
    '--iv-exposure': String(optics.exposure),
    '--iv-blur': `${optics.blurPx}px`,
    '--iv-invert': String(optics.invert),
  } as CSSProperties

  const lastLine = log[log.length - 1] ?? '> DOWNLINK  RECEIVED'

  return (
    <div className={`game-screen theme-blueprint ${sceneClassName} ${styles.screen}`} data-testid={testId}>
      <TopBar eyebrow={eyebrow} title={title} onBack={onBack} right={help} solid />
      {helpLayer}
      <div className={styles.body}>
        {devBar}
        <div className={styles.stage} data-testid="instrument-stage">
          <div className={styles.controls} data-testid="instrument-controls" aria-label="Instrument controls">
            <div className={styles.controlGrid}>
              <div className={styles.dpadBlock}>
                <div className={styles.dpad} role="group" aria-label="Aim">
                  <button type="button" className={`${styles.aim} ${styles.aimNorth}`} data-testid="instrument-aim-n" aria-label="Aim north" onClick={() => setView(current => nudgeAim(current, 'n'))}><AimIcon direction="n" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimWest}`} data-testid="instrument-aim-w" aria-label="Aim west" onClick={() => setView(current => nudgeAim(current, 'w'))}><AimIcon direction="w" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimCenter}`} data-testid="instrument-aim-reset" aria-label="Reset aim" onClick={() => setView(current => nudgeAim(current, 'reset'))}><AimIcon direction="reset" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimEast}`} data-testid="instrument-aim-e" aria-label="Aim east" onClick={() => setView(current => nudgeAim(current, 'e'))}><AimIcon direction="e" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimSouth}`} data-testid="instrument-aim-s" aria-label="Aim south" onClick={() => setView(current => nudgeAim(current, 's'))}><AimIcon direction="s" /></button>
                </div>
                <span className={styles.aimLabel}>AIM</span>
              </div>
              <div className={styles.knobRow}>
                <Knob label="ZOOM" testId="instrument-zoom" min={INSTRUMENT_LIMITS.zoomMin} max={INSTRUMENT_LIMITS.zoomMax} step={0.1} value={view.zoom} onChange={zoom => setView(current => ({ ...current, zoom }))} />
                <Knob label="FOCUS" testId="instrument-focus" min={0} max={1} step={0.05} value={view.focus} onChange={focus => setView(current => ({ ...current, focus }))} />
                <Knob label="EXPOSURE" testId="instrument-exposure" min={INSTRUMENT_LIMITS.exposureMin} max={INSTRUMENT_LIMITS.exposureMax} step={0.05} value={view.exposure} onChange={exposure => setView(current => ({ ...current, exposure }))} />
              </div>
              <div className={styles.switchRow}>
                <Switch label="STRETCH" testId="instrument-stretch" pressed={view.stretch} onToggle={() => setView(current => ({ ...current, stretch: !current.stretch }))} />
                <Switch label="INVERT" testId="instrument-invert" pressed={view.invert} onToggle={() => setView(current => ({ ...current, invert: !current.invert }))} />
              </div>
            </div>
          </div>

          <div className={styles.wellSlot}>
          <div className={styles.well} data-testid="instrument-viewport" data-ui-zone={UI_ZONES.screenContent}>
            <div
              className={styles.optics}
              data-testid="instrument-optics"
              data-zoom={optics.zoom}
              data-pan-x={optics.panX}
              data-pan-y={optics.panY}
              data-stretch={view.stretch ? 'on' : 'off'}
              data-invert={view.invert ? 'on' : 'off'}
              data-exposure={optics.exposure}
              data-focus={view.focus}
              style={opticsStyle}
            >
              <div className={styles.fill}>{viewport}</div>
              {overlay}
            </div>
            <div className={styles.reticle} aria-hidden="true" />
            {viewportChrome}
            {caption}
          </div>
          </div>

          <div className={styles.command} data-testid="instrument-command">
            <div className={styles.terminal} data-open={terminalOpen ? 'true' : 'false'} data-testid="instrument-terminal">
              <ol className={styles.log} data-testid="instrument-command-log">
                {log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
              </ol>
              <div className={styles.promptRow}>
                <form className={styles.prompt} onSubmit={onSubmit}>
                  <span className={styles.promptMark} aria-hidden="true">&gt;</span>
                  <input
                    className={styles.commandInput}
                    data-testid="instrument-command-input"
                    aria-label="Instrument command"
                    value={draft}
                    placeholder="TYPE A COMMAND"
                    onChange={event => setDraft(event.target.value)}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </form>
                <button
                  type="button"
                  className={styles.terminalToggle}
                  data-testid="instrument-terminal-toggle"
                  aria-expanded={terminalOpen}
                  onClick={() => setTerminalOpen(open => !open)}
                >
                  {lastLine.replace(/^>\s*/, '').replace(/\s{2,}/g, ' · ')} {terminalOpen ? '▾' : '▴'}
                </button>
              </div>
            </div>
            <p className={styles.status} data-testid="instrument-status">{status}</p>
            {answers}
            {tool ?? (emptyToolLabel ? <div className={styles.emptyTool} data-testid="instrument-empty-tool">{emptyToolLabel}</div> : null)}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Locked, loading, and empty feeds stay on the same console as a live classify. */
export function InstrumentStandbyViewport({
  testId,
  sceneClassName,
  eyebrow,
  title,
  onBack,
  status,
  messageTitle,
  messageBody,
  answers,
  devBar,
}: {
  testId: string
  sceneClassName: string
  eyebrow: string
  title: string
  onBack: () => void
  status: string
  messageTitle: string
  messageBody: string
  answers?: ReactNode
  devBar?: ReactNode
}) {
  return (
    <InstrumentViewport
      testId={testId}
      sceneClassName={sceneClassName}
      eyebrow={eyebrow}
      title={title}
      onBack={onBack}
      status={status}
      devBar={devBar}
      viewport={(
        <div className={styles.standby} data-testid="instrument-standby">
          <strong>{messageTitle}</strong>
          <p>{messageBody}</p>
        </div>
      )}
      answers={answers ?? <p className={styles.standbyNote}>No verdict yet</p>}
      emptyToolLabel="No tool"
    />
  )
}
