import { describe, expect, it } from 'vitest'
import { gardenCampLabel, getSuiteHops, SUITE_GARDEN_URL, withHopSource } from './suite-hops'

describe('suite hops', () => {
  it('always offers the garden hop with a source marker', () => {
    const [garden] = getSuiteHops(undefined)
    expect(garden.id).toBe('ssc.hop.garden')
    const url = new URL(garden.href)
    expect(`${url.origin}${url.pathname}`).toBe(SUITE_GARDEN_URL)
    expect(url.searchParams.get('from')).toBe('landnam')
    expect(url.searchParams.get('hop')).toBe('ssc.hop.garden')
  })

  it('hides Spectra until a valid https URL is configured', () => {
    expect(getSuiteHops(undefined)).toHaveLength(1)
    expect(getSuiteHops('not a url')).toHaveLength(1)
    expect(getSuiteHops('http://spectra.example')).toHaveLength(1)
    const hops = getSuiteHops('https://spectra.example/outpost')
    expect(hops.map(h => h.id)).toEqual(['ssc.hop.garden', 'ssc.hop.spectra'])
    expect(hops[1].href).toContain('from=landnam')
  })

  it('preserves existing query params', () => {
    expect(withHopSource('https://a.example/x?y=1', 'ssc.hop.spectra')).toContain('y=1')
  })

  it('shows the identity chip only when signed in', () => {
    expect(gardenCampLabel(true)).toBe('SAME ACCOUNT')
    expect(gardenCampLabel(false)).toBeNull()
  })
})
