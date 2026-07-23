import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import StepFooter, { MISSION_FLOW_STEPS } from './StepFooter'

describe('StepFooter', () => {
  it.each(MISSION_FLOW_STEPS)('renders mission progress for %s', step => {
    const markup = renderToStaticMarkup(
      <StepFooter step={step} description={`${step} guidance`} />,
    )
    const position = MISSION_FLOW_STEPS.indexOf(step) + 1

    expect(markup).toContain(`data-step="${step.toLowerCase()}"`)
    expect(markup).toContain(`Mission flow: ${step}, step ${position} of 4`)
    expect(markup).toContain(`Step ${position} of 4 · ${step}`)
    expect(markup).toContain(`${step} guidance`)
  })

  it('supports inline placement inside an existing action bar', () => {
    const markup = renderToStaticMarkup(
      <StepFooter step="Relay" description="Proceed to target." inline />,
    )

    expect(markup).not.toContain('position:absolute')
    expect(markup).toContain('border-radius:8px')
  })
})
