import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProgressBar from './ProgressBar'
import StatRow from './StatRow'

describe('ProgressBar', () => {
  it('renders the fill as a percentage of max', () => {
    expect(renderToStaticMarkup(<ProgressBar value={3} max={12} />)).toContain('width:25%')
  })

  it('clamps out-of-range values instead of overflowing the track', () => {
    expect(renderToStaticMarkup(<ProgressBar value={99} max={12} />)).toContain('width:100%')
    expect(renderToStaticMarkup(<ProgressBar value={-4} max={12} />)).toContain('width:0%')
  })

  it('survives a zero max rather than rendering NaN', () => {
    const markup = renderToStaticMarkup(<ProgressBar value={5} max={0} />)
    expect(markup).toContain('width:0%')
    expect(markup).not.toContain('NaN')
  })

  it('exposes progress to assistive tech', () => {
    const markup = renderToStaticMarkup(<ProgressBar value={1} max={4} label="Cargo" />)
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="25"')
    expect(markup).toContain('aria-label="Cargo"')
  })

  it('drops the glow when flat', () => {
    expect(renderToStaticMarkup(<ProgressBar value={1} max={2} flat />)).toContain('box-shadow:none')
  })
})

describe('StatRow', () => {
  it('renders label and value', () => {
    const markup = renderToStaticMarkup(<StatRow label="Affinity bonus" value="▲ 1,450" testId="pay-row" />)
    expect(markup).toContain('Affinity bonus')
    expect(markup).toContain('▲ 1,450')
    expect(markup).toContain('data-testid="pay-row"')
  })

  it('can drop its divider for a first/standalone row', () => {
    expect(renderToStaticMarkup(<StatRow label="a" value="b" divider={false} />)).not.toContain('border-top')
  })
})
