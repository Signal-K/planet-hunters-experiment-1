import { describe, expect, it } from 'vitest'
import { contractGroup, contractGroupCounts } from '@/lib/contract-groups'

describe('contract groups (SSL-699)', () => {
  it('sorts build, rover, survey and science jobs out of mining', () => {
    expect(contractGroup({ construction: { structureId: 'silo' } } as never)).toBe('construction')
    expect(contractGroup({ payload: { type: 'rover', name: 'Rover' } } as never)).toBe('exploration')
    expect(contractGroup({ survey: { scanRequired: true } } as never)).toBe('exploration')
    expect(contractGroup({ tag: 'SCIENCE' } as never)).toBe('exploration')
    expect(contractGroup({} as never)).toBe('mining')
  })

  it('counts each group and leaves empty ones out', () => {
    expect(contractGroupCounts([{}, {}, { tag: 'SCIENCE' }] as never)).toEqual([
      { group: 'mining', count: 2 },
      { group: 'exploration', count: 1 },
    ])
  })
})
