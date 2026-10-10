import { describe, expect, it } from 'vitest'
import { transitLogRecords } from './mission-log'

describe('transitLogRecords', () => {
  it('turns each real transit classification into a log entry with its verdict and time', () => {
    const records = transitLogRecords({
      tessClassifications: {
        'toi-1': { subjectId: 'toi-1', verdict: 'planet', ranges: [], submittedAt: 200 },
        'toi-2': { subjectId: 'toi-2', verdict: 'not_planet', ranges: [], submittedAt: 100 },
      },
    })
    expect(records).toEqual([
      { id: 'transit:toi-1', title: 'Transit classified', targetName: 'Planet candidate', completedAt: 200, runId: 'transit:toi-1', kind: 'transit' },
      { id: 'transit:toi-2', title: 'Transit classified', targetName: 'No planet signal', completedAt: 100, runId: 'transit:toi-2', kind: 'transit' },
    ])
  })

  it('leaves out Flight Plan training verdicts', () => {
    const records = transitLogRecords({
      tessClassifications: { 'training-tess-toi-7001': { subjectId: 'training-tess-toi-7001', verdict: 'planet', ranges: [], submittedAt: 1 } },
    })
    expect(records).toEqual([])
  })

  it('returns nothing before any transit work', () => {
    expect(transitLogRecords({})).toEqual([])
  })
})
