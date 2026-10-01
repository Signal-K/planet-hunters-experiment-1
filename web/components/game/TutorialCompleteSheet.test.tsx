// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { agencyTrainingTrack, freeOpsActivities, type FreeOpsActivity } from '@/lib/systems/AgencyOnboardingSystem'
import { TutorialCompleteSheet } from './TutorialCompleteSheet'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FREE_OPS_PLAYER = { placed: ['launchpad'], missionsDone: 2, flightPlan: { completed: { mining: true as const, scan: true as const, part: true as const }, hidden: false } }

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
    for (const stage of ['mining', 'scan', 'part']) expect(status(stage)).toBe('done')
    expect(status('free-ops')).toBe('current')
  })

  it('offers Free Ops work and reports the choice', () => {
    const chosen: FreeOpsActivity[] = []
    act(() => root.render(
      <TutorialCompleteSheet track={agencyTrainingTrack(FREE_OPS_PLAYER)} activities={freeOpsActivities({})} onChoose={activity => chosen.push(activity)} onClose={() => {}} />,
    ))
    const buttons = Array.from(document.querySelectorAll('[data-testid^="free-ops-activity-"]'))
    expect(buttons.map(button => button.getAttribute('data-testid'))).toEqual([
      'free-ops-activity-client-work',
      'free-ops-activity-space-telescope',
      'free-ops-activity-build-refinery',
      'free-ops-activity-transport',
      'free-ops-activity-storage-silo',
    ])
    act(() => { (buttons[1] as HTMLButtonElement).click() })
    expect(chosen.map(activity => activity.id)).toEqual(['space-telescope'])
  })

  it('in review mode explains each training stage instead of a status', () => {
    act(() => root.render(
      <TutorialCompleteSheet track={agencyTrainingTrack(FREE_OPS_PLAYER)} activities={freeOpsActivities({})} mode="review" onChoose={() => {}} onClose={() => {}} />,
    ))
    expect(document.querySelector('[data-testid="agency-track-scan"]')?.textContent).toContain('Classify a real transit')
    expect(document.body.textContent).toContain('How your agency works')
  })
})
