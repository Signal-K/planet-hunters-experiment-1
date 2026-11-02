'use client'

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { AUTO_FINISH, INSTRUMENT_FINISHES, finishStyle, readFinishChoice, resolveFinish, unlockedFinishes, writeFinishChoice, type InstrumentFinish } from '@/lib/instrument-finish'
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
  /** Looks unready but stays tappable, so the tap can explain what is missing. */
  dim?: boolean
  /** The one answer the player is expected to give now: drawn as the bright submit button. */
  primary?: boolean
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
  /** Under the answers, outside the numbered steps (the All controls toggle on a console with no tool). */
  footer?: ReactNode
  /**
   * Project-only verbs. Return null to fall through to the shared command set
   * (POINT, ZOOM, FOCUS, EXPOSE, STRETCH, INVERT, DOWNLINK, HELP).
   */
  onCommand?: (line: string, view: InstrumentView) => InstrumentCommandResult | null
  /** The person on the other end of the downlink. Their lines brief the player in the console. */
  briefing?: InstrumentBriefing
  /** Which instrument this is; the player's finish choice is kept per instrument. */
  instrumentId?: string
  /** Instrument level: picks the default finish and which finishes are unlocked. */
  level?: number
  /**
   * This project's own instrument (SSL-745): knobs and keys that act on its data, e.g. the
   * transit telescope's TIME / BIN / FOLD. Drawn as a second plate under the optics.
   */
  module?: InstrumentModule
  /**
   * The player's own result, line by line (SSL-747): what they measured, the settings they
   * used and their verdict. A record of their work, never a grade or a hint.
   */
  readout?: InstrumentReadout
  /**
   * Tappable command keys under the downlink log (SSL-749), so the terminal shows what it is for
   * without typing. Each runs its line exactly as if typed. Defaults to the shared optics verbs.
   */
  quickCommands?: InstrumentQuickCommand[]
  /**
   * Just the data, the readout and the answer steps: no optics or project plate and no downlink terminal.
   * For a player's first classification (Liam, 2.11: "too complex, too much going on").
   */
  simple?: boolean
}

export interface InstrumentQuickCommand { label: string; line: string; testId?: string }

const DEFAULT_QUICK_COMMANDS: InstrumentQuickCommand[] = [
  { label: 'ZOOM IN', line: 'ZOOM IN' },
  { label: 'ZOOM OUT', line: 'ZOOM OUT' },
  { label: 'HELP', line: 'HELP' },
]

export interface InstrumentReadoutRow { label: string; value: string; testId?: string }
export interface InstrumentReadout {
  /** Engraved plate name, e.g. "READOUT · YOUR RESULT". */
  name: string
  testId: string
  rows: InstrumentReadoutRow[]
}

export interface InstrumentModule {
  /** Engraved plate name, e.g. "PHOTOMETRY · TP-02". */
  name: string
  testId: string
  /** Lamps on the plate. */
  lights?: ReactNode
  content: ReactNode
}

const FinishContext = createContext<InstrumentFinish>(INSTRUMENT_FINISHES[0])
/** The console's current colourway, for renderers inside the viewport (the TESS chart). */
export function useInstrumentFinish(): InstrumentFinish { return useContext(FinishContext) }

export interface InstrumentBriefing {
  /** Who is talking, e.g. "Saturn desk". */
  speaker: string
  lines: readonly string[]
  /** Open on arrival: the player's first time on this instrument. Otherwise it waits behind BRIEFING. */
  startOpen: boolean
  /** Called when the player reaches the end of the briefing. */
  onDone?: () => void
}

const LOG_LIMIT = 8

/** Pointing offset on the aim LCD, in arcminutes from the target. */
function aimReadout(view: InstrumentView): string {
  const fmt = (v: number, pos: string, neg: string) => `${v < 0 ? neg : pos}${Math.abs(Math.round(v * 40)).toString().padStart(2, '0')}′`
  return `${fmt(view.panX, 'E', 'W')} ${fmt(-view.panY, 'N', 'S')}`
}

function dialAngle(value: number, min: number, max: number): number {
  const span = max - min
  const t = span === 0 ? 0 : (value - min) / span
  return -135 + Math.min(1, Math.max(0, t)) * 270
}

export function InstrumentKnob(props: Parameters<typeof Knob>[0]) { return <Knob {...props} /> }
export function InstrumentSwitch(props: Parameters<typeof Switch>[0]) { return <Switch {...props} /> }

/** A glass keycap for a project module: one tap, one action (SNAP, FILTER, BIN). */
export function InstrumentModuleKey({ testId, label, readout, pressed, disabled, onClick }: { testId: string; label: string; readout?: string; pressed?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={styles.moduleKey} data-testid={testId} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <span className={styles.moduleKeyLabel}>{label}</span>
      {readout != null && <span className={styles.moduleKeyReadout}>{readout}</span>}
    </button>
  )
}

export function InstrumentLamp({ label, on, tone }: { label: string; on: boolean; tone?: 'amber' }) {
  return <><span className={styles.led} data-on={on ? 'true' : 'false'} data-tone={tone} />{label}</>
}

function Knob({
  label,
  testId,
  min,
  max,
  step,
  value,
  readout,
  onChange,
}: {
  label: string
  testId: string
  min: number
  max: number
  step: number
  value: number
  /** What the knob's LCD shows, e.g. "2.4×". */
  readout: string
  onChange: (value: number) => void
}) {
  const angle = dialAngle(value, min, max)
  return (
    <label className={styles.knob} style={{ '--k-sweep': `${angle + 135}deg` } as CSSProperties}>
      <span className={styles.knobBezel} aria-hidden="true" />
      <span className={styles.dial} style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true">
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
      <span className={styles.lcd} aria-hidden="true">{readout}</span>
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
      <span className={styles.led} data-on={pressed ? 'true' : 'false'} aria-hidden="true" />
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
          data-dim={action.dim ? 'true' : undefined}
          data-primary={action.primary ? 'true' : undefined}
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

/** An instruction for the annotate step, drawn as engraved text rather than a key (SSL-749: "Drag dip" read as a button). */
export function InstrumentToolHint({ testId, text, detail }: { testId: string; text: string; detail?: string }) {
  return (
    <p className={styles.toolHint} data-testid={testId}>
      <span>{text}</span>
      {detail && <span className={styles.toolHintDetail}>{detail}</span>}
    </p>
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
  footer,
  onCommand,
  briefing,
  instrumentId = 'instrument',
  level = 1,
  module,
  readout,
  quickCommands = DEFAULT_QUICK_COMMANDS,
  simple = false,
}: InstrumentViewportProps) {
  // Device-local choice, read after mount so the server render (AUTO) hydrates cleanly.
  const [finishChoice, setFinishChoice] = useState<string>(AUTO_FINISH)
  useEffect(() => { setFinishChoice(readFinishChoice(instrumentId)) }, [instrumentId])
  const finish = resolveFinish(finishChoice, level)
  const chooseFinish = (choice: string) => { setFinishChoice(choice); writeFinishChoice(instrumentId, choice) }
  const [briefStep, setBriefStep] = useState<number | null>(briefing?.startOpen ? 0 : null)
  const briefLine = briefing && briefStep != null ? briefing.lines[briefStep] : null
  const nextBrief = () => {
    if (!briefing || briefStep == null) return
    if (briefStep + 1 < briefing.lines.length) setBriefStep(briefStep + 1)
    else { setBriefStep(null); briefing.onDone?.() }
  }
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
    const [verb, arg] = raw.trim().toUpperCase().split(/\s+/)
    if (verb === 'FINISH') {
      const unlocked = unlockedFinishes(level)
      if (!arg) { pushLines([`> FINISH  ${finish.name.toUpperCase()}${finishChoice === AUTO_FINISH ? ' · AUTO' : ''}`, `  UNLOCKED: AUTO ${unlocked.map(f => f.name.toUpperCase()).join(' ')}`]); return }
      if (arg === 'AUTO') { chooseFinish(AUTO_FINISH); pushLines([`> FINISH  AUTO · ${resolveFinish(AUTO_FINISH, level).name.toUpperCase()}`]); return }
      const wanted = INSTRUMENT_FINISHES.find(f => f.id.toUpperCase() === arg)
      if (!wanted) { pushLines([`> FINISH ${arg}  UNKNOWN`]); return }
      if (wanted.unlockLevel > level) { pushLines([`> FINISH ${arg}  LOCKED · REACH LV ${wanted.unlockLevel}`]); return }
      chooseFinish(wanted.id); pushLines([`> FINISH  ${arg}`]); return
    }
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
  const finishVars = finishStyle(finish) as CSSProperties

  const lastLine = log[log.length - 1] ?? '> DOWNLINK  RECEIVED'

  return (
    <FinishContext.Provider value={finish}>
    <div className={`game-screen theme-blueprint ${sceneClassName} ${styles.screen}`} data-testid={testId} data-finish={finish.id} style={finishVars}>
      <TopBar eyebrow={eyebrow} title={title} onBack={onBack} right={help} solid />
      {helpLayer}
      <div className={styles.body}>
        {devBar}
        <div className={styles.stage} data-testid="instrument-stage" data-simple={simple ? 'true' : undefined}>
          {!simple && <div className={styles.controls} data-testid="instrument-controls" aria-label="Instrument controls">
            {/* SSL-749: just the plate name. The PWR/TRK/MAG lamps and the finish row read as noise beside real
                controls; the colourway stays a FINISH command in the downlink. */}
            <div className={styles.plate} aria-hidden="true">
              <span className={styles.plateName}>OPTICS · IV-01</span>
            </div>
            <div className={styles.controlGrid}>
              <div className={styles.dpadBlock}>
                <div className={styles.dpad} role="group" aria-label="Aim">
                  <span className={styles.dpadRing} aria-hidden="true" />
                  <button type="button" className={`${styles.aim} ${styles.aimNorth}`} data-testid="instrument-aim-n" aria-label="Aim north" onClick={() => setView(current => nudgeAim(current, 'n'))}><AimIcon direction="n" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimWest}`} data-testid="instrument-aim-w" aria-label="Aim west" onClick={() => setView(current => nudgeAim(current, 'w'))}><AimIcon direction="w" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimCenter}`} data-testid="instrument-aim-reset" aria-label="Reset aim" onClick={() => setView(current => nudgeAim(current, 'reset'))}><AimIcon direction="reset" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimEast}`} data-testid="instrument-aim-e" aria-label="Aim east" onClick={() => setView(current => nudgeAim(current, 'e'))}><AimIcon direction="e" /></button>
                  <button type="button" className={`${styles.aim} ${styles.aimSouth}`} data-testid="instrument-aim-s" aria-label="Aim south" onClick={() => setView(current => nudgeAim(current, 's'))}><AimIcon direction="s" /></button>
                </div>
                <span className={styles.lcd} aria-hidden="true" data-testid="instrument-aim-readout">{aimReadout(view)}</span>
                <span className={styles.aimLabel}>AIM</span>
              </div>
              <div className={styles.knobRow}>
                <Knob label="ZOOM" testId="instrument-zoom" min={INSTRUMENT_LIMITS.zoomMin} max={INSTRUMENT_LIMITS.zoomMax} step={0.1} value={view.zoom} readout={`${view.zoom.toFixed(1)}×`} onChange={zoom => setView(current => ({ ...current, zoom }))} />
                <Knob label="FOCUS" testId="instrument-focus" min={0} max={1} step={0.05} value={view.focus} readout={`${Math.round(100 - Math.abs(view.focus - 0.5) * 200)}%`} onChange={focus => setView(current => ({ ...current, focus }))} />
                <Knob label="EXPOSURE" testId="instrument-exposure" min={INSTRUMENT_LIMITS.exposureMin} max={INSTRUMENT_LIMITS.exposureMax} step={0.05} value={view.exposure} readout={`${view.exposure >= 1 ? '+' : ''}${(view.exposure - 1).toFixed(1)}EV`} onChange={exposure => setView(current => ({ ...current, exposure }))} />
              </div>
              <div className={styles.switchRow}>
                <Switch label="STRETCH" testId="instrument-stretch" pressed={view.stretch} onToggle={() => setView(current => ({ ...current, stretch: !current.stretch }))} />
                <Switch label="INVERT" testId="instrument-invert" pressed={view.invert} onToggle={() => setView(current => ({ ...current, invert: !current.invert }))} />
              </div>
            </div>
            {module && (
              <section className={styles.module} data-testid={module.testId} aria-label={module.name}>
                <div className={styles.plate}>
                  <span className={styles.plateName}>{module.name}</span>
                  {module.lights && <span className={styles.lights}>{module.lights}</span>}
                </div>
                <div className={styles.moduleBody}>{module.content}</div>
              </section>
            )}
            <span className={styles.vent} aria-hidden="true" />
          </div>}

          <div className={styles.wellSlot}>
          <div className={styles.well} data-testid="instrument-viewport" data-ui-zone={UI_ZONES.screenContent}>
            <div className={styles.titleBar} data-testid="instrument-title-bar">
              <span className={styles.titleStation}>{eyebrow}</span>
              <b className={styles.titleName}>{title}</b>
              <span className={styles.titleStatus} data-testid="instrument-title-status">{status}</span>
            </div>
            <div className={styles.view}>
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
            {/* Instrument dressing from the v0 telescope mockup, in the house palette (SSL-744). */}
            <div className={styles.greeble} aria-hidden="true" data-testid="instrument-greeble">
              <span className={styles.graticule} />
              <span className={styles.scaleTop} />
              <span className={styles.scaleLeft} />
              <span className={styles.scan} />
              <span className={styles.scan} data-late="true" />
              <span className={styles.bracket} data-at="tl" />
              <span className={styles.bracket} data-at="tr" />
              <span className={styles.bracket} data-at="bl" />
              <span className={styles.bracket} data-at="br" />
              <span className={styles.glassReadout} data-at="tr">{aimReadout(view)} · {view.zoom.toFixed(1)}×</span>
            </div>
            <div className={styles.reticle} aria-hidden="true" />
            {viewportChrome}
            {caption}
            </div>
          </div>
          </div>

          <div className={styles.command} data-testid="instrument-command">
            {!simple && <div className={styles.plate} aria-hidden="true">
              <span className={styles.plateName}>DOWNLINK · CH 02</span>
              <span className={styles.signal} data-inline="true"><i /><i /><i /><i /><i /></span>
            </div>}
            {simple ? null : briefing && briefLine != null ? (
              <section className={styles.desk} data-testid="instrument-briefing" aria-label={briefing.speaker}>
                <span className={styles.speaker}>{briefing.speaker}</span>
                <p className={styles.deskLine} data-testid="instrument-briefing-line" aria-live="polite">{briefLine}</p>
                <button type="button" className={styles.deskNext} data-testid="instrument-briefing-next" onClick={nextBrief}>
                  {briefStep! + 1 < briefing.lines.length ? `NEXT · ${briefStep! + 1}/${briefing.lines.length}` : 'START'}
                </button>
              </section>
            ) : (
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
              <div className={styles.quickKeys} role="group" aria-label="Commands" data-testid="instrument-quick-commands">
                {quickCommands.map(cmd => (
                  <button key={cmd.line} type="button" className={styles.quickKey} data-testid={cmd.testId} onClick={() => runCommand(cmd.line)}>{cmd.label}</button>
                ))}
              </div>
              {briefing && (
                <button type="button" className={styles.briefButton} data-testid="instrument-briefing-open" onClick={() => setBriefStep(0)}>
                  BRIEFING · {briefing.speaker}
                </button>
              )}
            </div>
            )}
            {readout && (
              <section className={styles.resultPlate} data-testid={readout.testId} aria-label={readout.name}>
                <div className={styles.plate}>
                  <span className={styles.plateName}>{readout.name}</span>
                </div>
                <dl className={styles.result}>
                  {readout.rows.map(row => (
                    <div key={row.label} data-testid={row.testId}><dt>{row.label}</dt><dd>{row.value}</dd></div>
                  ))}
                </dl>
              </section>
            )}
            {!tool && <p className={styles.status} data-testid="instrument-status">{status}</p>}
            {/* Liam, 31.10: say which step submits. With a tool: 1 mark, 2 submit the classification (it is sent and the screen moves on). */}
            {tool ? <>
              <p className={styles.step} data-testid="instrument-step-mark"><b>1</b> Mark it</p>
              {tool}
              <p className={styles.step} data-testid="instrument-step-save"><b>2</b> Submit your classification</p>
              {answers}
            </> : <>
              {answers}
              {emptyToolLabel ? <div className={styles.emptyTool} data-testid="instrument-empty-tool">{emptyToolLabel}</div> : null}
            </>}
            {footer}
          </div>
        </div>
      </div>
    </div>
    </FinishContext.Provider>
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
      emptyToolLabel={answers ? undefined : "No tool"}
    />
  )
}
