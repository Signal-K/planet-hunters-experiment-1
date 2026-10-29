import { describe, expect, it } from 'vitest'
import { applyDebrisMined, ORIONIDS_DEBRIS_PRESET } from '@/lib/data/sky-events'
import { normalizeState } from '@/lib/game-state'
import type { Player } from '@/lib/game-types'
import type { RadioMeteorClassification } from '@/lib/radio-meteors'
import { completeRadioMission, ORIONIDS_CHAIN, showerItems } from './chain'

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
    expect(showerItems(ORIONIDS_CHAIN, 2).map(item => item.id)).toEqual(['fragment-sample', 'impact-bearing'])
    expect(showerItems(ORIONIDS_CHAIN, 3).map(item => item.id)).toEqual(['fragment-sample', 'impact-bearing', 'radio-confirmation'])
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

  it('does not finish the chain before the rover mission, or twice', () => {
    expect(completeRadioMission({ orionidsEventStage: 1, radioMeteorClassifications: checked(5), badges: noBadges }, IN_EVENT).completed).toBe(false)
    expect(completeRadioMission({ orionidsEventStage: 3, radioMeteorClassifications: checked(5), badges: noBadges }, IN_EVENT).completed).toBe(false)
  })

  it('moves existing saves straight to their next step, and never lowers a finished chain', () => {
    const rover = { id: 'self-directed-orionids-surface-research', title: 'Orionids surface observation', completedAt: IN_EVENT, runId: 'r1', kind: 'program' as const }
    const afterRover = normalizeState({ player: { completedMissions: [rover], orionidsEventStage: 1 } as Partial<Player> } as never)
    expect(afterRover.player.orionidsEventStage).toBe(2)
    const finished = normalizeState({ player: { completedMissions: [rover], orionidsEventStage: 3 } as Partial<Player> } as never)
    expect(finished.player.orionidsEventStage).toBe(3)
  })
})
