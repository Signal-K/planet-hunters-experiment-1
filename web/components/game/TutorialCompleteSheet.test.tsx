// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import { agencyTrainingTrack } from '@/lib/systems/AgencyOnboardingSystem'
import { TutorialCompleteSheet } from './TutorialCompleteSheet'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('TutorialCompleteSheet agency track (SSL-332)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('shows extraction and transport done and the storage silo as next at handoff', () => {
    const track = agencyTrainingTrack({ placed: ['launchpad'], missionsDone: FREE_OPS_START_MISSIONS_DONE })
    act(() => root.render(<TutorialCompleteSheet track={track} onDone={() => {}} onBuildSilo={() => {}} />))

    const status = (stage: string) => document.querySelector(`[data-testid="agency-track-${stage}"]`)?.getAttribute('data-status')
    expect(status('launchpad')).toBe('done')
    expect(status('extraction')).toBe('done')
    expect(status('transport')).toBe('done')
    expect(status('storage')).toBe('current')
    expect(status('free-ops')).toBe('upcoming')
  })
})
