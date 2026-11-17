import { describe, expect, it } from 'vitest'
import { agencyProgramme, agencySummary, isAgencyLaunch, projectContributions, type ProgrammePlayer } from './programme'
import { agencySteps, claimResearchReward, weeklyRewardKey, type ResearchPathChoice } from '@/lib/research/paths'

const empty: ProgrammePlayer = { freeOperations: true, placed: [] }

describe('agency programme', () => {
  it('lists every craft and offers the first one a new agency lacks', () => {
    const summary = agencySummary(empty)
    expect(agencyProgramme(empty).map(craft => craft.id)).toEqual(['ground-telescope', 'space-telescope', 'saturn-satellite', 'survey-probe'])
    expect(summary.owned).toEqual([])
    expect(summary.next?.id).toBe('ground-telescope')
    expect(summary.hasClassifyData).toBe(false)
  })

  it('counts data a day only from craft that are working', () => {
    const player: ProgrammePlayer = {
      ...empty, placed: ['ground-telescope', 'ground-telescope-2'], placementPlots: { 'ground-telescope': 10 },
      transitSatelliteLaunchedAt: 1, transitSatelliteLevel: 2, deepSpaceTelescopeBuilt: true, saturnImagerLaunchedAt: 1,
      probes: { ceres: { launchedAt: 1, readings: { '0_0': { at: 2, marked: [], deposits: [] } } } },
    }
    const byId = Object.fromEntries(agencyProgramme(player).map(craft => [craft.id, craft]))
    // Two telescopes owned, one placed: only the placed one observes.
    expect(byId['ground-telescope'].owned).toBe(2)
    expect(byId['ground-telescope'].dataPerDay).toBe(1)
    expect(byId['ground-telescope'].canAdd).toBe(false)
    expect(byId['space-telescope'].dataPerDay).toBe(3)
    expect(byId['survey-probe'].dataPerDay).toBe(12)
    expect(agencySummary(player).next?.id).toBe('survey-probe')
  })

  it('reads contributions from the records the classify screens keep', () => {
    const player: ProgrammePlayer = { ...empty, tessClassifications: { a: {} as never, b: {} as never }, saturnClassifications: { c: {} as never } }
    expect(projectContributions(player)).toMatchObject({ 'exoplanet-hunters': 2, 'saturn-storms': 1, 'asteroid-discovery': 0 })
    expect(agencySummary(player).contributed).toBe(3)
  })

  it('treats a satellite payload as an agency launch', () => {
    expect(isAgencyLaunch({ payload: { type: 'satellite', name: 'Survey probe', cargoCost: 0 } })).toBe(true)
    expect(isAgencyLaunch({ payload: { type: 'rover', name: 'Rover', cargoCost: 1 } })).toBe(false)
    expect(isAgencyLaunch({})).toBe(false)
  })
})

describe('agency path', () => {
  const next = { name: 'Saturn satellite', how: 'launch' as const, project: 'Saturn storms', opensProject: true, adds: '+1 Cassini frame a day' }

  it('leads with the next launch and pays the same rewards as the other paths', () => {
    const steps = agencySteps({ eventName: null, nextLaunch: next, hasData: true, ownedNames: ['Space telescope'] })
    expect(steps.map(step => step.id)).toEqual(['launch', 'fleet-classify', 'fleet-watch', 'review', 'breakthrough'])
    expect(steps[0].title).toBe('Launch a saturn satellite')
    expect(steps[0].kind).toBe('launch')
    expect(weeklyRewardKey(steps[0])).toBe('step-2')
    expect(weeklyRewardKey(steps[2])).toBe('step-4')
    const paid = claimResearchReward({ researchPath: { week: '2026-11-16', path: 'agency' } as ResearchPathChoice, researchFragments: 0 }, steps[0], { have: 1, need: 1 }, 0)
    expect(paid.researchFragments).toBe(5)
    expect(paid.researchPath?.claimedSteps).toEqual([2])
  })

  it('falls back to a scan when the fleet is complete, and keeps the launch step once a craft went up', () => {
    expect(agencySteps({ eventName: null, nextLaunch: null, hasData: true, ownedNames: [] })[0].id).toBe('scan')
    expect(agencySteps({ eventName: null, nextLaunch: next, hasData: true, ownedNames: [], launchedThisWeek: true })[0].title).toBe('Add a craft to your fleet')
  })
})
