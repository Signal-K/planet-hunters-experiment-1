'use client'

import { useEffect, useState } from 'react'

/**
 * A scene that mounts but paints nothing leaves the player on a black screen
 * with no clue why. This watches the intro, and if its title is not actually
 * visible a few seconds after load it prints what the page knows: the route,
 * the game state flags, what is in the DOM and every console error so far.
 * Nothing shows while the intro is healthy.
 */

const MAX_LOGS = 60
const logs: string[] = []
let installed = false

function record(kind: string, parts: unknown[]) {
  const text = parts.map(part => {
    if (part instanceof Error) return `${part.name}: ${part.message}`
    if (typeof part === 'string') return part
    try { return JSON.stringify(part) } catch { return String(part) }
  }).join(' ').slice(0, 400)
  logs.push(`${new Date().toISOString().slice(11, 23)} ${kind} ${text}`)
  if (logs.length > MAX_LOGS) logs.shift()
}

// Installed when this module loads, so errors from before the intro mounts are kept too.
function installLogCapture() {
  if (installed || typeof window === 'undefined') return
  installed = true
  for (const kind of ['error', 'warn'] as const) {
    const original = console[kind]
    console[kind] = (...args: unknown[]) => {
      record(`console.${kind}`, args)
      original.apply(console, args as [])
    }
  }
  window.addEventListener('error', event => record('window.error', [event.error ?? event.message]))
  window.addEventListener('unhandledrejection', event => record('unhandledrejection', [event.reason]))
}
installLogCapture()

function introVisible(): boolean {
  const title = document.querySelector('[data-testid="intro-title"]')
  if (!title) return false
  const rect = title.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
  // Something opaque on top of the title (the scene veil, a stuck overlay) counts as blank.
  return !!top && (top === title || title.contains(top) || !!top.closest('.intro-content'))
}

// Average brightness (0-255) of the first canvas, or null when it cannot be read (e.g. WebGL).
function canvasLuma(): number | null {
  const canvas = document.querySelector('.game-screen-area canvas') as HTMLCanvasElement | null
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null
  try {
    const probe = document.createElement('canvas')
    probe.width = 16
    probe.height = 16
    const ctx = probe.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(canvas, 0, 0, 16, 16)
    const { data } = ctx.getImageData(0, 0, 16, 16)
    let total = 0
    for (let i = 0; i < data.length; i += 4) total += (data[i] + data[i + 1] + data[i + 2]) / 3
    return Math.round(total / (data.length / 4))
  } catch {
    return null
  }
}

// A non-intro screen counts as painted when its area has size and any canvas is not solid black.
function otherScreenPainted(): boolean {
  const area = document.querySelector('.game-screen-area')
  const rect = area?.getBoundingClientRect()
  if (!area || !rect || rect.width === 0 || rect.height === 0 || area.childElementCount === 0) return false
  const luma = canvasLuma()
  return luma === null || luma > 2
}

function collect(state: Record<string, unknown>): string {
  const veil = document.querySelector('.scene-transition-veil') as HTMLElement | null
  const facts = {
    url: window.location.pathname + window.location.search,
    ...state,
    online: navigator.onLine,
    serviceWorker: navigator.serviceWorker?.controller ? 'controlled' : 'none',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    introScreenEls: document.querySelectorAll('.intro-screen').length,
    introTitleEls: document.querySelectorAll('[data-testid="intro-title"]').length,
    introMode: document.querySelector('.intro-content')?.getAttribute('data-mode') ?? null,
    screenAreaChildren: document.querySelector('.game-screen-area')?.childElementCount ?? null,
    veilPhase: veil?.dataset.phase ?? null,
    veilOpacity: veil ? getComputedStyle(veil).opacity : null,
    canvases: document.querySelectorAll('canvas').length,
    canvasBrightness: canvasLuma(),
  }
  return [
    ...Object.entries(facts).map(([key, value]) => `${key}: ${String(value)}`),
    '',
    logs.length ? 'LOG' : 'LOG (no console errors recorded)',
    ...logs,
  ].join('\n')
}

export default function BlankSceneDiagnostics({ active, state }: { active: boolean; state: Record<string, unknown> }) {
  const [report, setReport] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const stateKey = JSON.stringify(state)

  useEffect(() => {
    if (!active) {
      setReport(null)
      return
    }
    const check = () => {
      const current = JSON.parse(stateKey) as Record<string, unknown>
      // Opened on /game/intro but the game moved to another screen: healthy if that screen painted.
      const otherScreenUp = current.screen !== 'intro' && otherScreenPainted()
      setReport(introVisible() || otherScreenUp ? null : collect(current))
    }
    const first = window.setTimeout(check, 4000)
    const repeat = window.setInterval(check, 2000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(repeat)
    }
  }, [active, stateKey])

  if (!report || dismissed) return null

  const button = {
    minHeight: 44, padding: '10px 20px', background: 'transparent', color: '#00e5ff',
    border: '1px solid rgba(0, 229, 255, 0.5)', borderRadius: 4, fontSize: 14, cursor: 'pointer',
  } as const

  return (
    <div role="alert" style={{
      position: 'fixed', inset: 0, zIndex: 100000, overflow: 'auto', background: '#070b12',
      color: '#fff', padding: 16, fontFamily: 'ui-monospace, monospace', fontSize: 14,
    }}>
      <h1 style={{ fontSize: 18, color: '#00e5ff', margin: '0 0 8px' }}>SCENE DID NOT RENDER</h1>
      <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.7)' }}>
        The intro stayed blank. Send this to Liam.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button style={button} onClick={() => {
          void navigator.clipboard?.writeText(report).then(() => setCopied(true)).catch(() => {})
        }}>{copied ? 'COPIED' : 'COPY LOG'}</button>
        <button style={button} onClick={() => window.location.reload()}>RELOAD</button>
        <button style={button} onClick={() => { window.location.href = '/game/hub' }}>GO TO HUB</button>
        <button style={button} onClick={() => setDismissed(true)}>HIDE</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, userSelect: 'text' }}>{report}</pre>
    </div>
  )
}
