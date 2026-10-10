import { describe, expect, it } from 'vitest'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import {
  buildControlStation,
  type ControlStationCatalog,
  type StationPlayer,
} from './control-station'

const signal = (partial: Pick<InstrumentSignal, 'id' | 'kind'> & Partial<InstrumentSignal>): InstrumentSignal => ({
  instrumentId: partial.kind,
  title: partial.id,
  subtitle: '',
  inspectorScreen: partial.kind === 'transit' ? 'galaxy' : partial.kind === 'saturn' ? 'saturn-storm-search' : 'asteroid-discovery',
  ...partial,
})

const launched: StationPlayer = {
  freeOperations: true,
  placed: ['ground-telescope'],
  transitSatelliteLaunchedAt: 1,
  deepSpaceTelescopeBuilt: true,
  saturnImagerLaunchedAt: 1,
}

const signals: InstrumentSignal[] = [
  signal({ id: 'toi-1', kind: 'transit' }),
  signal({ id: 'neo-1', kind: 'deep-space' }),
  signal({ id: 'neo-2', kind: 'deep-space' }),
  signal({ id: 'frame-1', kind: 'saturn' }),
]

function row(player: StationPlayer, id: string, bodyId = 'all') {
  const model = buildControlStation({ player, signals, bodyId })
  return model.groups.flatMap(group => group.rows).find(item => item.equipmentId === id)
}

describe('control station registry', () => {
  it('lists current equipment by location with project tags', () => {
    const model = buildControlStation({ player: launched, signals, bodyId: 'all' })
    expect(model.groups.map(group => group.label)).toEqual(['Earth · Surface', 'Earth · Orbit', 'Saturn'])
    expect(model.groups[0]?.rows.map(item => item.name)).toEqual(['Ground telescopes'])
    expect(model.groups[1]?.rows.map(item => item.name)).toEqual(['Transit Telescope', 'Deep Space Telescope'])
    expect(model.groups[2]?.rows.map(item => item.name)).toEqual(['Saturn satellite'])
    expect(row(launched, 'transit-telescope')?.projects.map(project => project.label)).toEqual(['Exoplanet Hunters'])
    expect(row(launched, 'ground-telescopes')?.projects.map(project => project.label)).toEqual(['Asteroid discovery'])
    expect(row(launched, 'saturn-imager')?.projects.map(project => project.label)).toEqual(['Saturn storms'])
  })

  it('shares one NEOCP queue between ground telescopes and the deep space telescope', () => {
    const ground = row(launched, 'ground-telescopes')
    const deep = row(launched, 'deep-space-telescope')
    expect(ground?.readyCount).toBe(2)
    expect(deep?.readyCount).toBe(2)
    expect(ground?.openSignal?.id).toBe('neo-1')
    expect(deep?.openSignal?.inspectorScreen).toBe('asteroid-discovery')
    expect(row(launched, 'transit-telescope')?.openSignal).toMatchObject({ id: 'toi-1', inspectorScreen: 'galaxy' })
    expect(row(launched, 'saturn-imager')).toMatchObject({ status: 'Frame ready', readyCount: 1 })
    expect(row(launched, 'saturn-imager')?.openSignal?.inspectorScreen).toBe('saturn-storm-search')
  })

  it('keeps a built ground telescope closed until the shared feed is live', () => {
    const player: StationPlayer = { freeOperations: true, placed: ['ground-telescope'] }
    const model = buildControlStation({ player, signals, bodyId: 'all' })
    expect(model.groups.flatMap(group => group.rows).map(item => item.equipmentId)).toEqual(['ground-telescopes'])
    expect(model.groups[0]?.rows[0]).toMatchObject({ status: 'Standing by', readyCount: 0, openSignal: null, buildPrompt: false })
    expect(model.markers.map(marker => marker.equipmentId)).toEqual(['ground-telescopes'])
    expect(model.filters.map(filter => filter.id)).toEqual(['all', 'earth'])
  })

  it('asks the player to build ground telescopes instead of listing a standing one', () => {
    const player: StationPlayer = { freeOperations: true }
    const model = buildControlStation({ player, signals, bodyId: 'all' })
    const rows = model.groups.flatMap(group => group.rows)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      equipmentId: 'ground-telescopes',
      status: 'None built',
      live: false,
      readyCount: 0,
      openSignal: null,
      buildPrompt: true,
    })
    expect(rows.some(item => item.status === 'Standing by')).toBe(false)
    expect(model.markers).toEqual([])
    expect(model.emptyLabel).toBeNull()
  })

  it('shows no build prompt before Free Operations', () => {
    const model = buildControlStation({ player: {}, signals, bodyId: 'all' })
    expect(model.groups).toEqual([])
    expect(model.emptyLabel).toBe('Equipment links once Free Operations is open.')
  })

  it('hides a player-launched instrument until that launch', () => {
    const player: StationPlayer = { freeOperations: true, deepSpaceTelescopeBuilt: true }
    const rows = buildControlStation({ player, signals, bodyId: 'all' }).groups.flatMap(group => group.rows)
    expect(rows.map(item => item.equipmentId)).toEqual(['ground-telescopes', 'deep-space-telescope'])
    expect(rows[0]?.buildPrompt).toBe(true)
  })

  it('flags World Space Week badges on the instruments that serve them', () => {
    const oct8 = Date.UTC(2026, 9, 8, 12)
    const model = buildControlStation({
      player: { ...launched, badges: { 'saturn-night-2026': { eventId: 'saturn-night-2026', tier: 'gold', earnedAt: oct8 } } },
      signals,
      bodyId: 'all',
      now: oct8,
    })
    const rows = model.groups.flatMap(group => group.rows)
    expect(rows.find(item => item.equipmentId === 'saturn-imager')?.wsw.map(chip => chip.label)).toEqual(['Saturn Gold earned'])
    expect(rows.find(item => item.equipmentId === 'deep-space-telescope')?.wsw.map(chip => chip.label)).toEqual([])
    expect(rows.find(item => item.equipmentId === 'transit-telescope')?.wsw).toEqual([])
    expect(model.skyBadges.map(chip => chip.category)).toEqual(['Launch', 'Saturn', 'Meteor'])
  })

  it('lists every World Space Week badge once the New Moon night opens', () => {
    const model = buildControlStation({ player: launched, signals, bodyId: 'all', now: Date.UTC(2026, 9, 10, 12) })
    expect(model.skyBadges.map(chip => chip.label)).toEqual([
      'Launch Gold open',
      'Saturn Gold open',
      'Meteor Gold open',
      'New Moon Gold open',
    ])
  })

  it('filters the list by body and leaves the map on the full station', () => {
    const model = buildControlStation({ player: launched, signals, bodyId: 'saturn' })
    expect(model.groups.map(group => group.label)).toEqual(['Saturn'])
    expect(model.markers.map(marker => marker.equipmentId)).toEqual([
      'ground-telescopes',
      'transit-telescope',
      'deep-space-telescope',
      'saturn-imager',
    ])
    expect(model.markers.find(marker => marker.equipmentId === 'saturn-imager')?.readyCount).toBe(1)
    expect(model.activeBodyId).toBe('saturn')
  })

  it('numbers only equipment that has something ready', () => {
    const quiet = buildControlStation({
      player: { ...launched, saturnImagerLaunchedAt: 1 },
      signals: [],
      bodyId: 'all',
    })
    expect(quiet.markers.every(marker => marker.readyCount === 0)).toBe(true)
    expect(quiet.groups.flatMap(group => group.rows).every(item => item.openSignal === null)).toBe(true)
    expect(quiet.groups.find(group => group.locationId === 'saturn')?.rows[0]?.status).toBe('Observing')
  })

  it('holds Open while the first feed response is still out', () => {
    const model = buildControlStation({ player: launched, signals, bodyId: 'all', loading: true })
    expect(model.groups.flatMap(group => group.rows).every(item => item.openSignal === null && item.status === 'Acquiring')).toBe(true)
  })

  it('lets one piece feed several projects and several pieces share a project', () => {
    const catalog: ControlStationCatalog = {
      bodies: [{ id: 'mars', name: 'Mars', x: 320, y: 160, r: 24, kind: 'planet' }],
      locations: [{ id: 'mars-orbit', bodyId: 'mars', zone: 'Orbit', groupLabel: 'Mars · Orbit' }],
      projects: [
        { id: 'rocks', label: 'Asteroid discovery', signalKind: 'deep-space' },
        { id: 'dips', label: 'Exoplanet Hunters', signalKind: 'transit' },
      ],
      equipment: [
        {
          id: 'surveyor',
          name: 'Surveyor',
          locationId: 'mars-orbit',
          projectIds: ['rocks'],
          presence: 'standing',
          feedFlag: 'always',
          observingLabel: 'Observing',
          readyLabel: 'Observing',
          standbyLabel: 'Standing by',
          map: { x: 300, y: 140 },
        },
        {
          id: 'dual',
          name: 'Dual feed',
          locationId: 'mars-orbit',
          projectIds: ['rocks', 'dips'],
          presence: 'standing',
          feedFlag: 'always',
          observingLabel: 'Observing',
          readyLabel: 'Observing',
          standbyLabel: 'Standing by',
          map: { x: 340, y: 180 },
        },
      ],
    }
    const model = buildControlStation({
      player: { freeOperations: true },
      signals,
      bodyId: 'all',
      catalog,
    })
    const rows = model.groups[0]?.rows ?? []
    expect(rows.find(item => item.equipmentId === 'surveyor')?.readyCount).toBe(2)
    expect(rows.find(item => item.equipmentId === 'dual')).toMatchObject({
      readyCount: 3,
      projects: [{ id: 'rocks' }, { id: 'dips' }],
    })
    expect(rows.find(item => item.equipmentId === 'dual')?.openSignal?.id).toBe('neo-1')
  })
})
