import { describe, expect, it } from 'vitest'
import { latestRadioReceipt, type RadioMeteorClassification } from './radio-meteors'
import { DEFAULT_STATE, normalizeAndRepair } from './game-state'

const record = (subjectId: string, submittedAt: number, eventId?: string): RadioMeteorClassification => ({ subjectId, submittedAt, eventId, workflowId: '33017', imageUrl: '', filename: '', imageWidth: 949, imageHeight: 543, boxes: [] })
describe('radio contribution restoration', () => {
  it('restores the latest result for this event without relabeling legacy or another receiver', () => {
    const old = record('legacy', 50), ori = record('ori', 100, 'orionids-2026'), leo = record('leo', 10, 'leonids-2026')
    expect(latestRadioReceipt({ old, ori, leo }, 'leonids-2026')).toBe(leo)
    expect(latestRadioReceipt({ old, ori }, 'leonids-2026')).toBeNull()
  })
  it('survives save/reload and repeated receipt reads without changing fragment history', () => {
    const receipt = record('leo', Date.now(), 'leonids-2026')
    const state = normalizeAndRepair(JSON.parse(JSON.stringify({ ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, researchFragments: 17, showerFragments: { 'leonids-2026': { caught: 20, redeemed: 3 } }, radioMeteorClassifications: { leo: receipt } } })))
    const before = structuredClone(state.player)
    expect(latestRadioReceipt(state.player.radioMeteorClassifications ?? {}, 'leonids-2026')).toEqual(receipt)
    expect(latestRadioReceipt(state.player.radioMeteorClassifications ?? {}, 'leonids-2026')).toEqual(receipt)
    expect(state.player).toEqual(before)
    expect(state.player.showerFragments?.['leonids-2026']).toEqual({ caught: 20, redeemed: 3 })
  })
})
