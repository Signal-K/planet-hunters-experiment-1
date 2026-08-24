import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TARGETS } from '@/lib/data'
import LandingScreen from './LandingScreen'

const NOOP = () => undefined

describe('time-based screens', () => {
  it('keep the landing markup deterministic during the server/client first render', () => {
    const now = vi.spyOn(Date, 'now')
    try {
      now.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000)

      const first = renderToStaticMarkup(
        <LandingScreen target={TARGETS[0]} mode="descend" startedAt={0} onBack={NOOP} onContinue={NOOP} />,
      )
      const second = renderToStaticMarkup(
        <LandingScreen target={TARGETS[0]} mode="descend" startedAt={0} onBack={NOOP} onContinue={NOOP} />,
      )

      expect(first).toBe(second)
    } finally {
      now.mockRestore()
    }
  })
})
