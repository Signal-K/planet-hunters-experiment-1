/**
 * Shared optics for every citizen-science classify task (SSL-497).
 * A project supplies a renderer, an answer row, and an optional tool.
 * Aim, zoom, focus, exposure, stretch and invert all write this one view,
 * whether the player turns a knob or types the matching command.
 */

export interface InstrumentView {
  panX: number
  panY: number
  zoom: number
  /** 0..1. 0.5 is in focus; either end softens the view. */
  focus: number
  /** CSS contrast multiplier. 1 is the downlink as received. */
  exposure: number
  stretch: boolean
  invert: boolean
}

export const DEFAULT_INSTRUMENT_VIEW: InstrumentView = {
  panX: 0,
  panY: 0,
  zoom: 1,
  focus: 0.5,
  exposure: 1,
  stretch: false,
  invert: false,
}

export const INSTRUMENT_LIMITS = {
  pan: 0.72,
  panStep: 0.18,
  zoomMin: 1,
  zoomMax: 3,
  focusMin: 0,
  focusMax: 1,
  exposureMin: 0.6,
  exposureMax: 1.8,
  stretchScale: 1.7,
} as const

export interface InstrumentOptics {
  panX: number
  panY: number
  zoom: number
  stretch: number
  exposure: number
  blurPx: number
  invert: 0 | 1
}

export interface InstrumentCommandResult {
  view: InstrumentView
  /** One or more echo lines, newest last. Each line already includes the prompt. */
  lines: string[]
}

const HELP_LINES = [
  '> HELP',
  'POINT N|S|E|W|RESET',
  'ZOOM 1-3',
  'FOCUS 0-100',
  'EXPOSE 0.6-1.8',
  'STRETCH ON|OFF',
  'INVERT ON|OFF',
  'DOWNLINK',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function instrumentOptics(view: InstrumentView): InstrumentOptics {
  const focusDelta = Math.abs(view.focus - 0.5)
  return {
    panX: view.panX,
    panY: view.panY,
    zoom: view.zoom,
    stretch: view.stretch ? INSTRUMENT_LIMITS.stretchScale : 1,
    exposure: view.exposure,
    blurPx: round2(focusDelta * 8),
    invert: view.invert ? 1 : 0,
  }
}

export function nudgeAim(view: InstrumentView, direction: 'n' | 's' | 'e' | 'w' | 'reset'): InstrumentView {
  if (direction === 'reset') return { ...view, panX: 0, panY: 0 }
  const step = INSTRUMENT_LIMITS.panStep
  const limit = INSTRUMENT_LIMITS.pan
  if (direction === 'n') return { ...view, panY: clamp(round2(view.panY - step), -limit, limit) }
  if (direction === 's') return { ...view, panY: clamp(round2(view.panY + step), -limit, limit) }
  if (direction === 'e') return { ...view, panX: clamp(round2(view.panX + step), -limit, limit) }
  return { ...view, panX: clamp(round2(view.panX - step), -limit, limit) }
}

function setZoom(view: InstrumentView, zoom: number): InstrumentView {
  return { ...view, zoom: clamp(round2(zoom), INSTRUMENT_LIMITS.zoomMin, INSTRUMENT_LIMITS.zoomMax) }
}

function setFocus(view: InstrumentView, focus: number): InstrumentView {
  return { ...view, focus: clamp(round2(focus), INSTRUMENT_LIMITS.focusMin, INSTRUMENT_LIMITS.focusMax) }
}

function setExposure(view: InstrumentView, exposure: number): InstrumentView {
  return { ...view, exposure: clamp(round2(exposure), INSTRUMENT_LIMITS.exposureMin, INSTRUMENT_LIMITS.exposureMax) }
}

function onOff(value: string): boolean | null {
  const token = value.trim().toUpperCase()
  if (token === 'ON' || token === '1' || token === 'TRUE') return true
  if (token === 'OFF' || token === '0' || token === 'FALSE') return false
  return null
}

function echo(command: string, detail: string): string {
  return detail ? `> ${command} ${detail}` : `> ${command}`
}

/**
 * Parse one command line into the next view plus echo lines.
 * Returns null when the line is not a shared instrument command, so a
 * project can handle its own verbs first.
 */
export function applyInstrumentCommand(view: InstrumentView, raw: string): InstrumentCommandResult | null {
  const line = raw.trim().replace(/\s+/g, ' ')
  if (!line) return { view, lines: [] }
  const [head, ...rest] = line.split(' ')
  const command = head.toUpperCase()
  const args = rest.join(' ').trim()

  if (command === 'HELP' || command === '?') {
    return { view, lines: HELP_LINES }
  }

  if (command === 'DOWNLINK') {
    return { view, lines: [echo('DOWNLINK', 'RECEIVED')] }
  }

  if (command === 'POINT' || command === 'AIM') {
    const token = args.toUpperCase()
    const cardinal: Record<string, 'n' | 's' | 'e' | 'w' | 'reset'> = {
      N: 'n', NORTH: 'n', UP: 'n',
      S: 's', SOUTH: 's', DOWN: 's',
      E: 'e', EAST: 'e', RIGHT: 'e',
      W: 'w', WEST: 'w', LEFT: 'w',
      RESET: 'reset', CENTER: 'reset', CENTRE: 'reset',
    }
    if (cardinal[token]) {
      const next = nudgeAim(view, cardinal[token])
      return { view: next, lines: [echo('POINT', `${token}  OK`)] }
    }
    const parts = args.split(' ').map(Number)
    if (parts.length === 2 && parts.every(Number.isFinite)) {
      const limit = INSTRUMENT_LIMITS.pan
      const next = {
        ...view,
        panX: clamp(round2(parts[0]), -limit, limit),
        panY: clamp(round2(parts[1]), -limit, limit),
      }
      return { view: next, lines: [echo('POINT', `${next.panX} ${next.panY}  OK`)] }
    }
    return { view, lines: [echo('POINT', 'USE N S E W OR RESET')] }
  }

  if (command === 'ZOOM') {
    const token = args.toUpperCase()
    if (token === 'IN') return { view: setZoom(view, view.zoom + 0.25), lines: [echo('ZOOM', 'IN  OK')] }
    if (token === 'OUT') return { view: setZoom(view, view.zoom - 0.25), lines: [echo('ZOOM', 'OUT  OK')] }
    const value = Number(args)
    if (!Number.isFinite(value)) return { view, lines: [echo('ZOOM', 'USE 1-3')] }
    const next = setZoom(view, value)
    return { view: next, lines: [echo('ZOOM', `${next.zoom}  OK`)] }
  }

  if (command === 'FOCUS') {
    const value = Number(args)
    if (!Number.isFinite(value)) return { view, lines: [echo('FOCUS', 'USE 0-100')] }
    const unit = value > 1 ? value / 100 : value
    const next = setFocus(view, unit)
    return { view: next, lines: [echo('FOCUS', `${Math.round(next.focus * 100)}  OK`)] }
  }

  if (command === 'EXPOSE' || command === 'EXPOSURE') {
    const token = args.replace(/s$/i, '')
    const value = Number(token)
    if (!Number.isFinite(value)) return { view, lines: [echo('EXPOSE', 'USE 0.6-1.8')] }
    const next = setExposure(view, value)
    return { view: next, lines: [echo('EXPOSE', `${next.exposure}  OK`)] }
  }

  if (command === 'STRETCH') {
    const flag = onOff(args)
    if (flag == null) return { view, lines: [echo('STRETCH', 'USE ON OR OFF')] }
    return { view: { ...view, stretch: flag }, lines: [echo('STRETCH', `${flag ? 'ON' : 'OFF'}  OK`)] }
  }

  if (command === 'INVERT') {
    if (!args) {
      const invert = !view.invert
      return { view: { ...view, invert }, lines: [echo('INVERT', `${invert ? 'ON' : 'OFF'}  OK`)] }
    }
    const flag = onOff(args)
    if (flag == null) return { view, lines: [echo('INVERT', 'USE ON OR OFF')] }
    return { view: { ...view, invert: flag }, lines: [echo('INVERT', `${flag ? 'ON' : 'OFF'}  OK`)] }
  }

  return null
}
