// Scene sandbox (SSL-641): a stage state that stands on its own.
//
// A real save carries campaign context: a balance, tutorial steps, coach marks, follow-up prompts, today's sky events.
// A scene being looked at should carry none of it, so you can open the in-flight scene without having finished the
// mission that leads to it. `sandbox:<entry>[:<setup>]` takes any stage fixture as the shape a screen needs (which screen,
// which mission, which ship), strips the context, and layers a setup on top: the things a scene script lets you switch on.
import type { GameState } from '@/lib/game-types'

export const SANDBOX_PREFIX = 'sandbox:'

/** Money is never the point of a sandbox scene, and nothing in it should be out of reach. */
export const SANDBOX_FRANCS = 5_000_000_000

/** A fixed noon far from every sky event window, so what the sky shows never depends on the day the Studio is opened. */
export const SANDBOX_NOW = new Date(2026, 2, 4, 12, 0, 0, 0).getTime()

/** Larger than any prompt's own counter, so a dismissed prompt stays dismissed. */
const NEVER = 1_000_000_000
const ALL_STEPS: Record<number, boolean> = Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 8, 9, 30, 31, 32, 33, 40, 41].map(step => [step, true]))

type Obj = Record<string, unknown>
const isObject = (value: unknown): value is Obj => !!value && typeof value === 'object' && !Array.isArray(value)

/** A fixture with its campaign context removed: no tutorial, no coach, no prompts, a full purse. The shape the screen needs stays. */
export function sandboxify(base: Partial<GameState>): Partial<GameState> {
  const { player } = base
  return {
    ...base,
    tutorial: false,
    doneSteps: ALL_STEPS,
    popup: null,
    menuOpen: false,
    ...(player ? {
      player: {
        ...player,
        freeOperations: true,
        francs: Math.max(player.francs ?? 0, SANDBOX_FRANCS),
        dismissedHubPrompts: { ...player.dismissedHubPrompts, skills: NEVER, 'transit-telescope': NEVER },
      },
    } : {}),
  }
}

/**
 * Layers `patch` over `base`. Tables merge key by key, lists gain the entries they lack, anything else is replaced.
 * That is the whole rule a scene script's `state` follows, so two things that both add to `player.placed` never fight.
 */
export function mergeState<T>(base: T, patch: unknown): T {
  if (patch === undefined) return base
  if (Array.isArray(base) && Array.isArray(patch)) {
    const seen = new Set(base.map(item => JSON.stringify(item)))
    return [...base, ...patch.filter(item => !seen.has(JSON.stringify(item)))] as T
  }
  if (isObject(base) && isObject(patch)) {
    const out: Obj = { ...base }
    for (const [key, value] of Object.entries(patch)) out[key] = key in base ? mergeState(base[key], value) : value
    return out as T
  }
  return patch as T
}

const NOW_TOKEN = /^@now(?:([+-])(\d+(?:\.\d+)?)(s|m|h|d))?$/
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const

/** `"@now"`, `"@now-30s"`, `"@now+2h"` become that instant in ms, so a script can say when something started without a clock in it. */
export function resolveTokens(value: unknown, now: number): unknown {
  if (typeof value === 'string') {
    const match = NOW_TOKEN.exec(value)
    if (!match) return value
    if (!match[1]) return now
    const ms = Number(match[2]) * UNIT_MS[match[3] as keyof typeof UNIT_MS]
    return match[1] === '-' ? now - ms : now + ms
  }
  if (Array.isArray(value)) return value.map(item => resolveTokens(item, now))
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveTokens(item, now)]))
  return value
}

/** A range thing's `{value}` is the slider position and `{rest}` is what is left of its `max`. */
export function fillPlaceholders(value: unknown, vars: { value: number; rest: number }): unknown {
  if (typeof value === 'string') return value.replaceAll('{value}', String(vars.value)).replaceAll('{rest}', String(vars.rest))
  if (Array.isArray(value)) return value.map(item => fillPlaceholders(item, vars))
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillPlaceholders(item, vars)]))
  return value
}

const toBase64Url = (text: string): string => {
  let binary = ''
  new TextEncoder().encode(text).forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
const fromBase64Url = (text: string): string => {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
}

const ENTRY = /^[a-z0-9][a-z0-9-]*$/

/** The `preset=` value that opens the stage in the sandbox: an entry fixture plus the state a setup adds. */
export function sandboxName(entry: string, state?: Obj): string {
  return `${SANDBOX_PREFIX}${entry}${state && Object.keys(state).length ? `:${toBase64Url(JSON.stringify(state))}` : ''}`
}

export function parseSandboxName(name: string): { entry: string; state: Obj } | null {
  if (!name.startsWith(SANDBOX_PREFIX)) return null
  const [entry, payload] = name.slice(SANDBOX_PREFIX.length).split(':')
  if (!ENTRY.test(entry ?? '')) return null
  if (!payload) return { entry, state: {} }
  try {
    const state: unknown = JSON.parse(fromBase64Url(payload))
    return isObject(state) ? { entry, state } : null
  } catch {
    return null
  }
}

export const isSandboxName = (name: string | null | undefined): boolean => !!name && name.startsWith(SANDBOX_PREFIX)

export function resolveSandbox(name: string, resolveEntry: (key: string) => Partial<GameState> | null, now = Date.now()): Partial<GameState> | null {
  const parsed = parseSandboxName(name)
  const base = parsed ? resolveEntry(parsed.entry) : null
  if (!parsed || !base) return null
  const neutral = sandboxify(base)
  return Object.keys(parsed.state).length ? mergeState(neutral, resolveTokens(parsed.state, now)) : neutral
}
