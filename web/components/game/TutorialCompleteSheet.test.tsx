// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { agencyTrainingTrack, freeOpsActivities, type FreeOpsActivity } from '@/lib/systems/AgencyOnboardingSystem'
import { TutorialCompleteSheet } from './TutorialCompleteSheet'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FREE_OPS_PLAYER = { placed: ['launchpad', 'surface-silo'], missionsDone: 2 }

describe('TutorialCompleteSheet — Free Ops handoff (SSL-332)', () => {
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

  const status = (stage: string) => document.querySelector(`[data-testid="agency-track-${stage}"]`)?.getAttribute('data-status')

  it('shows every training stage done and Free Ops as now', () => {
    act(() => root.render(
      <TutorialCompleteSheet track={agencyTrainingTrack(FREE_OPS_PLAYER)} activities={freeOpsActivities({})} onChoose={() => {}} onClose={() => {}} />,
    ))
    for (const stage of ['launchpad', 'extraction', 'transport', 'storage']) expect(status(stage)).toBe('done')
    expect(status('free-ops')).toBe('current')
  })

  it('offers exactly client work, space telescope and build refinery, and reports the choice', () => {
    const chosen: FreeOpsActivity[] = []
    act(() => root.render(
      <TutorialCompleteSheet track={agencyTrainingTrack(FREE_OPS_PLAYER)} activities={freeOpsActivities({})} onChoose={activity => chosen.push(activity)} onClose={() => {}} />,
    ))
    const buttons = Array.from(document.querySelectorAll('[data-testid^="free-ops-activity-"]'))
    expect(buttons.map(button => button.getAttribute('data-testid'))).toEqual([
      'free-ops-activity-client-work',
      'free-ops-activity-space-telescope',
      'free-ops-activity-build-refinery',
    ])
    act(() => { (buttons[1] as HTMLButtonElement).click() })
    expect(chosen.map(activity => activity.id)).toEqual(['space-telescope'])
  })

  it('in review mode explains each training stage instead of a status', () => {
    act(() => root.render(
      <TutorialCompleteSheet track={agencyTrainingTrack(FREE_OPS_PLAYER)} activities={freeOpsActivities({})} mode="review" onChoose={() => {}} onClose={() => {}} />,
    ))
    expect(document.querySelector('[data-testid="agency-track-transport"]')?.textContent).toContain('deliver to another')
    expect(document.body.textContent).toContain('How your agency works')
  })
})
