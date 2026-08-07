import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SkillTreeCoach from './SkillTreeCoach'

describe('SkillTreeCoach', () => {
  it('renders the first step with progress dots and a Next control', () => {
    const markup = renderToStaticMarkup(<SkillTreeCoach onDismiss={() => undefined} />)
    expect(markup).toContain('data-testid="skill-tree-coach"')
    expect(markup).toContain('SKILL POINTS ARE EARNED, NOT BOUGHT')
    expect(markup).toContain('Mission Coach · 1/3')
    expect(markup).toContain('data-testid="skill-tree-coach-next"')
    expect(markup).toContain('data-testid="skill-tree-coach-skip"')
    expect(markup).toContain('Next')
  })
})
