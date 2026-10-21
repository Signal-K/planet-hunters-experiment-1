import { describe, expect, it } from 'vitest'
import type { ScenePreset, Thing } from './docs'
import { composeSetup, defaultSelection, groupThings, matchingPreset, presetId, presetSelection, sameSelection, setValue, toggleThing } from './things'

const things: Thing[] = [
  { id: 'launchpad', label: 'Launchpad', group: 'Structures', default: true, state: { player: { placed: ['launchpad'], placementPlots: { launchpad: 0 } } } },
  { id: 'hangar', label: 'Hangar', group: 'Structures', state: { player: { placed: ['hangar'], placementPlots: { hangar: 4 } } } },
  { id: 'night', label: 'Night', group: 'Time of day', exclusive: 'time', query: { time: 'night' } },
  { id: 'dawn', label: 'Dawn', group: 'Time of day', exclusive: 'time', default: true, query: { time: 'dawn' } },
  { id: 'rain', label: 'Rain', group: 'Weather', query: { sky: 'rain' } },
  { id: 'comet', label: 'Comet', group: 'Weather', query: { sky: 'comet' } },
  { id: 'minutes', label: 'Minutes in', group: 'Flight', range: { min: 0, max: 60, step: 5, value: 20 }, state: { player: { transitStartedAt: '@now-{value}m', arrivalAt: '@now+{rest}m' } } },
]

describe('selection', () => {
  it('starts from the things marked default, and every slider at its own value', () => {
    expect(defaultSelection(things)).toEqual({ on: ['launchpad', 'dawn'], values: { minutes: 20 } })
  })

  it('treats a preset that lists things as exactly those, and one that does not as the start', () => {
    expect(presetSelection({ id: 'a', name: 'A', things: ['hangar', 'night'], values: { minutes: 50 } }, things)).toEqual({ on: ['hangar', 'night'], values: { minutes: 50 } })
    expect(presetSelection({ id: 'b', name: 'B' }, things)).toEqual(defaultSelection(things))
    expect(presetSelection({ id: 'c', name: 'C', things: ['gone', 'hangar'] }, things).on).toEqual(['hangar'])
  })

  it('switches things on and off, and lets only one of a choice stand', () => {
    let s = defaultSelection(things)
    s = toggleThing(s, things, 'hangar')
    expect(s.on).toEqual(['launchpad', 'dawn', 'hangar'])
    s = toggleThing(s, things, 'night')
    expect(s.on).toEqual(['launchpad', 'hangar', 'night'])
    s = toggleThing(s, things, 'night')
    expect(s.on).toEqual(['launchpad', 'hangar'])
    s = toggleThing(s, things, 'rain')
    s = toggleThing(s, things, 'comet')
    expect(s.on).toContain('rain')
    expect(s.on).toContain('comet')
  })

  it('ignores a toggle on a slider or an unknown thing', () => {
    const s = defaultSelection(things)
    expect(toggleThing(s, things, 'minutes')).toBe(s)
    expect(toggleThing(s, things, 'nope')).toBe(s)
  })

  it('compares selections by what is on and where the sliders are', () => {
    const a = defaultSelection(things)
    expect(sameSelection(a, { on: ['dawn', 'launchpad'], values: { minutes: 20 } }, things)).toBe(true)
    expect(sameSelection(a, { on: ['launchpad'], values: { minutes: 20 } }, things)).toBe(false)
    expect(sameSelection(a, setValue(a, 'minutes', 30), things)).toBe(false)
  })
})

describe('composeSetup', () => {
  it('layers what is on, in script order, and joins URL knobs that share a key', () => {
    let s = defaultSelection(things)
    s = toggleThing(toggleThing(toggleThing(s, things, 'hangar'), things, 'rain'), things, 'comet')
    const setup = composeSetup(things, s)
    expect(setup.state.player).toMatchObject({ placed: ['launchpad', 'hangar'], placementPlots: { launchpad: 0, hangar: 4 } })
    expect(setup.query).toEqual({ time: 'dawn', sky: 'rain,comet' })
  })

  it('always applies sliders, filling their placeholders', () => {
    const setup = composeSetup(things, setValue({ on: [], values: {} }, 'minutes', 45))
    expect(setup.state).toEqual({ player: { transitStartedAt: '@now-45m', arrivalAt: '@now+15m' } })
  })

  it('uses a slider own value when the selection has none', () => {
    expect(composeSetup(things, { on: [], values: {} }).state).toEqual({ player: { transitStartedAt: '@now-20m', arrivalAt: '@now+40m' } })
  })

  it('is empty when nothing is on and no thing has anything to say', () => {
    expect(composeSetup([{ id: 'x', label: 'X' }], { on: ['x'], values: {} })).toEqual({ state: {}, query: {} })
  })
})

describe('groupThings', () => {
  it('keeps group and item order, and files ungrouped things under Other', () => {
    const groups = groupThings([...things, { id: 'loose', label: 'Loose' }])
    expect(groups.map(g => g.name)).toEqual(['Structures', 'Time of day', 'Weather', 'Flight', 'Other'])
    expect(groups[0].items.map(t => t.id)).toEqual(['launchpad', 'hangar'])
  })
})

describe('presets', () => {
  const presets: ScenePreset[] = [{ id: 'quiet', name: 'Quiet', things: ['launchpad', 'dawn'] }, { id: 'busy', name: 'Busy', things: ['launchpad', 'hangar', 'night'] }]
  it('finds the preset a selection equals', () => {
    expect(matchingPreset(defaultSelection(things), presets, things)?.id).toBe('quiet')
    expect(matchingPreset({ on: ['hangar', 'night', 'launchpad'], values: { minutes: 20 } }, presets, things)?.id).toBe('busy')
    expect(matchingPreset({ on: ['hangar'], values: { minutes: 20 } }, presets, things)).toBeNull()
  })
  it('makes a free id from a name', () => {
    expect(presetId('Busy base, at NIGHT!', [])).toBe('busy-base-at-night')
    expect(presetId('Busy', ['busy', 'busy-2'])).toBe('busy-3')
    expect(presetId('???', [])).toBe('preset')
  })
})
