import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CostSummaryRow from './CostSummaryRow'

describe('CostSummaryRow', () => {
  it('renders a themed financial label and value', () => {
    const markup = renderToStaticMarkup(<CostSummaryRow label="Vehicle Cost" value="120 ▲" color="var(--ln-amber)" last />)

    expect(markup).toContain('Vehicle Cost')
    expect(markup).toContain('120 ▲')
    expect(markup).toContain('color:var(--ln-amber)')
    expect(markup).not.toContain('border-bottom:1px solid')
  })
})
