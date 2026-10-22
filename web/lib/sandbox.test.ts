import { describe, expect, it } from 'vitest'
import type { GameState } from '@/lib/game-types'
import { isHubPromptDismissed } from '@/lib/hub-prompts'
import { SANDBOX_FRANCS, fillPlaceholders, isSandboxName, mergeState, parseSandboxName, resolveSandbox, resolveTokens, sandboxName, sandboxify } from './sandbox'

const campaign = {
  screen: 'hub',
  tutorial: true,
  doneSteps: { 0: true },
  popup: 'welcome',
  menuOpen: true,
  missionId: 'm-1',
  targetId: 'eros',
  player: { francs: 12, missionsDone: 0, freeOperations: false, placed: ['launchpad'], placementPlots: { launchpad: 0 }, dismissedHubPrompts: { other: 4 } },
} as unknown as Partial<GameState>

describe('sandboxify', () => {
  it('strips the campaign: no tutorial, no popup, no prompts, a full purse, every step done', () => {
    const state = sandboxify(campaign)
    expect(state.tutorial).toBe(false)
    expect(state.popup).toBeNull()
    expect(state.menuOpen).toBe(false)
    expect(Object.keys(state.doneSteps ?? {}).length).toBeGreaterThan(10)
    expect(state.player?.francs).toBe(SANDBOX_FRANCS)
    expect(state.player?.freeOperations).toBe(true)
    const player = state.player!
    expect(isHubPromptDismissed(player, 'skills')).toBe(true)
    expect(isHubPromptDismissed(player, 'transit-telescope')).toBe(true)
    expect(isHubPromptDismissed({ ...player, skillPoints: 50_000 }, 'skills')).toBe(true)
  })

  it('keeps the shape the screen needs', () => {
    const state = sandboxify(campaign)
    expect(state.screen).toBe('hub')
    expect(state.missionId).toBe('m-1')
    expect(state.targetId).toBe('eros')
    expect(state.player?.placed).toEqual(['launchpad'])
    expect(state.player?.dismissedHubPrompts).toMatchObject({ other: 4 })
  })

  it('never lowers a bigger purse', () => {
    expect(sandboxify({ player: { francs: SANDBOX_FRANCS * 2 } as GameState['player'] }).player?.francs).toBe(SANDBOX_FRANCS * 2)
  })
})

describe('mergeState', () => {
  it('merges tables key by key', () => {
    expect(mergeState({ player: { a: 1, b: { c: 1 } } }, { player: { b: { d: 2 } } })).toEqual({ player: { a: 1, b: { c: 1, d: 2 } } })
  })
  it('adds the list entries a list lacks, in order', () => {
    expect(mergeState({ placed: ['launchpad'] }, { placed: ['hangar', 'launchpad'] })).toEqual({ placed: ['launchpad', 'hangar'] })
    expect(mergeState({ rockets: [{ id: 'a' }] }, { rockets: [{ id: 'a' }, { id: 'b' }] })).toEqual({ rockets: [{ id: 'a' }, { id: 'b' }] })
  })
  it('replaces anything else, and ignores undefined', () => {
    expect(mergeState({ n: 1, s: 'a' }, { n: 2, s: undefined })).toEqual({ n: 2, s: 'a' })
    expect(mergeState({ a: [1] }, { a: 'x' })).toEqual({ a: 'x' })
  })
  it('does not change its inputs', () => {
    const base = { player: { placed: ['a'] } }
    mergeState(base, { player: { placed: ['b'] } })
    expect(base).toEqual({ player: { placed: ['a'] } })
  })
})

describe('resolveTokens', () => {
  const now = 1_000_000_000_000
  it('turns @now tokens into instants', () => {
    expect(resolveTokens({ a: '@now', b: '@now-30s', c: '@now+2h', d: '@now-1.5m', e: ['@now+1d'] }, now)).toEqual({
      a: now, b: now - 30_000, c: now + 7_200_000, d: now - 90_000, e: [now + 86_400_000],
    })
  })
  it('leaves other strings and values alone', () => {
    expect(resolveTokens({ a: 'now', b: '@nowish', c: 3, d: true, e: '@now-5x' }, now)).toEqual({ a: 'now', b: '@nowish', c: 3, d: true, e: '@now-5x' })
  })
})

describe('fillPlaceholders', () => {
  it('fills {value} and {rest} inside strings, at any depth', () => {
    expect(fillPlaceholders({ player: { started: '@now-{value}m', arrives: ['@now+{rest}m'] } }, { value: 20, rest: 40 })).toEqual({ player: { started: '@now-20m', arrives: ['@now+40m'] } })
  })
})

describe('sandbox names', () => {
  it('names an entry with no setup plainly', () => {
    expect(sandboxName('sandbox-hub')).toBe('sandbox:sandbox-hub')
    expect(parseSandboxName('sandbox:sandbox-hub')).toEqual({ entry: 'sandbox-hub', state: {} })
  })
  it('round-trips a setup, including text outside ASCII', () => {
    const state = { player: { placed: ['hangar'], label: 'Zażółć gęślą jaźń' }, targetId: 'eros' }
    const name = sandboxName('m1-hub', state)
    expect(name).toMatch(/^sandbox:m1-hub:[A-Za-z0-9_-]+$/)
    expect(parseSandboxName(name)).toEqual({ entry: 'm1-hub', state })
  })
  it('refuses anything that is not a sandbox name', () => {
    expect(parseSandboxName('cp-mid')).toBeNull()
    expect(parseSandboxName('sandbox:')).toBeNull()
    expect(parseSandboxName('sandbox:Bad Entry')).toBeNull()
    expect(parseSandboxName('sandbox:ok:%%%')).toBeNull()
    expect(isSandboxName('sandbox:x')).toBe(true)
    expect(isSandboxName('cp-mid')).toBe(false)
    expect(isSandboxName(null)).toBe(false)
  })
})

describe('resolveSandbox', () => {
  const now = 5_000_000
  const entry = (key: string) => (key === 'm1-hub' ? campaign : null)
  it('layers the setup over the neutralised entry and resolves tokens', () => {
    const name = sandboxName('m1-hub', { player: { placed: ['hangar'], transitStartedAt: '@now-30s' } })
    const state = resolveSandbox(name, entry, now)!
    expect(state.tutorial).toBe(false)
    expect(state.player?.placed).toEqual(['launchpad', 'hangar'])
    expect((state.player as unknown as { transitStartedAt: number }).transitStartedAt).toBe(now - 30_000)
  })
  it('is the neutral entry when there is no setup', () => {
    expect(resolveSandbox('sandbox:m1-hub', entry, now)).toEqual(sandboxify(campaign))
  })
  it('is null for an entry that does not exist or a name that is not a sandbox', () => {
    expect(resolveSandbox('sandbox:nope', entry, now)).toBeNull()
    expect(resolveSandbox('m1-hub', entry, now)).toBeNull()
  })
})
