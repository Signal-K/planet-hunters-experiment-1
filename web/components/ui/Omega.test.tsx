import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MeterRow, OmegaPanel, Stat, StatStrip, meterFraction } from './Omega'
import PageArt, { PAGE_ART_SCENES } from '@/components/game/PageArt'

describe('Omega kit', () => {
  it('clamps meter fractions and treats an empty max as empty', () => {
    expect(meterFraction(5, 10)).toBe(0.5)
    expect(meterFraction(15, 10)).toBe(1)
    expect(meterFraction(-3, 10)).toBe(0)
    expect(meterFraction(3, 0)).toBe(0)
    expect(meterFraction(Number.NaN, 10)).toBe(0)
  })

  it('renders a titled panel with its tab and meta', () => {
    const markup = renderToStaticMarkup(<OmegaPanel title="Reward" meta="3 open" testId="p">body</OmegaPanel>)
    expect(markup).toContain('Reward')
    expect(markup).toContain('3 open')
    expect(markup).toContain('data-testid="p"')
  })

  it('renders stat tiles and a labelled progress meter', () => {
    const markup = renderToStaticMarkup(
      <StatStrip label="Status">
        <Stat label="Online" value="2 / 4" sub="Feeds live" />
        <MeterRow label="Installed" value={2} max={4} />
      </StatStrip>,
    )
    expect(markup).toContain('2 / 4')
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="2"')
    expect(markup).toContain('width:50%')
  })
})

describe('PageArt', () => {
  it.each(PAGE_ART_SCENES)('draws the %s scene as decorative, hardcoded-colour-free art', scene => {
    const markup = renderToStaticMarkup(<PageArt scene={scene} />)
    expect(markup).toContain(`data-page-art="${scene}"`)
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/)
  })
})
