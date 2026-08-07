import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AcademyCoach from './AcademyCoach'

describe('AcademyCoach', () => {
  it('renders the first step with progress dots and a Next control', () => {
    const markup = renderToStaticMarkup(<AcademyCoach onDismiss={() => undefined} />)
    expect(markup).toContain('data-testid="academy-coach"')
    expect(markup).toContain('FUNDING KEEPS IT RUNNING')
    expect(markup).toContain('Mission Coach · 1/4')
    expect(markup).toContain('data-testid="academy-coach-next"')
    expect(markup).toContain('data-testid="academy-coach-skip"')
    expect(markup).toContain('Next')
  })
})
