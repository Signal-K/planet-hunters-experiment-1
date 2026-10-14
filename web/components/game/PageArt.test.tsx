import { render, screen } from '@testing-library/react'
import PageArt, { artForAmbient } from './PageArt'
import { meterFraction } from '@/components/ui/Omega'

describe('internal page art', () => {
  it('uses a distinct building scene for each ambient family', () => {
    expect(artForAmbient('survey')).toBe('control')
    expect(artForAmbient('industrial')).toBe('refinery')
    render(<PageArt scene="exchange" />)
    expect(screen.getByTestId('page-art-exchange')).toBeInTheDocument()
  })

  it('clamps information meters to a readable range', () => {
    expect(meterFraction(3, 2)).toBe(1)
    expect(meterFraction(-1, 2)).toBe(0)
    expect(meterFraction(1, 0)).toBe(0)
  })
})
