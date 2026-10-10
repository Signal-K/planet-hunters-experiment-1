import { describe, expect, it } from 'vitest'
import { scanText } from '../scripts/verify-hue-palette.mjs'

describe('hue palette check (SSL-425)', () => {
  it('goes red on an orange hex in web or Swift sources', () => {
    expect(scanText('color: #f5a623')).toHaveLength(1)
    expect(scanText('flame.fillColor = Theme.hex(0xFFB347).sk')).toHaveLength(1)
    expect(scanText('Color(red: 0.96, green: 0.65, blue: 0.14)')).toHaveLength(1)
  })

  it('stays green on cyan, teal and ice', () => {
    expect(scanText('color: #42a6df; fill: 0x36c6e2')).toHaveLength(0)
    expect(scanText('Color(red: 0.1, green: 0.5, blue: 0.7)')).toHaveLength(0)
  })
})
