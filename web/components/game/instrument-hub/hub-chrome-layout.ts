/** Percentage hit regions aligned to plate-j-console.jpg (1280×720). */

export interface ChromeRect {
  id: string
  label: string
  left: number
  top: number
  width: number
  height: number
  kind: 'knob' | 'dial' | 'toggle' | 'slider-h' | 'button' | 'grid' | 'light'
}

export const INSTRUMENT_HUB_ASSETS = {
  plate: '/game/assets/instrument-hub/plate-j-console.jpg',
  warmWindow: '/game/assets/instrument-hub/window-warm-daylight.jpg',
} as const

export const CLASSIFY_SCREEN_RECT = {
  left: 21.5,
  top: 15.5,
  width: 57,
  height: 49,
} as const

export const QUEUE_READOUT_RECT = {
  left: 24,
  top: 67,
  width: 52,
  height: 18,
} as const

export const CHROME_CONTROLS: ChromeRect[] = [
  { id: 'filter-all', label: 'Show all sources', left: 3.2, top: 18, width: 3.8, height: 4.5, kind: 'light' },
  { id: 'filter-transit', label: 'Transit telescope filter', left: 7.4, top: 18, width: 3.8, height: 4.5, kind: 'light' },
  { id: 'filter-neocp', label: 'NEOCP filter', left: 11.6, top: 18, width: 3.8, height: 4.5, kind: 'light' },
  { id: 'filter-unresolved', label: 'Unresolved only', left: 15.8, top: 18, width: 3.8, height: 4.5, kind: 'light' },
  { id: 'gain-knob', label: 'Receiver gain', left: 7.5, top: 27, width: 8, height: 10, kind: 'knob' },
  { id: 'select-0', label: 'Queue slot 1', left: 4.5, top: 39, width: 3.5, height: 3.5, kind: 'light' },
  { id: 'select-1', label: 'Queue slot 2', left: 8.5, top: 39, width: 3.5, height: 3.5, kind: 'light' },
  { id: 'select-2', label: 'Queue slot 3', left: 12.5, top: 39, width: 3.5, height: 3.5, kind: 'light' },
  { id: 'select-3', label: 'Queue slot 4', left: 16.5, top: 39, width: 3.5, height: 3.5, kind: 'light' },
  { id: 'arm-inspector', label: 'Open inspector', left: 14, top: 43, width: 5.5, height: 5.5, kind: 'button' },
  { id: 'toggle-transit', label: 'Transit link toggle', left: 5, top: 50, width: 3.2, height: 8, kind: 'toggle' },
  { id: 'toggle-neocp', label: 'NEOCP link toggle', left: 9, top: 50, width: 3.2, height: 8, kind: 'toggle' },
  { id: 'scrub-slider', label: 'Preview scrub', left: 4, top: 59, width: 14, height: 4, kind: 'slider-h' },
  { id: 'zoom-dial', label: 'Preview zoom', left: 82, top: 22, width: 10, height: 12, kind: 'dial' },
  { id: 'toggle-arm', label: 'Arm inspector', left: 80.5, top: 38, width: 3, height: 7, kind: 'toggle' },
  { id: 'toggle-snooze', label: 'Snooze orbit ping', left: 84, top: 38, width: 3, height: 7, kind: 'toggle' },
  { id: 'toggle-highlight', label: 'High signal emphasis', left: 87.5, top: 38, width: 3, height: 7, kind: 'toggle' },
  { id: 'toggle-auto', label: 'Auto-advance queue', left: 91, top: 38, width: 3, height: 7, kind: 'toggle' },
  { id: 'zoom-slider', label: 'Fine zoom', left: 80, top: 59, width: 14, height: 4, kind: 'slider-h' },
  { id: 'matrix-grid', label: 'Signal matrix', left: 3, top: 70, width: 18, height: 16, kind: 'grid' },
  { id: 'snooze-ping', label: 'Dismiss hub ping', left: 88, top: 72, width: 4, height: 4, kind: 'button' },
  { id: 'gain-fine-0', label: 'Gain trim 1', left: 5, top: 52, width: 2.8, height: 2.8, kind: 'knob' },
  { id: 'gain-fine-1', label: 'Gain trim 2', left: 8.8, top: 52, width: 2.8, height: 2.8, kind: 'knob' },
  { id: 'gain-fine-2', label: 'Gain trim 3', left: 12.6, top: 52, width: 2.8, height: 2.8, kind: 'knob' },
  { id: 'gain-fine-3', label: 'Gain trim 4', left: 16.4, top: 52, width: 2.8, height: 2.8, kind: 'knob' },
]
