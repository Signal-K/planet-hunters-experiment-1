import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ScanStationCoach from './ScanStationCoach'

describe('ScanStationCoach', () => {
  it('renders the first step with progress dots and a Next control', () => {
    const markup = renderToStaticMarkup(<ScanStationCoach onDismiss={() => undefined} />)
    expect(markup).toContain('data-testid="scan-station-coach"')
    expect(markup).toContain('SCOUT BEFORE YOU LAND')
    expect(markup).toContain('Mission Coach · 1/3')
    expect(markup).toContain('data-testid="scan-station-coach-next"')
    expect(markup).toContain('data-testid="scan-station-coach-skip"')
    expect(markup).toContain('Next')
  })
})
