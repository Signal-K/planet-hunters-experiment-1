// Rolling buffer of console errors, warnings, window errors and unhandled rejections, installed when
// this module first loads so errors from before a scene mounts are kept. Read by the blank-scene
// and scene-crash reports.
const MAX_LOGS = 60
const logs: string[] = []
let installed = false

export function recordLog(kind: string, parts: unknown[]) {
  const text = parts.map(part => {
    if (part instanceof Error) return `${part.name}: ${part.message}`
    if (typeof part === 'string') return part
    try { return JSON.stringify(part) } catch { return String(part) }
  }).join(' ').slice(0, 400)
  logs.push(`${new Date().toISOString().slice(11, 23)} ${kind} ${text}`)
  if (logs.length > MAX_LOGS) logs.shift()
}

export function getLogs(): readonly string[] {
  return logs
}

export function installLogCapture() {
  if (installed || typeof window === 'undefined') return
  installed = true
  for (const kind of ['error', 'warn'] as const) {
    const original = console[kind]
    console[kind] = (...args: unknown[]) => {
      recordLog(`console.${kind}`, args)
      original.apply(console, args as [])
    }
  }
  window.addEventListener('error', event => recordLog('window.error', [event.error ?? event.message]))
  window.addEventListener('unhandledrejection', event => recordLog('unhandledrejection', [event.reason]))
}

installLogCapture()
