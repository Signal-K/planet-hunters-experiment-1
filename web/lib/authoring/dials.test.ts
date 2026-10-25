import { describe, expect, it } from 'vitest'
import { expandDials } from './dials.ts'

describe('dials', () => {
  it('turns one line into a choice of things with one default', () => {
    const things = expandDials({ time: { label: 'Time of day', query: 'time', default: 'midday', options: ['dawn', 'midday'] } })
    expect(things).toEqual([
      { id: 'dawn', label: 'Dawn', group: 'Time of day', exclusive: 'time', query: { time: 'dawn' } },
      { id: 'midday', label: 'Midday', group: 'Time of day', exclusive: 'time', default: true, query: { time: 'midday' } },
    ])
  })

  it('pick any makes switches, id=value sends a different value, state paths nest', () => {
    const [launch] = expandDials({ sky: { pick: 'any', query: 'sky', options: ['rocket-launch=launch'] } })
    expect(launch).toMatchObject({ id: 'rocket-launch', label: 'Rocket launch', query: { sky: 'launch' } })
    expect(launch.exclusive).toBeUndefined()
    const [desert] = expandDials({ land: { state: 'player.earthBiome', options: ['desert'] } })
    expect(desert.state).toEqual({ player: { earthBiome: 'desert' } })
  })
})
