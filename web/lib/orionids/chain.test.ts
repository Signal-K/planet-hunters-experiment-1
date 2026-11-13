import { describe, expect, it } from 'vitest'
import { applyDebrisMined, ORIONIDS_DEBRIS_PRESET } from '@/lib/data/sky-events'
import { normalizeState } from '@/lib/game-state'
import type { Player } from '@/lib/game-types'
import type { RadioMeteorClassification } from '@/lib/radio-meteors'
import { explorerSteps } from '@/lib/research/paths'
import { completeRadioMission, ORIONIDS_CHAIN, orionidsResearchStep, showerItems } from './chain'
import { chainRecordings, chainResearchStep, chainStage, completeChainRadio, completeChainRun, LEONIDS_CHAIN, liveShowerChain, mergeShowerChains, receiverEventId } from './chain'

const IN_EVENT = Date.parse('2026-10-29T12:00:00Z')
const AFTER_EVENT = Date.parse('2026-11-20T12:00:00Z')

const noBadges: Player['badges'] = {}
const checked = (n: number): Record<string, RadioMeteorClassification> => Object.fromEntries(
  Array.from({ length: n }, (_, i) => [`s${i}`, { subjectId: `s${i}`, workflowId: '33017', imageUrl: '', filename: '', imageWidth: 949, imageHeight: 543, boxes: [], submittedAt: IN_EVENT }]),
)

describe('Orionids chain (SSL-714)', () => {
  it('never grants the Orionids badge for mining debris alone', () => {
    const { player, badge } = applyDebrisMined({ badges: noBadges } as Pick<Player, 'badges'>, ORIONIDS_DEBRIS_PRESET, IN_EVENT)
    expect(badge).toBeNull()
    expect(player.badges?.['orionids-2026']).toBeUndefined()
  })

  it('hands over one story item per finished mission', () => {
    expect(showerItems(ORIONIDS_CHAIN, 0)).toEqual([])
    expect(showerItems(ORIONIDS_CHAIN, 1).map(item => item.id)).toEqual(['fragment-sample'])
    expect(showerItems(ORIONIDS_CHAIN, 2).map(item => item.id)).toEqual(['fragment-sample'])
    expect(showerItems(ORIONIDS_CHAIN, 3).map(item => item.id)).toEqual(['fragment-sample'])
  })

  it('completes mission 3 on the third recording and grades the badge then', () => {
    const two = completeRadioMission({ orionidsEventStage: 2, radioMeteorClassifications: checked(2), badges: noBadges }, IN_EVENT)
    expect(two.completed).toBe(false)
    const three = completeRadioMission({ orionidsEventStage: 2, radioMeteorClassifications: checked(3), badges: noBadges }, IN_EVENT)
    expect(three.completed).toBe(true)
    expect(three.player.orionidsEventStage).toBe(3)
    expect(three.player.badges?.['orionids-2026']?.tier).toBe('gold')
    expect(completeRadioMission({ orionidsEventStage: 2, radioMeteorClassifications: checked(3), badges: noBadges }, AFTER_EVENT).player.badges?.['orionids-2026']?.tier).toBe('silver')
  })

  it('does not finish the chain before the shower run, or twice', () => {
    expect(completeRadioMission({ orionidsEventStage: 1, radioMeteorClassifications: checked(5), badges: noBadges }, IN_EVENT).completed).toBe(false)
    expect(completeRadioMission({ orionidsEventStage: 3, radioMeteorClassifications: checked(5), badges: noBadges }, IN_EVENT).completed).toBe(false)
  })

  it('reads a finished shower run as the record complete (stage 3), and never lowers a finished chain', () => {
    const run = { id: 'self-directed-orionids-night-run', title: 'Orionids shower run', completedAt: IN_EVENT, runId: 'r1', kind: 'program' as const }
    const after = normalizeState({ player: { completedMissions: [run], orionidsEventStage: 1 } as Partial<Player> } as never)
    expect(after.player.orionidsEventStage).toBe(3)
    const finished = normalizeState({ player: { completedMissions: [run], orionidsEventStage: 3 } as Partial<Player> } as never)
    expect(finished.player.orionidsEventStage).toBe(3)
  })

  it('words the Community research event step for the next mission in the chain', () => {
    const step = (stage: number) => explorerSteps({ hasDiscovery: false, eventName: 'Orionids', eventStep: orionidsResearchStep(stage) }).find(s => s.id === 'event')!
    expect(step(0).title).toBe('Orionids: catch and contribute fragments')
    expect(step(3).title).toBe('Orionids: fragments delivered')
    expect(step(3).kind).toBe('event')
  })
})

describe('Leonids chain (SSL-831)', () => {
  const run = Date.parse('2026-11-17T10:00:00Z')
  type ChainP = Pick<Player, 'badges' | 'showerChains' | 'radioMeteorClassifications'>
  const fresh = (): ChainP => ({ badges: {} })
  const rec = (id: string, submittedAt: number) => ({ [id]: { subjectId: id, workflowId: '33017', imageUrl: '', filename: '', imageWidth: 1, imageHeight: 1, boxes: [], submittedAt } })

  it('the run finishes mission 1 without a badge, and opens LEO-1', () => {
    const p = completeChainRun(fresh(), LEONIDS_CHAIN, run)
    expect(chainStage(p, LEONIDS_CHAIN.eventId)).toBe(1)
    expect(p.badges?.['leonids-2026']).toBeUndefined()
    expect(receiverEventId(p)).toBe('leonids-2026')
    expect(chainResearchStep(p, LEONIDS_CHAIN).title).toContain('LEO')
  })

  it('counts only recordings checked after the run, then grades the badge on the third', () => {
    let p: ChainP = completeChainRun(fresh(), LEONIDS_CHAIN, run)
    p = { ...p, radioMeteorClassifications: { ...rec('ori-a', Date.parse('2026-10-29T00:00:00Z')), ...rec('a', run + 1), ...rec('b', run + 2) } }
    expect(chainRecordings(p, LEONIDS_CHAIN)).toBe(2)
    expect(completeChainRadio(p, LEONIDS_CHAIN, run + 3).completed).toBe(false)
    p = { ...p, radioMeteorClassifications: { ...p.radioMeteorClassifications, ...rec('c', run + 3) } }
    const done = completeChainRadio(p, LEONIDS_CHAIN, run + 3)
    expect(done.completed).toBe(true)
    expect(chainStage(done.player, LEONIDS_CHAIN.eventId)).toBe(2)
    expect(done.player.badges?.['leonids-2026']?.tier).toBe('gold')
  })

  it('grades silver after the window closes', () => {
    const late = Date.parse('2026-12-02T00:00:00Z')
    const p = { ...completeChainRun(fresh(), LEONIDS_CHAIN, late), radioMeteorClassifications: { ...rec('a', late), ...rec('b', late), ...rec('c', late) } }
    expect(completeChainRadio(p, LEONIDS_CHAIN, late).player.badges?.['leonids-2026']?.tier).toBe('silver')
  })

  it('is live on its real dates and merges saves upwards', () => {
    expect(liveShowerChain(Date.parse('2026-11-11T12:00:00Z'))?.eventId).toBe('leonids-2026')
    expect(liveShowerChain(Date.parse('2026-12-01T00:00:00Z'))).toBeUndefined()
    expect(mergeShowerChains({ 'leonids-2026': { stage: 1, at: 5 } }, { 'leonids-2026': { stage: 2, at: 9 } })).toEqual({ 'leonids-2026': { stage: 2, at: 9 } })
  })
})
